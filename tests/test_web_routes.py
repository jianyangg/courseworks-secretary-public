import re
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from api.index import app


class WebRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app, base_url="https://testserver")

    def test_every_local_interface_asset_is_served_with_security_headers(self):
        page = self.client.get("/")
        urls = re.findall(r'(?:src|href)="(/[^"#]+)"', page.text)
        self.assertGreater(len(urls), 15)
        for url in urls:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200, url)
            self.assertEqual(response.headers["cache-control"], "no-store")

    def test_demo_never_reads_private_storage_or_guide(self):
        with patch("api.index.snapshot_store", side_effect=AssertionError("Private store read")):
            with patch("api.index.build_course_guide", side_effect=AssertionError("Private guide read")):
                for method, url in (("GET", "/demo"), ("GET", "/demo/api/timeline"), ("GET", "/demo/api/course-guide"), ("POST", "/demo/api/sync")):
                    self.assertEqual(self.client.request(method, url).status_code, 200, url)

    def test_private_configuration_is_not_a_static_asset(self):
        for url in ("/.env", "/.git/config", "/work/courseworks/snapshot.json", "/ui/../.env"):
            self.assertEqual(self.client.get(url).status_code, 404, url)

    def test_private_api_requires_a_session(self):
        self.assertEqual(self.client.get("/api/timeline").status_code, 401)
        self.assertEqual(self.client.post("/api/sync").status_code, 401)
