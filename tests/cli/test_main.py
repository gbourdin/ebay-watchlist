import pytest

from ebay_watchlist.cli import main as cli_main


def test_fetch_updates_fails_fast_without_credentials(monkeypatch):
    monkeypatch.delenv("EBAY_CLIENT_ID", raising=False)
    monkeypatch.delenv("EBAY_CLIENT_SECRET", raising=False)

    monkeypatch.setattr(
        cli_main.SellerRepository,
        "get_enabled_sellers",
        staticmethod(lambda: ["seller"]),
    )
    monkeypatch.setattr(
        cli_main.CategoryRepository,
        "get_enabled_categories",
        staticmethod(lambda: [619]),
    )
    monkeypatch.setattr(
        cli_main.ItemRepository,
        "get_items_created_after_datetime",
        staticmethod(lambda start: []),
    )
    monkeypatch.setattr(cli_main, "print_with_timestamp", lambda message: None)

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
