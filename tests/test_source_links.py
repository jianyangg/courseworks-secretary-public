import unittest

from courseworks_secretary.source_links import external_links_from_html


class SourceLinkTests(unittest.TestCase):
    def test_extracts_external_assignment_links_once_and_rejects_unsafe_urls(self):
        html = """
            <a href="https://www.vmock.com/columbiaengineering/login">VMock</a>
            <a href="https://www.vmock.com/columbiaengineering/login">Open again</a>
            <a href="https://courseworks2.columbia.edu/courses/1/files/2">Canvas file</a>
            <a href="javascript:alert(1)">Bad</a>
            <a href="http://example.org/resource">Unencrypted</a>
            <a href="https://files.example.org/assignment.pdf">Assignment brief</a>
        """

        self.assertEqual(external_links_from_html(html), [
            {"label": "VMock", "url": "https://www.vmock.com/columbiaengineering/login"},
            {"label": "files.example.org", "url": "https://files.example.org/assignment.pdf"},
        ])
