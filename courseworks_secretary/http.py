import json
from typing import Any, Dict, List, Optional, Sequence, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


Params = Sequence[Tuple[str, str]]


class CanvasRequestError(RuntimeError):
    pass


def validate_origin(url: str, base_url: str) -> None:
    parsed, base = urlsplit(url), urlsplit(base_url)
    if (parsed.scheme != "https" or parsed.netloc != base.netloc
            or parsed.username or parsed.password):
        raise CanvasRequestError("Refusing to send credentials outside the configured Canvas origin")


class CanvasRedirectHandler(HTTPRedirectHandler):
    def __init__(self, base_url: str):
        self.base_url = base_url

    def redirect_request(self, request, fp, code, msg, headers, newurl):
        validate_origin(newurl, self.base_url)
        return super().redirect_request(request, fp, code, msg, headers, newurl)


def next_link(header: Optional[str]) -> Optional[str]:
    if not header:
        return None
    for part in header.split(","):
        segments = [segment.strip() for segment in part.split(";")]
        if any(segment == 'rel="next"' for segment in segments[1:]):
            return segments[0].strip("<>")
    return None


class JsonTransport:
    def __init__(self, base_url: str, token: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/") + "/"
        self.token = token
        self.timeout = timeout
        self.opener = build_opener(CanvasRedirectHandler(self.base_url))

    def get_all(
        self, path: str, params: Optional[Params] = None
    ) -> List[Dict[str, Any]]:
        query = list(params or [])
        if not any(key == "per_page" for key, _ in query):
            query.append(("per_page", "100"))
        url = self._url(path, query)
        collected: List[Dict[str, Any]] = []
        seen = set()
        while url:
            validate_origin(url, self.base_url)
            if url in seen or len(seen) >= 128:
                raise CanvasRequestError("Canvas pagination did not finish within the page limit")
            seen.add(url)
            payload, headers = self._request(url)
            if not isinstance(payload, list):
                raise CanvasRequestError("Expected a paginated Canvas list response")
            collected.extend(payload)
            url = next_link(headers.get("Link"))
        return collected

    def get_one(
        self, path: str, params: Optional[Params] = None
    ) -> Dict[str, Any]:
        payload, _ = self._request(self._url(path, params or []))
        if not isinstance(payload, dict):
            raise CanvasRequestError("Expected a Canvas object response")
        return payload

    def _url(self, path: str, params: Params) -> str:
        url = urljoin(self.base_url, path.lstrip("/"))
        return url + ("?" + urlencode(params) if params else "")

    def _request(self, url: str):
        validate_origin(url, self.base_url)
        request = Request(
            url,
            headers={
                "Authorization": "Bearer " + self.token,
                "Accept": "application/json",
                "User-Agent": "CourseWorksSecretary/0.1",
            },
        )
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                body = response.read(8_000_001)
                if len(body) > 8_000_000:
                    raise CanvasRequestError("Canvas response exceeded the supported size")
                return json.loads(body.decode("utf-8")), response.headers
        except HTTPError as error:
            if error.code == 401:
                message = "CourseWorks rejected the token. Generate and store a new one."
            else:
                message = "CourseWorks API request failed with HTTP {}".format(error.code)
            raise CanvasRequestError(message) from error
        except (URLError, TimeoutError, json.JSONDecodeError) as error:
            raise CanvasRequestError("Could not read the CourseWorks API response") from error
