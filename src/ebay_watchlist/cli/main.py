import logging
import os
from datetime import datetime, timedelta
from time import sleep

import typer
from dotenv import load_dotenv
from peewee import OperationalError

from ebay_watchlist.cli.display_utils import display_db_items, print_with_timestamp
from ebay_watchlist.cli.management import management_app
from ebay_watchlist.db.config import configure_database, database
from ebay_watchlist.db.repositories import (
    CategoryRepository,
    ItemRepository,
    SellerRepository,
)
from ebay_watchlist.db.utils import ensure_schema_compatibility
from ebay_watchlist.ebay.api import EbayAPI
from ebay_watchlist.notifications.service import NotificationService
from ebay_watchlist.settings import load_settings
from ebay_watchlist.web.app import create_app

app = typer.Typer(no_args_is_help=True)
app.add_typer(management_app, name="config", help="Database configuration commands")
DEFAULT_CLEANUP_RETENTION_DAYS = 180
DEFAULT_CLEANUP_INTERVAL_MINUTES = 24 * 60
FETCH_INTERVAL_SECONDS = 600
DEFAULT_GUNICORN_WORKERS = 2
logger = logging.getLogger(__name__)


@app.command()
def fetch_updates(limit: int = 100):
    """
    Gets the latest items for every configured seller and category.
    Prints the newly inserted items to the terminal
    """
    settings = load_settings()
    ebay_client_id, ebay_client_secret = settings.require_ebay_credentials()

    run_start_date = datetime.now()
    api = EbayAPI(ebay_client_id, ebay_client_secret, settings.ebay_marketplace_id)
    notification_service = NotificationService(settings=settings)
    watched_sellers = SellerRepository.get_enabled_sellers()
    enabled_categories = CategoryRepository.get_enabled_categories()

    for category_id in enabled_categories:
        logger.info(
            "Fetch context: database=%s category_id=%s watched_sellers_count=%s watched_sellers=%s",
            settings.database_url,
            category_id,
            len(watched_sellers),
            watched_sellers,
        )
        items = api.get_latest_items_for_sellers(
            seller_names=watched_sellers,
            category_id=category_id,
            limit=limit,
        )
        response_sellers = sorted(
            {
                item.seller.username
                for item in items
                if getattr(getattr(item, "seller", None), "username", None)
            }
        )
        logger.info(
            "Fetch response: category_id=%s response_items_count=%s unique_sellers_count=%s unique_sellers=%s",
            category_id,
            len(items),
            len(response_sellers),
            response_sellers,
        )

        for item in items:
            ItemRepository.create_or_update_item_from_ebay_item_dto(item, category_id)

    created_items = ItemRepository.get_items_created_after_datetime(run_start_date)
    print_with_timestamp(
        f"[bold green]:heavy_check_mark:[/bold green][bold]{len(created_items)}[/bold] new items inserted"
    )

    if created_items:
        display_db_items(created_items)
        if settings.enable_notifications:
            notification_service.notify_new_items(created_items)


@app.command()
def show_latest_items(limit: int = 50, category: int | None = None):
    """
    Display the latest {limit} items to the terminal.
    If a category name is provided, only items from that category will be displayed.
    """
    if category:
        display_db_items(
            ItemRepository.get_latest_items_for_scraped_category(
                category_id=category, limit=limit
            )
        )
    else:
        display_db_items(ItemRepository.get_latest_items(limit=limit))


@app.command()
def cleanup_expired_items(retention_days: int = DEFAULT_CLEANUP_RETENTION_DAYS) -> int:
    """
    Delete items that ended more than N days ago.
    """
    if retention_days < 1:
        raise ValueError("retention_days must be at least 1")

    cutoff = datetime.now() - timedelta(days=retention_days)
    deleted = ItemRepository.delete_items_ended_before(cutoff)
    print_with_timestamp(
        f"[bold green]:heavy_check_mark:[/bold green] {deleted} expired items deleted (older than {retention_days} days)"
    )
    return deleted


@app.command()
def run_loop(
    cleanup_retention_days: int = DEFAULT_CLEANUP_RETENTION_DAYS,
    cleanup_interval_minutes: int = DEFAULT_CLEANUP_INTERVAL_MINUTES,
):
    """
    Daemon mode. Runs in a loop fetching updates every 10 minutes and
    periodically removes expired items from the DB.
    """
    if cleanup_interval_minutes < 1:
        raise ValueError("cleanup_interval_minutes must be at least 1")

    next_cleanup_at: datetime | None = None
    while True:
        try:
            fetch_updates()

            now = datetime.now()
            if next_cleanup_at is None or now >= next_cleanup_at:
                try:
                    cleanup_expired_items(retention_days=cleanup_retention_days)
                except Exception as exc:
                    print_with_timestamp(
                        f"[bold yellow]:warning:[/bold yellow] Cleanup failed: {exc}"
                    )

                next_cleanup_at = now + timedelta(minutes=cleanup_interval_minutes)

            sleep(FETCH_INTERVAL_SECONDS)
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


@app.command()
def run_gunicorn(
    host: str = "0.0.0.0",
    port: int = 5001,
    workers: int = DEFAULT_GUNICORN_WORKERS,
):
    if workers < 1:
        raise ValueError("workers must be at least 1")

    bind = f"{host}:{port}"
    os.execvp(
        "gunicorn",
        [
            "gunicorn",
            "--bind",
            bind,
            "--workers",
            str(workers),
            "ebay_watchlist.web.app:create_app()",
        ],
    )


def main():
    load_dotenv()
    settings = load_settings()
    configure_database(settings)
    database.connect(reuse_if_open=True)
    ensure_schema_compatibility()
    try:
        app()
    finally:
        try:
            database.close()
        except OperationalError:
            pass


if __name__ == "__main__":
    main()
