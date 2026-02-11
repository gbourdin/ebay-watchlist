from datetime import datetime, timedelta

import pytest

from ebay_watchlist.cli import main as cli_main


def _build_fixed_datetime(now: datetime):
    class FixedDateTime:
        @staticmethod
        def now() -> datetime:
            return now

    return FixedDateTime


def test_cleanup_expired_items_uses_default_retention(monkeypatch):
    fixed_now = datetime(2026, 2, 10, 12, 0, 0)
    captured: dict[str, datetime] = {}
    messages: list[str] = []

    def fake_delete(cutoff: datetime) -> int:
        captured["cutoff"] = cutoff
        return 7

    monkeypatch.setattr(cli_main, "datetime", _build_fixed_datetime(fixed_now))
    monkeypatch.setattr(
        cli_main.ItemRepository,
        "delete_items_ended_before",
        staticmethod(fake_delete),
    )
    monkeypatch.setattr(cli_main, "print_with_timestamp", messages.append)

    deleted = cli_main.cleanup_expired_items()

    assert deleted == 7
    assert captured["cutoff"] == fixed_now - timedelta(days=180)
    assert any("7 expired items deleted" in message for message in messages)


def test_cleanup_expired_items_accepts_custom_retention(monkeypatch):
    fixed_now = datetime(2026, 2, 10, 12, 0, 0)
    captured: dict[str, datetime] = {}

    def fake_delete(cutoff: datetime) -> int:
        captured["cutoff"] = cutoff
        return 0

    monkeypatch.setattr(cli_main, "datetime", _build_fixed_datetime(fixed_now))
    monkeypatch.setattr(
        cli_main.ItemRepository,
        "delete_items_ended_before",
        staticmethod(fake_delete),
    )
    monkeypatch.setattr(cli_main, "print_with_timestamp", lambda message: None)

    deleted = cli_main.cleanup_expired_items(retention_days=45)

    assert deleted == 0
    assert captured["cutoff"] == fixed_now - timedelta(days=45)


def test_cleanup_expired_items_rejects_non_positive_retention_days():
    with pytest.raises(ValueError, match="retention_days must be at least 1"):
        cli_main.cleanup_expired_items(retention_days=0)
