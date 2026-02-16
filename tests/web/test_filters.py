from datetime import datetime, timedelta

from ebay_watchlist.web import filters


def test_humanize_datetime_returns_empty_string_for_none():
    assert filters.humanize_datetime(None) == ""


def test_humanize_datetime_returns_human_readable_text_for_datetime():
    timestamp = datetime.now() - timedelta(minutes=5)

    result = filters.humanize_datetime(timestamp)

    assert isinstance(result, str)
    assert result != ""
    assert result != "-"
    assert "ago" in result
