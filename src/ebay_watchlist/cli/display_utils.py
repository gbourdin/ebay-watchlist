from datetime import datetime
from typing import Any

import humanize
from rich import print
from rich.console import Console
from rich.table import Table

from ebay_watchlist.db.models import Item
from ebay_watchlist.ebay.dtos import EbayItem


def _format_price(
    bid_price: Any,
    bid_currency: Any,
    fallback_price: Any,
    fallback_currency: Any,
) -> str:
    if bid_price is not None:
        return f"{bid_price} {bid_currency or ''}".strip()
    if fallback_price is not None:
        return f"{fallback_price} {fallback_currency or ''}".strip()
    return "-"


def format_naturaltime(value: Any) -> str:
    if isinstance(value, datetime):
        return humanize.naturaltime(value)
    return "-"


def display_db_items(items: list[Item]):
    console = Console()
    table = Table("Title", "Price", "Bids", "Seller", "Link", "Posted", "End Date")
    for item in items:
        table.add_row(
            str(item.title),
            _format_price(
                item.current_bid_price,
                item.current_bid_price_currency,
                item.price,
                item.price_currency,
            ),
            str(item.bid_count),
            str(item.seller_name),
            str(item.web_url),
            format_naturaltime(item.creation_date),
            format_naturaltime(item.end_date),
        )

    console.print(table)


def display_items(items: list[EbayItem]):
    console = Console()
    table = Table("Title", "Price", "Bids", "Seller", "Link", "Posted", "End Date")
    for item in items:
        current_price = item.current_bid_price.value if item.current_bid_price else None
        current_currency = (
            item.current_bid_price.currency if item.current_bid_price else None
        )
        fallback_price = item.price.value if item.price else None
        fallback_currency = item.price.currency if item.price else None
        table.add_row(
            item.title,
            _format_price(
                current_price,
                current_currency,
                fallback_price,
                fallback_currency,
            ),
            str(item.bid_count),
            item.seller.username,
            item.web_url,
            humanize.naturaltime(item.creation_date),
            humanize.naturaltime(item.end_date),
        )

    console.print(table)


def print_with_timestamp(message: str):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] " + message)
