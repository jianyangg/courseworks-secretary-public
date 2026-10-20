import re
import unittest
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parent.parent


class StaticAssetTests(unittest.TestCase):
    def test_timeline_rows_give_multi_source_events_their_own_action_line(self):
        stylesheet = (ROOT / "ui" / "timeline.css").read_text(encoding="utf-8")

        def declarations(selector):
            match = re.search(rf"{re.escape(selector)}\s*\{{([^}}]+)\}}", stylesheet)
            self.assertIsNotNone(match, selector)
            return match.group(1)

        self.assertRegex(declarations(".task-row"), r"padding:\s*\d+px 0")
        self.assertIn("grid-template-columns: minmax(0, 1fr) auto;", declarations(".task-row-multi-link"))
        self.assertIn("grid-column: 1 / -1;", declarations(".task-row-multi-link .task-links"))

    def test_graded_work_script_is_served(self):
        from api.index import graded_work_script

        response = graded_work_script()
        self.assertEqual(response.path, ROOT / "graded-work.js")
        self.assertTrue((ROOT / "graded-work.js").is_file())

    def test_calendar_script_is_served_and_loaded_before_the_app(self):
        from api.index import calendar_view_script

        response = calendar_view_script()
        self.assertEqual(response.path, ROOT / "calendar-view.js")
        markup = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertLess(markup.index('/calendar-view.js'), markup.index('/app.js'))
        self.assertIn('id="calendar-button"', markup)
        self.assertIn('id="calendar"', markup)

    def test_aiken_integration_script_is_served_and_loaded_before_the_app(self):
        from api.index import aiken_integration_script

        response = aiken_integration_script()
        self.assertEqual(response.path, ROOT / "aiken-integration.js")
        markup = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertLess(
            markup.index('/aiken-integration.js'),
            markup.index('/app.js'),
        )

    def test_svg_favicon_is_valid_and_linked_from_the_document_head(self):
        markup = (ROOT / "index.html").read_text(encoding="utf-8")
        favicon = ROOT / "favicon.svg"

        self.assertIn(
            '<link rel="icon" href="/favicon.svg?v=3" type="image/svg+xml">',
            markup,
        )
        root = ElementTree.parse(favicon).getroot()
        self.assertEqual(root.tag, "{http://www.w3.org/2000/svg}svg")
        self.assertEqual(root.attrib["viewBox"], "0 0 64 64")


if __name__ == "__main__":
    unittest.main()
