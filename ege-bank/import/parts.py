"""Convert FIPI markup into data. Source HTML and JavaScript never reach the renderer."""

import hashlib
import re
from pathlib import Path

from bs4 import Comment, NavigableString

from source import Limited, image_url

HTML = set("p div span br hr strong b i em u s sub sup ul ol li table thead tbody tfoot tr th td caption blockquote center".split())
MATH = set("math mrow mi mn mo mtext mfrac msqrt mroot msup msub msubsup munder mover munderover mmultiscripts mprescripts none mstyle semantics mspace mfenced mtable mtr mtd menclose mphantom mpadded merror ms".split())
MATH_ATTRS = set("display displaystyle stretchy fence separator accent accentunder mathvariant linethickness notation width height depth lspace rspace open close separators rowalign columnalign columnspacing rowspacing columnspan rowspan scriptlevel".split())
SKIP = {"annotation", "annotation-xml", "style", "meta", "input"}
UNSUPPORTED = {"object", "iframe", "audio", "video", "svg", "canvas", "embed", "noscript"}
PICTURE = re.compile(r"(ShowPictureQ(?:BL|2WH|3WH|2|3|GX2)?)\(\s*(['\"])([^'\"]+)\2(.*)\)\s*;?", re.S)


def image_format(raw):
    for signature, extension in [(b"\x89PNG\r\n\x1a\n", ".png"), (b"\xff\xd8\xff", ".jpg"), (b"GIF8", ".gif")]:
        if raw.startswith(signature):
            return raw, extension
    if raw.startswith(b"RIFF") and raw[8:12] == b"WEBP":
        return raw, ".webp"
    raise ValueError("Ответ не содержит поддерживаемого изображения")


def export_parts(row, fetcher, assets):
    reasons = set()

    def picture(path, alt=""):
        try:
            url = image_url(path)
        except ValueError:
            reasons.add("Неизвестный путь изображения")
            return []
        try:
            content, extension = fetcher.get(url, image_format)
        except Limited:
            raise
        except (OSError, RuntimeError, ValueError):
            reasons.add("Недоступно вложение: " + url)
            return []
        asset = "ege-data/v1/assets/" + hashlib.sha256(content).hexdigest() + extension
        assets[asset] = content
        return [{"type": "image", "path": asset, "sourceUrl": url, "alt": alt if alt and alt != "undefined" else "Иллюстрация из условия"}]

    def children(node):
        return [part for child in node.children for part in convert(child)]

    def convert(node):
        if isinstance(node, Comment):
            return []
        if isinstance(node, NavigableString):
            value = re.sub(r"[\t\r\n ]+", " ", str(node))
            return [{"type": "text", "text": value}] if value else []
        name = node.name.removeprefix("m:")
        if name in SKIP:
            return []
        if name in UNSUPPORTED:
            reasons.add("Неподдерживаемый элемент: " + name)
            return []
        if name == "img":
            return picture(node.get("src", ""), node.get("alt", ""))
        if name == "script":
            match = PICTURE.fullmatch(node.get_text().strip())
            if not match:
                reasons.add("Неизвестный способ вставки материала в условие")
                return []
            variant, _, path, tail = match.groups()
            args = re.findall(r"""['"]([^'"]*)['"]""", tail)
            alt = args[0] if args and variant in {"ShowPictureQ", "ShowPictureQBL"} else ""
            if variant in {"ShowPictureQ2", "ShowPictureQ2WH", "ShowPictureQ3", "ShowPictureQ3WH"}:
                if args and not re.search(r"\.(?:png|gif|jpe?g|webp)$", path, re.I):
                    reasons.add("Неподдерживаемый интерактивный материал")
                    path = args[0]
                alt = args[1] if len(args) >= 2 and variant != "ShowPictureQ3WH" else ""
            return picture(path, alt)
        if node.name.startswith("m:") and name not in MATH:
            reasons.add("Неизвестный элемент формулы: " + name)
        if name in MATH:
            attrs = {key: value for key, value in node.attrs.items() if key in MATH_ATTRS and isinstance(value, str)}
            return [{"type": "math", "tag": name, "attrs": attrs, "children": children(node)}]
        if name in HTML:
            attrs = {
                key: value for key, value in node.attrs.items()
                if key in {"colspan", "rowspan", "start", "value"} and isinstance(value, str) and re.fullmatch(r"\d{1,3}", value)
            }
            if name == "table" and node.get("border", "0") != "0":
                attrs["grid"] = "1"
            return [{"type": "element", "tag": name, "attrs": attrs, "children": children(node)}]
        return children(node)

    prompt = row["prompt"]
    if not prompt or not (prompt.get_text(strip=True) or prompt.select_one("img, script")):
        reasons.add("Нет читаемого условия")
    parts = [{"type": "prompt", "children": children(prompt)}] if prompt else []
    if row["options"]:
        options = []
        for index, item in enumerate(row["options"], start=1):
            cells = item.find_all("td", recursive=False)
            control = cells[0].find("input") if cells else None
            if len(cells) < 2 or not control or control.get("value") != str(index):
                reasons.add("Вариант ответа отсутствует или нарушен порядок вариантов")
            options.append(children(cells[-1]) if len(cells) >= 2 else [])
        parts.append({"type": "options", "items": options})
    return parts, sorted(reasons)
