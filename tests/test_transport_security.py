import unittest
from unittest.mock import patch

from courseworks_secretary.http import CanvasRequestError, JsonTransport


class TransportSecurityTests(unittest.TestCase):
    def test_never_sends_a_token_to_a_foreign_pagination_host(self):
        client = JsonTransport("https://canvas.example.edu", "private-value")
        with patch.object(client, "_request", side_effect=[([], {"Link": '<https://other.example/api/v1/courses>; rel="next"'}), AssertionError("Foreign request was attempted")]) as send:
            with self.assertRaises(CanvasRequestError):
                client.get_all("/api/v1/courses")
        self.assertEqual(send.call_count, 1)

    def test_repeated_pagination_link_stops_instead_of_looping(self):
        client = JsonTransport("https://canvas.example.edu", "private-value")
        page = ([], {"Link": '<https://canvas.example.edu/api/v1/courses?page=2>; rel="next"'})
        with patch.object(client, "_request", side_effect=[page, page, CanvasRequestError("Test guard")]) as send:
            with self.assertRaises(CanvasRequestError):
                client.get_all("/api/v1/courses")
        self.assertEqual(send.call_count, 2)

    def test_absolute_foreign_request_is_rejected_before_network_access(self):
        client = JsonTransport("https://canvas.example.edu", "private-value")
        with patch.object(client, "_request") as send:
            with self.assertRaises(CanvasRequestError):
                client.get_all("https://other.example/api/v1/courses")
        send.assert_not_called()
