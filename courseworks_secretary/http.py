import json
from typing import Any, Dict, List, Optional, Sequence, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen


Params = Sequence[Tuple[str, str]]


class CanvasRequestError(RuntimeError):
    pass


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

    def get_all(
        self, path: str, params: Optional[Params] = None
    ) -> List[Dict[str, Any]]:
        query = list(params or [])
        if not any(key == "per_page" for key, _ in query):
            query.append(("per_page", "100"))
        url = self._url(path, query)
        collected: List[Dict[str, Any]] = []
        while url:
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
        request = Request(
            url,
            headers={
                "Authorization": "Bearer " + self.token,
                "Accept": "application/json",
                "User-Agent": "CourseWorksSecretary/0.1",
            },
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                return json.loads(response.read().decode("utf-8")), response.headers
        except HTTPError as error:
            if error.code == 401:
                message = "CourseWorks rejected the token. Generate and store a new one."
            else:
                message = "CourseWorks API request failed with HTTP {}".format(error.code)
            raise CanvasRequestError(message) from error
        except (URLError, TimeoutError, json.JSONDecodeError) as error:
            raise CanvasRequestError("Could not read the CourseWorks API response") from error
