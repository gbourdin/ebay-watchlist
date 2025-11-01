import os
from datetime import datetime
from time import sleep

import typer
from dotenv import load_dotenv

from ebay_watchlist.cli.display_utils import display_db_items, print_with_timestamp
from ebay_watchlist.cli.management import management_app
from ebay_watchlist.db.config import database
from ebay_watchlist.db.repositories import (
    CategoryRepository,
    ItemRepository,
    SellerRepository,
)
from ebay_watchlist.ebay.api import EbayAPI
from ebay_watchlist.web.app import create_app

app = typer.Typer(no_args_is_help=True)
app.add_typer(management_app, name="config", help="Database configuration commands")


@app.command()
def fetch_updates(limit: int = 100):
    """
    Gets the latest items for every configured seller and category.
    Prints the newly inserted items to the terminal
    """
    EBAY_CLIENT_ID = os.getenv("EBAY_CLIENT_ID")
    EBAY_CLIENT_SECRET = os.getenv("EBAY_CLIENT_SECRET")
    EBAY_MARKETPLACE_ID = os.getenv("EBAY_MARKETPLACE_ID", "EBAY_GB")

    run_start_date = datetime.now()
    api = EbayAPI(EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_MARKETPLACE_ID)
    watched_sellers = SellerRepository.get_enabled_sellers()
    enabled_categories = CategoryRepository.get_enabled_categories()

    for category_id in enabled_categories:
        items = api.get_latest_items_for_sellers(
            seller_names=watched_sellers,
            category_id=category_id,
            limit=limit,
        )

        for item in items:
            ItemRepository.create_or_update_item_from_ebay_item_dto(item, category_id)

    created_items = ItemRepository.get_items_created_after_datetime(run_start_date)
    print_with_timestamp(
        f"[bold green]:heavy_check_mark:[/bold green][bold]{len(created_items)}[/bold] new items inserted"
    )

    if created_items:
        display_db_items(created_items)


@app.command()
def show_latest_items(limit: int = 50, category: int | None = None):
    """
    Display the latest {limit} items to the terminal.
    If a category name is provided, only items from that category will be displayed.
    """
    if category:
        display_db_items(
            ItemRepository.get_latest_items_for_category(
                category_id=category, limit=limit
            )
        )
    else:
        display_db_items(ItemRepository.get_latest_items(limit=limit))


@app.command()
def run_loop():
    """
    Daemon mode. Runs in a loop fetching updates every 10 minutes
    """
    while True:
        try:
            fetch_updates()
            sleep(600)
        except KeyboardInterrupt:
            print_with_timestamp(
                "[bold yellow]:warning:[/bold yellow] User interrupted."
            )
            break
    typer.Exit()


@app.command()
def run_flask(host: str | None = None, port: int | None = None, debug: bool = False):
    flask_app = create_app()
    flask_app.run(host=host, port=port, debug=debug)


def main():
    database.connect()
    load_dotenv()
    app()
    database.close()


if __name__ == "__main__":
    main()
