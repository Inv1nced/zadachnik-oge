"""Small fixtures for FIPI page validation and stable codes."""

import sys
import unittest

from bs4 import BeautifulSoup
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "import"))
from import_bank import deduplicate, stable_id
from parts import export_parts
from source import PAGE_SIZE, parse_page


def page(condition, count=1):
    return f"""
    <div class="qblock">
      <input type="hidden" name="guid" value="{'A' * 32}">
      <div class="cell_0">{condition}</div>
    </div>
    <div>
      <div class="id-text"><span class="canselect">1aB23c</span></div>
      <div class="task-info-content"><table>
        <tr><td class="param-name">КЭС:</td><td><div>1.1 Кинематика</div></td></tr>
        <tr><td class="param-name">Тип ответа:</td><td>Краткий ответ</td></tr>
      </table></div>
    </div>
    <script>window.parent.setQCount({count}, 1, {PAGE_SIZE});</script>
    """.encode()


class ImportTests(unittest.TestCase):
    def test_preserves_unicode_and_math_without_handlers(self):
        _, rows = parse_page(page('<p onclick="bad()">−0,75 <m:math><m:msup><m:mi>м</m:mi><m:mn>2</m:mn></m:msup></m:math></p>'), 0)
        parts, reasons = export_parts(rows[0], None, {})
        self.assertFalse(reasons)
        p = parts[0]["children"][0]
        self.assertEqual(p["attrs"], {})
        self.assertEqual(p["children"][0]["text"], "−0,75 ")
        self.assertEqual(p["children"][1]["children"][0]["tag"], "msup")
        self.assertEqual(stable_id(rows[0]["sourceCode"]), "ege-fipi-1AB23C")

    def test_options_with_and_without_number_cell(self):
        _, rows = parse_page(page("<p>Выберите ответы</p>"), 0)
        markup = BeautifulSoup(
            '<table><tr><td><input value="1"></td><td>Один</td></tr>'
            '<tr><td><input value="2"></td><td>2)</td><td>Два</td></tr></table>',
            "html.parser",
        )
        rows[0]["options"] = markup.select("tr")
        parts, reasons = export_parts(rows[0], None, {})
        self.assertFalse(reasons)
        self.assertEqual([option[0]["text"] for option in parts[1]["items"]], ["Один", "Два"])

    def test_unknown_scripts_mark_incomplete(self):
        _, rows = parse_page(page('<p>Текст<script>alert(1)</script></p>'), 0)
        parts, reasons = export_parts(rows[0], None, {})
        self.assertTrue(reasons)
        self.assertNotIn("alert", str(parts))

    def test_short_page_and_wrong_page_fail(self):
        with self.assertRaises(ValueError):
            parse_page(page("Частичный ответ", 2), 0)
        with self.assertRaises(ValueError):
            parse_page(page("Другая страница"), 1)

    def test_duplicates_keep_topics_and_stable_id(self):
        _, rows = parse_page(page("Условие"), 0)
        duplicate = rows[0] | {"sourceCode": "1AB23C", "kes": ["1.2"]}
        result, count = deduplicate([rows[0], duplicate])
        self.assertEqual(count, 1)
        self.assertEqual(result["ege-fipi-1AB23C"]["kes"], ["1.1", "1.2"])
        with self.assertRaises(ValueError):
            deduplicate([rows[0], duplicate | {"guid": "B" * 32}])


if __name__ == "__main__":
    unittest.main()
