"""Generate the versioned INVARIANT bank. See ege-data/v1/SCHEMA.md for use."""

import argparse
import collections
import hashlib
import json
import math
import os
import re
import sys
from pathlib import Path

from parts import export_parts
from source import PAGE_SIZE, SUBJECT, TYPES, Fetcher, atomic_write, read_page, task_url

PROJECT_DIR = Path(__file__).resolve().parents[2]
DATA_PREFIX = "ege-data/v1/"
HERE = Path(__file__).resolve().parent
SAMPLES = {
    "474F4B": {}, "4EAC46": {}, "F23045": {}, "F13F4D": {}, "4C2E4A": {},
    "E24F06": {"qkind": "ILI_STD_FULL"}, "FC2D8A": {"qkind": "ILI_STD_SELECTONE"},
    "0FDA4F": {"theme": "1"}, "17F546": {"theme": "1"},
}
SOURCE_ONLY = "Условие и материалы доступны в открытом банке ФИПИ."
REGISTRY = json.loads((HERE / "topics.json").read_text())
TOPICS = [{"slug": slug, "title": data[0], "parent": data[1]} for slug, data in REGISTRY.items()]
TOPIC_CODES = {data[2]: slug for slug, data in REGISTRY.items() if data[2]}
VALID_CODES = re.compile(r"[0-9A-Fa-f]{6}")


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n").encode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def stable_id(code):
    if not VALID_CODES.fullmatch(code):
        raise ValueError(f"Неизвестный формат номера: {code}")
    return "ege-fipi-" + code.upper()


def deduplicate(rows):
    by_code = {}
    guids = {}
    duplicates = 0
    for row in rows:
        ident = stable_id(row["sourceCode"])
        if row["guid"] in guids and guids[row["guid"]] != ident:
            raise ValueError(f"Один внутренний номер связан с разными номерами банка: {ident}")
        guids[row["guid"]] = ident
        if ident in by_code:
            previous = by_code[ident]
            if previous["guid"] != row["guid"]:
                raise ValueError(f"Неоднозначное совпадение официального номера: {ident}")
            previous["kes"] = sorted(set(previous["kes"] + row["kes"]))
            previous["kesLabels"].update(row.get("kesLabels", {}))
            duplicates += 1
        else:
            by_code[ident] = row
    return by_code, duplicates


def inventory(fetcher):
    total, first = read_page(fetcher)
    if total < 1:
        raise ValueError("Источник вернул пустой банк")
    rows = list(first)
    page_count = math.ceil(total / PAGE_SIZE)
    for page in range(1, page_count):
        count, page_rows = read_page(fetcher, page)
        if count != total:
            raise ValueError(f"Счётчик изменился на странице {page + 1}: {total} → {count}")
        rows.extend(page_rows)
        if (page + 1) % 10 == 0:
            print(f"Сверено страниц: {page + 1}/{page_count}", flush=True)
    by_code, duplicates = deduplicate(rows)
    if len(by_code) != total:
        raise ValueError(f"ФИПИ показывает {total}, получено уникальных номеров: {len(by_code)}")

    checks = {}
    for field, values in [("theme", "1234"), ("qkind", TYPES)]:
        for value in values:
            count, sample = read_page(fetcher, **{field: value})
            if field == "theme":
                selection = [row for row in rows if any(ces.split(".")[0] == value for ces in row["kes"])]
            else:
                selection = [row for row in rows if row["answerType"] == TYPES[value][1]]
            matched = len(selection)
            if matched != count:
                raise ValueError(f"Фильтр {value}: ФИПИ показывает {count}, найдено {matched}")
            if [stable_id(row["sourceCode"]) for row in selection[:PAGE_SIZE]] != [stable_id(row["sourceCode"]) for row in sample]:
                raise ValueError(f"Первая страница фильтра {value} расходится с общим списком")
            checks[value] = {"sourceCount": count, "inventoryCount": matched, "firstPageMatches": True}
    return by_code, {"sourceCount": total, "observedCodes": len(rows), "pageCount": page_count,
                     "pageSize": PAGE_SIZE, "duplicates": duplicates, "filters": checks}


def sample_rows(fetcher):
    rows = []
    for code, filters in SAMPLES.items():
        _, page = read_page(fetcher, **filters)
        rows.append(next(row for row in page if row["sourceCode"].upper() == code))
    return deduplicate(rows)[0], {"sample": True}


def topic_slugs(row):
    slugs = set()
    for kes in row["kes"]:
        match = next((slug for code, slug in sorted(TOPIC_CODES.items(), key=lambda pair: -len(pair[0]))
                      if kes == code or kes.startswith(code + ".")), None)
        if match:
            slugs.add(match)
        if kes.startswith("3.6."):
            item = int(kes.split(".")[2])
            if 1 <= item <= 9 or item == 12:
                slugs.add("geometric-optics")
            elif item in {10, 11}:
                slugs.add("wave-optics")
    if row["prompt"]:
        text = re.sub(r"\s+", " ", row["prompt"].get_text(" ", strip=True).lower())
        if "погрешност" in text and re.search(r"цен[аеуы] деления|уч[её]том погрешност|измерени[йя]", text):
            slugs.add("measurement")
        if re.search(r"для того, чтобы на опыте выяснить|установить экспериментально", text):
            slugs.add("experiment")
    return [slug for slug in REGISTRY if slug in slugs]


def digest(row):
    return sha(json_bytes({
        "guid": row["guid"], "kes": row["kes"], "answerType": row["answerType"],
        "prompt": str(row["prompt"]), "options": [str(option) for option in row["options"]],
    }))


def source_title(row, slugs):
    generic = next((REGISTRY[slug][0] for slug in slugs if REGISTRY[slug][1]), None)
    if len(slugs) > 2:
        return generic or "Задание по нескольким разделам"
    topics = [label for code, label in row["kesLabels"].items() if code.count(".") >= 2]
    if len(topics) == 1:
        title = re.split(r"[.!?]\s+", topics[0], maxsplit=1)[0].strip(" .")
        if len(title) > 84:
            title = title[:84].rsplit(" ", 1)[0].rstrip(",") + "…"
        if title:
            return title
    return generic or (REGISTRY[slugs[0]][0] if slugs else "Задание по физике")


def has_image(parts):
    return any(part["type"] == "image" or has_image(part.get("children", [])) or
               any(has_image(option) for option in part.get("items", [])) for part in parts)


def generate(by_code, mode, fetcher, previous):
    tasks, files, review = [], {}, []
    adaptations = json.loads((HERE / "adaptations.json").read_text()) if mode == "references" else {}
    old = {row["id"]: row for row in previous}
    unknown_adaptations = set(adaptations) - {key.rsplit("-", 1)[1] for key in by_code} - {r["sourceCode"].upper() for r in previous}
    if unknown_adaptations:
        raise ValueError(f"Карточки без найденного номера ФИПИ: {', '.join(sorted(unknown_adaptations))}")
    for index, (ident, row) in enumerate(sorted(by_code.items()), start=1):
        slugs = topic_slugs(row)
        checksum = digest(row)
        adapted = adaptations.get(row["sourceCode"].upper())
        if adapted and adapted["sourceDigest"] == checksum:
            slugs = list(dict.fromkeys(slugs + adapted.get("topicSlugs", [])))
            if set(slugs) - REGISTRY.keys():
                raise ValueError(f"Неизвестная тема карточки {ident}")
        card = {
            "id": ident, "sourceCode": row["sourceCode"], "sourceUrl": task_url(row["sourceCode"]),
            "topicSlugs": slugs, "answerType": row["answerType"], "keyStatus": "missing",
            "applicability": "legacy-format" if row["answerType"] == "single" else "unverified-year",
        }
        supported_topics = [slug for slug in slugs if REGISTRY[slug][1]]
        title = source_title(row, slugs)
        entry = card | {
            "title": title, "cardPath": None, "status": "reference", "reason": SOURCE_ONLY,
            "hasFigure": row["hasFigure"], "kes": row["kes"], "sourceDigest": checksum,
        }
        if len(supported_topics) != 1 or row["answerType"] == "unknown":
            review.append({"id": ident, "reason": "Уточнить тему по условию", "sourceUrl": card["sourceUrl"]})
        if adapted and adapted["sourceDigest"] == checksum:
            card.update({key: adapted[key] for key in ("parts", "key", "solution") if key in adapted})
            for asset in adapted.get("assets", []):
                if not re.fullmatch(r"[a-z0-9-]+\.svg", asset):
                    raise ValueError(f"Неверный путь авторской схемы: {asset}")
                files[DATA_PREFIX + "assets/" + asset] = (HERE / "figures" / asset).read_bytes()
            card["credit"] = "Учебная редакция INVARIANT по заданию открытого банка ФИПИ."
            card["keyStatus"] = "author-verified" if "key" in card else "missing"
            if "key" in card:
                card["key"]["credit"] = "INVARIANT, самостоятельный расчёт"
            entry.update(title=adapted["title"], status="ready", reason=None,
                         hasFigure=adapted.get("hasFigure", row["hasFigure"]))
        elif mode != "references":
            card["credit"] = "Условие и материалы из открытого банка ФИПИ."
            card["parts"], reasons = export_parts(row, fetcher, files)
            entry.update(status="partial" if reasons else "ready", reason=" · ".join(reasons) or None,
                         hasFigure=row["hasFigure"] if reasons else has_image(card["parts"]))
            if index % 100 == 0:
                print(f"Разобрано условий: {index}/{len(by_code)}", flush=True)
        elif adapted:
            entry["reason"] = "ФИПИ обновил задание. Учебная карточка требует повторной сверки."
            review.append({"id": ident, "reason": entry["reason"], "sourceUrl": card["sourceUrl"]})
        if entry["status"] != "reference":
            content = json_bytes(card)
            entry["cardPath"] = f"{DATA_PREFIX}cards/{ident}-{sha(content)[:16]}.json"
            files[entry["cardPath"]] = content
            entry["keyStatus"] = card["keyStatus"]
        if ident in old and old[ident]["sourceDigest"] != checksum:
            entry["sourceChange"] = "changed"
        elif ident in old and old[ident].get("sourceChange") == "missing":
            entry["sourceChange"] = "restored"
        elif ident in old and old[ident].get("sourceChange"):
            entry["sourceChange"] = old[ident]["sourceChange"]
        tasks.append(entry)
    for ident in sorted(old.keys() - by_code.keys()):
        entry = old[ident] | {"status": "reference", "cardPath": None, "keyStatus": "missing",
                              "sourceChange": "missing", "reason": "Номер отсутствует в текущей выдаче ФИПИ."}
        tasks.append(entry)
    return tasks, files, review


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", required=True, type=Path, help="Внешний каталог снимка")
    parser.add_argument("--date", required=True, help="Дата снимка в формате YYYY-MM-DD")
    parser.add_argument("--output", type=Path, default=PROJECT_DIR, help="Корень сайта")
    parser.add_argument("--offline", action="store_true", help="Только сохранённые ответы")
    parser.add_argument("--check", action="store_true", help="Проверить снимок без записи в каталог сайта")
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--sample", action="store_true", help="Контрольная выборка с оригинальными условиями")
    modes.add_argument("--local-full", action="store_true", help="Локальная сборка с оригинальными условиями")
    args = parser.parse_args()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date):
        parser.error("Ожидается дата YYYY-MM-DD")
    mode = "sample" if args.sample else "local-full" if args.local_full else "references"
    output, cache = args.output.resolve(), args.cache.resolve()
    if cache.is_relative_to(PROJECT_DIR):
        parser.error("Храните кэш вне репозитория")
    if mode != "references" and (output.is_relative_to(PROJECT_DIR) or list(output.glob(".git"))):
        parser.error("Для оригинальных условий укажите внешнюю локальную папку --output")
    fetcher = Fetcher(cache, args.offline or args.check)
    rows, counts = sample_rows(fetcher) if args.sample else inventory(fetcher)
    catalog_path = output / DATA_PREFIX / "catalog.json"
    previous = json.loads(catalog_path.read_text())["tasks"] if catalog_path.exists() and mode != "sample" else []
    tasks, files, review = generate(rows, mode, fetcher, previous)
    totals = collections.Counter(row["status"] for row in tasks)
    keys = collections.Counter(row["keyStatus"] for row in tasks)
    changes = collections.Counter(row["sourceChange"] for row in tasks if "sourceChange" in row)
    report = {
        "snapshotDate": args.date, "subject": "Физика", "sourceUrl": SUBJECT, "mode": mode, **counts,
        "uniqueSourceCodes": len(rows), "catalogRecords": len(tasks),
        "statuses": {name: totals[name] for name in ("ready", "partial", "reference")},
        "keys": dict(keys), "verifiedKeys": keys["author-verified"] + keys["official-verified"],
        "changes": dict(changes), "filesWithErrors": len({
            reason.removeprefix("Недоступно вложение: ") for row in tasks if row["status"] == "partial"
            for reason in row["reason"].split(" · ") if reason.startswith("Недоступно вложение: ")
        }), "reviewQueue": review,
        "partial": [{"id": row["id"], "reason": row["reason"], "sourceUrl": row["sourceUrl"]}
                    for row in tasks if row["status"] == "partial"],
    }
    ready = {
        slug: [{"id": row["id"], "keyStatus": row["keyStatus"]} for row in tasks
               if row["status"] == "ready" and slug in expanded_topics(row["topicSlugs"])]
        for slug in REGISTRY
    }
    files[DATA_PREFIX + "import-report.json"] = json_bytes(report)
    files[DATA_PREFIX + "ready-by-topic.json"] = json_bytes(ready)
    files[DATA_PREFIX + "catalog.json"] = json_bytes({"schemaVersion": 1, "topics": TOPICS, "tasks": tasks})
    if args.check:
        for name, data in files.items():
            if not (output / name).is_file() or (output / name).read_bytes() != data:
                raise ValueError(f"Снимок отличается: {name}")
    else:
        lock = output / DATA_PREFIX / ".import.lock"
        lock.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.close(fd)
        try:
            for name, data in files.items():
                atomic_write(output / name, data)
        finally:
            lock.unlink()
    print(args.date, len(rows), dict(totals), "проверенных ключей:", report["verifiedKeys"])


def expanded_topics(slugs):
    expanded = set()
    for slug in slugs:
        while slug and slug not in expanded:
            expanded.add(slug)
            slug = REGISTRY[slug][1]
    return expanded


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError) as error:
        sys.exit(str(error))
