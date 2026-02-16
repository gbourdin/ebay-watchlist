from typer.testing import CliRunner

from ebay_watchlist.db.config import database
from ebay_watchlist.db.repositories import CategoryRepository, SellerRepository
from ebay_watchlist.cli.main import app
from ebay_watchlist.ebay.categories import (
    CATEGORY_MUSICAL_INSTRUMENTS_AND_DJ_EQUIPMENT,
)


runner = CliRunner()


def test_init_database_command_creates_tables(temp_db):
    result = runner.invoke(app, ["config", "init-database"])

    assert result.exit_code == 0
    assert "item" in database.get_tables()
    assert "watchedseller" in database.get_tables()
    assert "Successfully created all db tables" in result.stdout


def test_clean_database_force_drops_tables(temp_db):
    result = runner.invoke(app, ["config", "clean-database", "--force"])

    assert result.exit_code == 0
    assert database.get_tables() == []
    assert "Done!" in result.stdout


def test_clean_database_without_force_aborts_when_not_confirmed(temp_db):
    result = runner.invoke(app, ["config", "clean-database"], input="n\n")

    assert result.exit_code != 0
    assert "watchedseller" in database.get_tables()


def test_seller_and_category_commands_persist_with_real_repositories(temp_db):
    add_seller_result = runner.invoke(app, ["config", "add-seller", "alice_shop"])
    add_category_result = runner.invoke(app, ["config", "add-category", "619"])
    list_sellers_result = runner.invoke(app, ["config", "list-sellers"])
    list_categories_result = runner.invoke(app, ["config", "list-categories"])

    assert add_seller_result.exit_code == 0
    assert add_category_result.exit_code == 0
    assert list_sellers_result.exit_code == 0
    assert list_categories_result.exit_code == 0
    assert SellerRepository.get_enabled_sellers() == ["alice_shop"]
    assert CategoryRepository.get_enabled_categories() == [619]
    assert "Enabled sellers: ['alice_shop']" in list_sellers_result.stdout
    assert "Enabled categories: [619]" in list_categories_result.stdout


def test_load_defaults_adds_seed_sellers_and_categories(temp_db):
    result = runner.invoke(app, ["config", "load-defaults"])

    assert result.exit_code == 0
    sellers = SellerRepository.get_enabled_sellers()
    categories = CategoryRepository.get_enabled_categories()
    assert len(sellers) == 7
    assert "bhf_shops" in sellers
    assert categories == [CATEGORY_MUSICAL_INSTRUMENTS_AND_DJ_EQUIPMENT]
