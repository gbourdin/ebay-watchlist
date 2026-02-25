from playhouse.sqlite_ext import SqliteExtDatabase

from ebay_watchlist.settings import Settings, load_settings

database = SqliteExtDatabase(None)


def get_database_url(settings: Settings | None = None) -> str:
    active_settings = settings if settings is not None else load_settings()
    return active_settings.database_url


def configure_database(settings: Settings | None = None) -> str:
    database_url = get_database_url(settings)
    current_url = str(getattr(database, "database", "") or "")

    if current_url != database_url:
        if not database.is_closed():
            database.close()
        database.init(database_url)

    return database_url
