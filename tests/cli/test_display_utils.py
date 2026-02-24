from datetime import datetime

from freezegun import freeze_time
from ebay_watchlist.cli import display_utils


@freeze_time("2026-02-16 12:00:00")
def test_format_naturaltime_returns_human_readable_text_for_datetime():
    timestamp = datetime(2026, 2, 16, 11, 55, 0)

    result = display_utils.format_naturaltime(timestamp)

    assert result == "5 minutes ago"


def test_format_naturaltime_returns_dash_for_non_datetime():
    result = display_utils.format_naturaltime("not-a-datetime")

    assert result == "-"

