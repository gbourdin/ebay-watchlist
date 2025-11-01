import humanize
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich import print

from ebay_watchlist.db.models import Item
from ebay_watchlist.ebay.dtos import EbayItem


def display_db_items(items: list[Item]):
    console = Console()
    table = Table("Title", "Price", "Bids", "Seller", "Link", "Posted", "End Date")
    for item in items:
        table.add_row(
            item.title,
            f"{item.current_bid_price} {item.current_bid_price_currency}",
            str(item.bid_count),
            item.seller_name,
            item.web_url,
            humanize.naturaltime(item.creation_date),
            humanize.naturaltime(item.end_date),
        )

    console.print(table)


def display_items(items: list[EbayItem]):
    console = Console()
    table = Table("Title", "Price", "Bids", "Seller", "Link", "Posted", "End Date")
    for item in items:
        table.add_row(
            item.title,
            f"{item.current_bid_price.value} {item.current_bid_price.currency}",
            str(item.bid_count),
            item.seller.username,
            item.web_url,
            humanize.naturaltime(item.creation_date),
            humanize.naturaltime(item.end_date),
        )

    console.print(table)


def print_with_timestamp(message: str):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] " + message)
