"""Check the shipped catalog, links and card payloads without network access."""

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

PROJECT = Path(__file__).resolve().parents[2]
SAFE_PATH = re.compile(r"ege-data/v1/(?:cards|assets)/[a-zA-Z0-9_.-]+")


def data(path):
    return json.loads(path.read_text())


def local(root, path):
    assert SAFE_PATH.fullmatch(path), path
    file = root / path
    assert file.is_file(), path
    return file


def official(url):
    parsed = urlsplit(url)
    assert parsed.scheme == "https" and parsed.netloc == "ege.fipi.ru", url
    return parsed


def verify_parts(root, parts):
    allowed = {"prompt", "text", "image", "math", "element", "options"}
    seen_figures = 0
    for part in parts:
        kind = part["type"]
        assert kind in allowed, kind
        if kind == "image":
            local(root, part["path"])
            official(part["sourceUrl"])
            assert part["alt"]
            seen_figures += 1
        if kind == "text":
            assert isinstance(part["text"], str)
        if kind in {"math", "element"}:
            assert re.fullmatch(r"[a-z][a-z0-9-]*", part["tag"]), part
            assert part["tag"] not in {"script", "iframe", "object", "embed"}
            assert all(not name.lower().startswith("on") and name not in {"href", "style", "src"}
                       for name in part.get("attrs", {}))
        seen_figures += verify_parts(root, part.get("children", []))
        for item in part.get("items", []):
            seen_figures += verify_parts(root, item)
    return seen_figures


def verify(root):
    base = root / "ege-data/v1"
    catalog = data(base / "catalog.json")
    report = data(base / "import-report.json")
    by_topic = data(base / "ready-by-topic.json")
    assert catalog["schemaVersion"] == 1
    topics = {topic["slug"]: topic["parent"] for topic in catalog["topics"]}
    assert len(topics) == len(catalog["topics"])
    tasks = catalog["tasks"]
    if report["mode"] == "references":
        practice = data(base / "practice-catalog.json")
        assert practice == {"tasks": [task for task in tasks if task["status"] == "ready"]}
    assert len({row["id"] for row in tasks}) == len({row["sourceCode"].upper() for row in tasks}) == len(tasks)
    counts = Counter(row["status"] for row in tasks)
    assert set(counts) <= {"ready", "partial", "reference"}, counts
    assert len(tasks) == report["catalogRecords"] == sum(report["statuses"].values())
    assert dict((name, counts[name]) for name in report["statuses"]) == report["statuses"]
    if "sourceCount" in report:
        assert report["sourceCount"] == report["observedCodes"] == report["uniqueSourceCodes"]
        assert all(check["sourceCount"] == check["inventoryCount"] and check["firstPageMatches"]
                   for check in report["filters"].values())
    topic_lists = {slug: [] for slug in topics}
    verified_keys = 0
    for task in tasks:
        scope = set()
        for slug in task["topicSlugs"]:
            lineage = set()
            while slug is not None:
                assert slug in topics and slug not in lineage, task["id"]
                lineage.add(slug)
                slug = topics[slug]
            scope.update(lineage)
        assert task["id"] == "ege-fipi-" + task["sourceCode"].upper()
        assert parse_qs(official(task["sourceUrl"]).query)["qid"] == [task["sourceCode"]]
        if task["status"] == "reference":
            assert task["reason"] and task["cardPath"] is None
            continue
        card = data(local(root, task["cardPath"]))
        for name in ("id", "sourceCode", "sourceUrl", "topicSlugs", "answerType", "keyStatus"):
            assert task[name] == card[name], (task["id"], name)
        figures = verify_parts(root, card["parts"])
        if task["status"] == "partial":
            assert task["reason"]
            continue
        assert card["parts"] and task["reason"] is None
        assert bool(figures) == task["hasFigure"], task["id"]
        if card["keyStatus"] in {"official-verified", "author-verified"}:
            verified_keys += 1
            assert card["key"]["rule"] in {"number", "measurement-pair", "ordered-digits", "unordered-digits"}
            assert card["key"]["accepted"] and card["key"]["credit"]
        if "solution" in card:
            assert card["solution"]["credit"]
            verify_parts(root, card["solution"]["parts"])
        for slug in scope:
            topic_lists[slug].append({"id": card["id"], "keyStatus": card["keyStatus"]})
    assert by_topic == topic_lists
    assert verified_keys == report["verifiedKeys"]
    print(f"{len(tasks)} записей · {dict(counts)} · {verified_keys} проверенных ключей")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=PROJECT)
    verify(parser.parse_args().root)
