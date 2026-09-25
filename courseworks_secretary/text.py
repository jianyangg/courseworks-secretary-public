from html.parser import HTMLParser


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data: str) -> None:
        value = " ".join(data.split())
        if value:
            self.parts.append(value)


def html_to_text(value, limit: int | None = None) -> str:
    if not value:
        return ""
    parser = _TextExtractor()
    parser.feed(str(value))
    return "\n".join(parser.parts)[:limit]
