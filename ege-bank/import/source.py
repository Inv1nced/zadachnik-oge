"""Read the public FIPI physics bank without executing its HTML or scripts."""

import hashlib
import os
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlsplit

from bs4 import BeautifulSoup

ORIGIN = "https://ege.fipi.ru"
PROJECT = "BA1F39653304A5B041B656915DC36B38"
SUBJECT = f"{ORIGIN}/bank/index.php?proj={PROJECT}"
PAGE_SIZE = 50
TYPES = {
    "ILI_STD_SELECTONE": ("Выбор ответа", "single"),
    "ILI_STD_SELECTN": ("Выбор ответов из предложенных вариантов", "multiple"),
    "ILI_STD_SHORT": ("Краткий ответ", "short"),
    "ILI_STD_FULL": ("Развернутый ответ", "extended"),
    "ILI_EXT_ACCORD": ("Установление соответствия", "matching"),
}
TYPE_LABELS = {label: kind for label, kind in TYPES.values()}
CODE = re.compile(r"[0-9a-fA-F]{6}")
GUID = re.compile(r"[0-9a-fA-F]{32}")
FIGURE = re.compile(r"ShowPictureQ|showXGraphic|<img\b", re.I)
PAGER = re.compile(r"window\.parent\.setQCount\((\d+),\s*(\d+),\s*(\d+)\)")


def task_url(code):
    return SUBJECT + "&search=1&qid=" + code


def page_url(page, **filters):
    params = {"proj": PROJECT, "page": page, "pagesize": PAGE_SIZE}
    if filters:
        params.update(search=1, **filters)
    elif page == 0:
        params["init_filter_themes"] = 1
    return f"{ORIGIN}/bank/questions.php?{urlencode(params)}"


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        tmp.write_bytes(data)
        tmp.replace(path)
    finally:
        tmp.unlink(missing_ok=True)


class Limited(Exception):
    """Stop immediately at the source's access or rate limit."""


class Fetcher:
    def __init__(self, cache, offline=False):
        self.cache = Path(cache)
        self.offline = offline
        self.last_request = 0.0

    def get(self, url, validate):
        if urlsplit(url).netloc != urlsplit(ORIGIN).netloc or not url.startswith(ORIGIN + "/"):
            raise ValueError(f"Хост вне ФИПИ: {url}")
        path = self.cache / hashlib.sha256(url.encode()).hexdigest()
        if path.exists():
            return validate(path.read_bytes())
        if self.offline:
            raise FileNotFoundError(f"Нет снимка {url}")
        for delay in (0, 2, 5):
            time.sleep(max(delay, 0.8 - (time.monotonic() - self.last_request), 0))
            self.last_request = time.monotonic()
            result = subprocess.run(
                ["curl", "--silent", "--show-error", "--max-time", "25", "--compressed",
                 "--write-out", "%{http_code}", url],
                capture_output=True,
            )
            status = result.stdout[-3:]
            if status in {b"401", b"403", b"429"}:
                raise Limited(f"HTTP {status.decode()} · {url}")
            if result.returncode or status in {b"408", b"500", b"502", b"503", b"504"}:
                continue
            if status != b"200":
                raise ValueError(f"HTTP {status.decode(errors='replace')} · {url}")
            data = result.stdout[:-3]
            parsed = validate(data)
            atomic_write(path, data)
            return parsed
        raise RuntimeError(f"Источник временно недоступен: {url}")


def decode_html(raw):
    for charset in ("utf-8", "cp1251"):
        try:
            return raw.decode(charset)
        except UnicodeDecodeError:
            pass
    raise ValueError("Не удалось разобрать кодировку выдачи")


def parse_page(raw, page):
    html = decode_html(raw)
    pager = PAGER.search(html)
    if not pager or int(pager[2]) != page + 1 or int(pager[3]) != PAGE_SIZE:
        raise ValueError(f"Неверный счётчик или номер страницы {page + 1}")
    total = int(pager[1])
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for question in soup.select(".qblock"):
        info = question.find_next_sibling()
        code_el = info.select_one(".id-text .canselect") if info else None
        guid_el = question.select_one("input[name=guid]")
        code = code_el.get_text(strip=True) if code_el else ""
        guid = guid_el.get("value", "") if guid_el else ""
        if not CODE.fullmatch(code) or not GUID.fullmatch(guid):
            raise ValueError(f"Нет кода/идентификатора на странице {page + 1}")
        metadata = {
            row.select_one(".param-name").get_text(strip=True).rstrip(":"): row.find_all("td")[-1]
            for row in info.select(".task-info-content tr") if row.select_one(".param-name")
        }
        ces = metadata.get("КЭС")
        topics = {}
        if ces:
            for line in ces.find_all("div", recursive=False) or [ces]:
                code_match = re.match(r"(\d+(?:\.\d+)*)\s+(.+)", line.get_text(" ", strip=True))
                if code_match:
                    topics[code_match[1]] = code_match[2]
        answer = metadata.get("Тип ответа")
        prompt = question.select_one(".cell_0")
        options = question.select(".distractors-table .active-distractor")
        rows.append({
            "sourceCode": code, "guid": guid.upper(), "kes": sorted(topics), "kesLabels": topics,
            "answerType": TYPE_LABELS.get(answer.get_text(" ", strip=True), "unknown") if answer else "unknown",
            "hasFigure": any(FIGURE.search(str(part)) for part in [prompt, *options]),
            "prompt": prompt, "options": options,
        })
    expected = max(0, min(PAGE_SIZE, total - page * PAGE_SIZE))
    if len(rows) != expected:
        raise ValueError(f"Страница {page + 1}: ожидалось {expected} задач, получено {len(rows)}")
    return total, rows


def read_page(fetcher, page=0, **filters):
    return fetcher.get(page_url(page, **filters), lambda raw: parse_page(raw, page))


def image_url(path):
    url = urljoin(ORIGIN + "/", re.sub(r"\. +", ".", path))
    parsed = urlsplit(url)
    if parsed.netloc != "ege.fipi.ru" or not parsed.path.startswith(f"/docs/{PROJECT}/"):
        raise ValueError("Неизвестный путь изображения")
    return url
