from datetime import datetime

from ebay_watchlist.web import filters


def test_humanize_datetime_returns_empty_string_for_none():
    assert filters.humanize_datetime(None) == ""


def test_humanize_datetime_uses_humanize_library(monkeypatch):
    seen: dict[str, datetime] = {}

    def fake_naturaltime(value: datetime) -> str:
        seen["value"] = value
        return "just now"

    monkeypatch.setattr(filters.humanize, "naturaltime", fake_naturaltime)
    timestamp = datetime(2026, 2, 16, 20, 0, 0)

    assert filters.humanize_datetime(timestamp) == "just now"
    assert seen["value"] == timestamp
