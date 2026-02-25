from pathlib import Path

import pytest

from ebay_watchlist.db.config import configure_database, database
from ebay_watchlist.db.models import (
    Item,
    ItemNote,
    ItemState,
    WatchedCategory,
    WatchedSeller,
)
from ebay_watchlist.settings import load_settings


@pytest.fixture()
def temp_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "test.sqlite3"
    monkeypatch.setenv("DATABASE_URL", str(db_path))
    configure_database(load_settings())
    database.connect(reuse_if_open=True)
    database.create_tables(
        [Item, ItemState, ItemNote, WatchedSeller, WatchedCategory], safe=True
    )
    yield database
    if not database.is_closed():
        database.drop_tables(
            [ItemNote, ItemState, Item, WatchedSeller, WatchedCategory], safe=True
        )
        database.close()
