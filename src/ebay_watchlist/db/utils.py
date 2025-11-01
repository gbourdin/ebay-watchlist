from ebay_watchlist.db.config import database
from ebay_watchlist.db.models import Item, WatchedCategory, WatchedSeller


def create_tables():
    database.create_tables([Item, WatchedSeller, WatchedCategory])


def drop_tables():
    database.drop_tables([Item, WatchedSeller, WatchedCategory])
