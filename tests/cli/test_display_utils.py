from datetime import datetime

from ebay_watchlist.cli import display_utils


def test_format_naturaltime_uses_humanize_for_datetime(monkeypatch):
    captured = {"value": None}

    def fake_naturaltime(value):
        captured["value"] = value
        return "a moment ago"

    monkeypatch.setattr(display_utils.humanize, "naturaltime", fake_naturaltime)
    timestamp = datetime(2025, 1, 1, 12, 0, 0)

    result = display_utils.format_naturaltime(timestamp)

    assert result == "a moment ago"
    assert captured["value"] == timestamp


def test_format_naturaltime_returns_dash_for_non_datetime():
    result = display_utils.format_naturaltime("not-a-datetime")

    assert result == "-"
