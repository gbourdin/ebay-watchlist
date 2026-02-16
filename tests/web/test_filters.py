from datetime import datetime

from freezegun import freeze_time
from ebay_watchlist.web import filters


def test_humanize_datetime_returns_empty_string_for_none():
    assert filters.humanize_datetime(None) == ""


@freeze_time("2026-02-16 12:00:00")
def test_humanize_datetime_returns_human_readable_text_for_datetime():
    timestamp = datetime(2026, 2, 16, 11, 55, 0)

    result = filters.humanize_datetime(timestamp)

    assert result == "5 minutes ago"
