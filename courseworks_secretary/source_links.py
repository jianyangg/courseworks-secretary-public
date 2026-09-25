"""Extract safe, human-readable external links from CourseWorks content."""

from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse

from .config import BASE_URL


COURSEWORKS_HOST = "courseworks2.columbia.edu"
SITE_LABELS = {
    "www.vmock.com": "VMock",
    "vmock.com": "VMock",
    "columbia.qualtrics.com": "Qualtrics",
    "www.caisey.me": "CAiSEY",
    "caisey.me": "CAiSEY",
    "caseworks.business.columbia.edu": "CaseWorks",
}


class _AnchorExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.urls: list[str] = []
        self.records: list[dict[str, str]] = []
        self._active_url: str | None = None
        self._active_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.urls.append(href)
                self._active_url = href
                self._active_text = []

    def handle_data(self, data: str) -> None:
        if self._active_url:
            self._active_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != "a" or not self._active_url:
            return
        label = " ".join("".join(self._active_text).split())
        self.records.append({"label": label, "url": self._active_url})
        self._active_url = None
        self._active_text = []


def external_links_from_html(value: Any) -> list[dict[str, str]]:
    if not value:
        return []
    parser = _AnchorExtractor()
    parser.feed(str(value))
    return normalized_external_links({"url": url} for url in parser.urls)


def content_links_from_html(value: Any) -> list[dict[str, str]]:
    """Return safe CourseWorks and external links embedded in rich content."""
    if not value:
        return []
    parser = _AnchorExtractor()
    parser.feed(str(value))
    return normalized_content_links(parser.records)


def normalized_content_links(records: Any) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    seen: set[str] = set()
    for record in records or []:
        if not isinstance(record, dict):
            continue
        url = record.get("url")
        if not isinstance(url, str):
            continue
        if url.startswith("/courses/"):
            url = BASE_URL + url
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or not host or parsed.username or parsed.password:
            continue
        if host == COURSEWORKS_HOST:
            url = parsed._replace(query="", fragment="").geturl()
        if url in seen:
            continue
        label = record.get("label")
        if not isinstance(label, str) or not label.strip() or len(label.strip()) > 80:
            label = SITE_LABELS.get(host, host.removeprefix("www."))
        links.append({"label": label.strip(), "url": url})
        seen.add(url)
    return links


def normalized_external_links(records: Any) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    seen: set[str] = set()
    for record in records or []:
        if not isinstance(record, dict):
            continue
        url = record.get("url")
        if not isinstance(url, str):
            continue
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or not host or host == COURSEWORKS_HOST:
            continue
        if parsed.username or parsed.password or url in seen:
            continue
        label = record.get("label")
        if not isinstance(label, str) or not label.strip() or len(label) > 40:
            label = SITE_LABELS.get(host, host.removeprefix("www."))
        links.append({"label": label.strip(), "url": url})
        seen.add(url)
    return links


def safe_courseworks_url(value: Any) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    if value.startswith("/courses/"):
        value = BASE_URL + value
    parsed = urlparse(value)
    if parsed.scheme == "https" and parsed.hostname == COURSEWORKS_HOST:
        return value
    return None


def assignment_links(primary_url: Any, external_records: Any) -> list[dict[str, str]]:
    external = normalized_external_links(external_records)
    if not external:
        return []
    primary = safe_courseworks_url(primary_url)
    return ([{"label": "CourseWorks", "url": primary}] if primary else []) + external


def page_links(primary_url: Any, content_records: Any) -> list[dict[str, str]]:
    content = normalized_content_links(content_records)
    if not content:
        return []
    primary = safe_courseworks_url(primary_url)
    links = ([{"label": "CourseWorks page", "url": primary}] if primary else []) + content
    seen: set[str] = set()
    unique: list[dict[str, str]] = []
    for link in links:
        if link["url"] in seen:
            continue
        unique.append(link)
        seen.add(link["url"])
    return unique
