import logging
from dataclasses import dataclass

import pytest

from ebay_watchlist.cli import main as cli_main


def test_fetch_updates_fails_fast_without_credentials(monkeypatch):
    monkeypatch.delenv("EBAY_CLIENT_ID", raising=False)
    monkeypatch.delenv("EBAY_CLIENT_SECRET", raising=False)

    with pytest.raises(ValueError, match="EBAY_CLIENT_ID and EBAY_CLIENT_SECRET"):
        cli_main.fetch_updates(limit=1)


def test_main_closes_db_on_command_error(monkeypatch):
    close_called = {"value": False}

    monkeypatch.setattr(cli_main.database, "connect", lambda *args, **kwargs: None)
    monkeypatch.setattr(cli_main, "ensure_schema_compatibility", lambda: None)

    def fake_close():
        close_called["value"] = True

    monkeypatch.setattr(cli_main.database, "close", fake_close)
    monkeypatch.setattr(cli_main, "load_dotenv", lambda: None)

    def fake_app():
        raise RuntimeError("boom")

    monkeypatch.setattr(cli_main, "app", fake_app)

    with pytest.raises(RuntimeError, match="boom"):
        cli_main.main()

    assert close_called["value"] is True


def test_run_gunicorn_execs_expected_command(monkeypatch):
    captured: dict[str, object] = {}

    def fake_execvp(file: str, args: list[str]):
        captured["file"] = file
        captured["args"] = args
        raise SystemExit(0)

    monkeypatch.setattr(cli_main.os, "execvp", fake_execvp)

    with pytest.raises(SystemExit):
        cli_main.run_gunicorn(host="0.0.0.0", port=5001, workers=3)

    assert captured["file"] == "gunicorn"
    assert captured["args"] == [
        "gunicorn",
        "--bind",
        "0.0.0.0:5001",
        "--workers",
        "3",
        "ebay_watchlist.web.app:create_app()",
    ]


@dataclass
class _FakeSeller:
    username: str


@dataclass
class _FakeItem:
    seller: _FakeSeller


def test_fetch_updates_runs_full_happy_path_with_notifications(monkeypatch, caplog):
    calls: dict[str, object] = {
        "latest_items": [],
        "created_items": [],
        "displayed": None,
        "notified": None,
        "messages": [],
    }
    items_by_category = {
        619: [_FakeItem(_FakeSeller("seller-1")), _FakeItem(_FakeSeller("seller-2"))],
        58058: [_FakeItem(_FakeSeller("seller-2")), _FakeItem(_FakeSeller("seller-2"))],
    }

    class FakeEbayAPI:
        def __init__(self, client_id: str, client_secret: str, marketplace_id: str):
            calls["api_init"] = (client_id, client_secret, marketplace_id)

        def get_latest_items_for_sellers(
            self, seller_names: list[str], category_id: int, limit: int
        ):
            calls["latest_items"].append((tuple(seller_names), category_id, limit))
            return items_by_category[category_id]

    class FakeNotificationService:
        def __init__(self, settings):
            calls["notification_settings"] = settings

        def notify_new_items(self, items):
            calls["notified"] = list(items)

    monkeypatch.setenv("EBAY_CLIENT_ID", "client-id")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", "client-secret")
    monkeypatch.setenv("EBAY_MARKETPLACE_ID", "EBAY_GB")
    monkeypatch.setenv("ENABLE_NOTIFICATIONS", "1")

    monkeypatch.setattr(cli_main, "EbayAPI", FakeEbayAPI)
    monkeypatch.setattr(cli_main, "NotificationService", FakeNotificationService)
    monkeypatch.setattr(
        cli_main.SellerRepository,
        "get_enabled_sellers",
        staticmethod(lambda: ["seller-1", "seller-2"]),
    )
    monkeypatch.setattr(
        cli_main.CategoryRepository,
        "get_enabled_categories",
        staticmethod(lambda: [619, 58058]),
    )
    monkeypatch.setattr(
        cli_main.ItemRepository,
        "create_or_update_item_from_ebay_item_dto",
        staticmethod(
            lambda item, category_id: calls["created_items"].append((item, category_id))
        ),
    )
    monkeypatch.setattr(
        cli_main.ItemRepository,
        "get_items_created_after_datetime",
        staticmethod(lambda start: ["created-row"]),
    )
    monkeypatch.setattr(cli_main, "display_db_items", lambda items: calls.update(displayed=items))
    monkeypatch.setattr(
        cli_main,
        "print_with_timestamp",
        lambda message: calls["messages"].append(message),
    )
    caplog.set_level(logging.INFO, logger=cli_main.__name__)

    cli_main.fetch_updates(limit=2)

    assert calls["api_init"] == ("client-id", "client-secret", "EBAY_GB")
    assert calls["latest_items"] == [
        (("seller-1", "seller-2"), 619, 2),
        (("seller-1", "seller-2"), 58058, 2),
    ]
    assert len(calls["created_items"]) == 4
    assert calls["displayed"] == ["created-row"]
    assert calls["notified"] == ["created-row"]
    fetch_log_messages = [record.message for record in caplog.records]
    assert any(
        "watched_sellers=['seller-1', 'seller-2']" in message
        for message in fetch_log_messages
    )
    assert any(
        "category_id=619" in message
        and "response_items_count=2" in message
        and "unique_sellers_count=2" in message
        and "unique_sellers=['seller-1', 'seller-2']" in message
        for message in fetch_log_messages
    )
    assert any(
        "category_id=58058" in message
        and "response_items_count=2" in message
        and "unique_sellers_count=1" in message
        and "unique_sellers=['seller-2']" in message
        for message in fetch_log_messages
    )
    assert any("new items inserted" in message for message in calls["messages"])


def test_show_latest_items_uses_category_specific_query_when_present(monkeypatch):
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        cli_main.ItemRepository,
        "get_latest_items_for_scraped_category",
        staticmethod(
            lambda category_id, limit: captured.update(
                category_id=category_id,
                limit=limit,
            )
            or ["by-category"]
        ),
    )
    monkeypatch.setattr(cli_main, "display_db_items", lambda items: captured.update(items=items))

    cli_main.show_latest_items(limit=25, category=619)

    assert captured == {"category_id": 619, "limit": 25, "items": ["by-category"]}


def test_show_latest_items_defaults_to_global_latest(monkeypatch):
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        cli_main.ItemRepository,
        "get_latest_items",
        staticmethod(lambda limit: captured.update(limit=limit) or ["latest"]),
    )
    monkeypatch.setattr(cli_main, "display_db_items", lambda items: captured.update(items=items))

    cli_main.show_latest_items(limit=10)

    assert captured == {"limit": 10, "items": ["latest"]}


def test_run_loop_rejects_invalid_cleanup_interval():
    with pytest.raises(ValueError, match="cleanup_interval_minutes must be at least 1"):
        cli_main.run_loop(cleanup_interval_minutes=0)


def test_run_flask_passes_arguments_to_flask_app(monkeypatch):
    captured: dict[str, object] = {}

    class FakeFlaskApp:
        def run(self, host=None, port=None, debug=False):
            captured["run"] = (host, port, debug)

    monkeypatch.setattr(cli_main, "create_app", lambda: FakeFlaskApp())

    cli_main.run_flask(host="127.0.0.1", port=5001, debug=True)

    assert captured["run"] == ("127.0.0.1", 5001, True)


def test_run_gunicorn_rejects_invalid_worker_count():
    with pytest.raises(ValueError, match="workers must be at least 1"):
        cli_main.run_gunicorn(workers=0)


def test_main_ignores_operational_error_when_closing_database(monkeypatch):
    from peewee import OperationalError

    close_called = {"value": False}

    monkeypatch.setattr(cli_main, "load_dotenv", lambda: None)
    monkeypatch.setattr(cli_main.database, "connect", lambda *args, **kwargs: None)
    monkeypatch.setattr(cli_main, "ensure_schema_compatibility", lambda: None)
    monkeypatch.setattr(cli_main, "app", lambda: None)

    def fake_close():
        close_called["value"] = True
        raise OperationalError("close failed")

    monkeypatch.setattr(cli_main.database, "close", fake_close)

    cli_main.main()

    assert close_called["value"] is True
