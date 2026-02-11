from datetime import datetime

from ebay_watchlist.cli import main as cli_main


def _build_datetime_sequence(times: list[datetime]):
    iterator = iter(times)

    class SequencedDateTime:
        @staticmethod
        def now() -> datetime:
            return next(iterator)

    return SequencedDateTime


def test_run_loop_invokes_cleanup_periodically(monkeypatch):
    base = datetime(2026, 2, 10, 12, 0, 0)
    monkeypatch.setattr(
        cli_main,
        "datetime",
        _build_datetime_sequence(
            [
                base,
                base.replace(minute=30),
                base.replace(hour=13, minute=1),
            ]
        ),
    )

    fetch_calls = {"count": 0}
    cleanup_calls: list[int] = []
    sleep_calls = {"count": 0}

    def fake_fetch_updates(limit: int = 100):
        fetch_calls["count"] += 1

    def fake_cleanup_expired_items(retention_days: int = 30) -> int:
        cleanup_calls.append(retention_days)
        return 0

    def fake_sleep(seconds: int):
        sleep_calls["count"] += 1
        if sleep_calls["count"] >= 3:
            raise KeyboardInterrupt

    monkeypatch.setattr(cli_main, "fetch_updates", fake_fetch_updates)
    monkeypatch.setattr(cli_main, "cleanup_expired_items", fake_cleanup_expired_items)
    monkeypatch.setattr(cli_main, "sleep", fake_sleep)
    monkeypatch.setattr(cli_main, "print_with_timestamp", lambda message: None)

    cli_main.run_loop(cleanup_retention_days=45, cleanup_interval_minutes=60)

    assert fetch_calls["count"] == 3
    assert cleanup_calls == [45, 45]


def test_run_loop_continues_when_cleanup_raises(monkeypatch):
    base = datetime(2026, 2, 10, 12, 0, 0)
    monkeypatch.setattr(
        cli_main,
        "datetime",
        _build_datetime_sequence([base, base.replace(minute=5)]),
    )

    fetch_calls = {"count": 0}
    sleep_calls = {"count": 0}
    messages: list[str] = []

    def fake_fetch_updates(limit: int = 100):
        fetch_calls["count"] += 1

    def fake_cleanup_expired_items(retention_days: int = 30) -> int:
        raise RuntimeError("cleanup failed")

    def fake_sleep(seconds: int):
        sleep_calls["count"] += 1
        if sleep_calls["count"] >= 2:
            raise KeyboardInterrupt

    monkeypatch.setattr(cli_main, "fetch_updates", fake_fetch_updates)
    monkeypatch.setattr(cli_main, "cleanup_expired_items", fake_cleanup_expired_items)
    monkeypatch.setattr(cli_main, "sleep", fake_sleep)
    monkeypatch.setattr(cli_main, "print_with_timestamp", messages.append)

    cli_main.run_loop(cleanup_retention_days=30, cleanup_interval_minutes=60)

    assert fetch_calls["count"] == 2
    assert any("Cleanup failed" in message for message in messages)
