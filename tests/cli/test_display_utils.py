from datetime import datetime, timedelta

from ebay_watchlist.cli import display_utils


def test_format_naturaltime_returns_human_readable_text_for_datetime():
    timestamp = datetime.now() - timedelta(minutes=5)

    result = display_utils.format_naturaltime(timestamp)

    assert isinstance(result, str)
    assert result != ""
    assert result != "-"
    assert "ago" in result


def test_format_naturaltime_returns_dash_for_non_datetime():
    result = display_utils.format_naturaltime("not-a-datetime")

    assert result == "-"
