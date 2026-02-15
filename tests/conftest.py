from pathlib import Path

import pytest

from ebay_watchlist.db.config import database
from ebay_watchlist.db.models import (
    Item,
    ItemNote,
    ItemState,
    WatchedCategory,
    WatchedSeller,
)


@pytest.fixture()
def temp_db(tmp_path: Path):
    db_path = tmp_path / "test.sqlite3"
    database.init(str(db_path))
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
