from typer.testing import CliRunner

from ebay_watchlist.cli.main import app
from ebay_watchlist.ebay.categories import (
    CATEGORY_MUSICAL_INSTRUMENTS_AND_DJ_EQUIPMENT,
)


runner = CliRunner()


def test_init_database_command_creates_tables(monkeypatch):
    called = {"value": False}

    def fake_create_tables():
        called["value"] = True

    monkeypatch.setattr("ebay_watchlist.cli.management.create_tables", fake_create_tables)

    result = runner.invoke(app, ["config", "init-database"])

    assert result.exit_code == 0
    assert called["value"] is True
    assert "Successfully created all db tables" in result.stdout


def test_clean_database_force_drops_tables(monkeypatch):
    called = {"value": False}

    def fake_drop_tables():
        called["value"] = True

    monkeypatch.setattr("ebay_watchlist.cli.management.drop_tables", fake_drop_tables)

    result = runner.invoke(app, ["config", "clean-database", "--force"])

    assert result.exit_code == 0
    assert called["value"] is True
    assert "Done!" in result.stdout


def test_clean_database_without_force_aborts_when_not_confirmed(monkeypatch):
    called = {"value": False}

    def fake_drop_tables():
        called["value"] = True

    monkeypatch.setattr("ebay_watchlist.cli.management.drop_tables", fake_drop_tables)

    result = runner.invoke(app, ["config", "clean-database"], input="n\n")

    assert result.exit_code != 0
    assert called["value"] is False


def test_seller_and_category_commands_call_repositories(monkeypatch):
    added_sellers: list[str] = []
    added_categories: list[int] = []

    monkeypatch.setattr(
        "ebay_watchlist.cli.management.SellerRepository.add_seller",
        staticmethod(lambda seller_name: added_sellers.append(seller_name)),
    )
    monkeypatch.setattr(
        "ebay_watchlist.cli.management.CategoryRepository.add_category",
        staticmethod(lambda category_id: added_categories.append(category_id)),
    )
    monkeypatch.setattr(
        "ebay_watchlist.cli.management.SellerRepository.get_enabled_sellers",
        staticmethod(lambda: ["alice_shop"]),
    )
    monkeypatch.setattr(
        "ebay_watchlist.cli.management.CategoryRepository.get_enabled_categories",
        staticmethod(lambda: [619]),
    )

    add_seller_result = runner.invoke(app, ["config", "add-seller", "alice_shop"])
    add_category_result = runner.invoke(app, ["config", "add-category", "619"])
    list_sellers_result = runner.invoke(app, ["config", "list-sellers"])
    list_categories_result = runner.invoke(app, ["config", "list-categories"])

    assert add_seller_result.exit_code == 0
    assert add_category_result.exit_code == 0
    assert list_sellers_result.exit_code == 0
    assert list_categories_result.exit_code == 0
    assert added_sellers == ["alice_shop"]
    assert added_categories == [619]
    assert "Enabled sellers: ['alice_shop']" in list_sellers_result.stdout
    assert "Enabled categories: [619]" in list_categories_result.stdout


def test_load_defaults_adds_seed_sellers_and_categories(monkeypatch):
    added_sellers: list[str] = []
    added_categories: list[int] = []

    monkeypatch.setattr(
        "ebay_watchlist.cli.management.SellerRepository.add_seller",
        staticmethod(lambda seller_name: added_sellers.append(seller_name)),
    )
    monkeypatch.setattr(
        "ebay_watchlist.cli.management.CategoryRepository.add_category",
        staticmethod(lambda category_id: added_categories.append(category_id)),
    )

    result = runner.invoke(app, ["config", "load-defaults"])

    assert result.exit_code == 0
    assert len(added_sellers) == 7
    assert "bhf_shops" in added_sellers
    assert added_categories == [CATEGORY_MUSICAL_INSTRUMENTS_AND_DJ_EQUIPMENT]
