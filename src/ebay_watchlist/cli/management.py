import typer
from rich import print

from ebay_watchlist.db.repositories import CategoryRepository, SellerRepository
from ebay_watchlist.db.utils import create_tables, drop_tables
from ebay_watchlist.ebay.categories import CATEGORY_MUSICAL_INSTRUMENTS_AND_DJ_EQUIPMENT

management_app = typer.Typer(no_args_is_help=True)


@management_app.command()
def init_database():
    """
    Initializes the database file and creates all the tables
    """
    create_tables()
    print(
        "[bold green]:heavy_check_mark:[/bold green] Successfully created all db tables"
    )


@management_app.command()
def clean_database(force: bool = False):
    """
    Drops all the tables from the database. All configuration will be lost
    """

    if force or typer.confirm(
        "This will dump the entire database, do you wish to proceed?", abort=True
    ):
        drop_tables()
        print("[bold green]:heavy_check_mark:[/bold green] Done!")


@management_app.command()
def list_sellers():
    """
    Prints a list of all the watched sellers
    """
    print(f"Enabled sellers: {SellerRepository.get_enabled_sellers()}")


@management_app.command()
def add_seller(seller_name: str):
    """
    Adds a new seller to the watchlist. seller_name should be the ebay username for that seller
    """
    SellerRepository.add_seller(seller_name)
    print(
        f"[bold green]:heavy_check_mark:[/bold green] added {seller_name} as a watched seller"
    )


@management_app.command()
def list_categories():
    """
    Prints a list of all the watched categories
    """
    print(f"Enabled categories: {CategoryRepository.get_enabled_categories()}")


@management_app.command()
def add_category(category_id: int):
    """
    Adds a new category to the watchlist. category_id is an int.
    These are found via the commerce/taxonomy/v1/category_tree/ endpoint
    """
    CategoryRepository.add_category(category_id)
    print(
        f"[bold green]:heavy_check_mark:[/bold green] added {category_id} as a watched category"
    )


@management_app.command()
def load_defaults():
    """
    Loads my the default watched sellers and categories
    """
    watched_sellers = [
        "bhf_shops",
        "saintfrancishospice",
        "barnardos_charity",
        "sensecharityretail",
        "st.helena.colchester",
        "stoswaldshospice",
        "stroccoshospice",
    ]

    watched_categories = [
        CATEGORY_MUSICAL_INSTRUMENTS_AND_DJ_EQUIPMENT,
    ]

    for seller in watched_sellers:
        SellerRepository.add_seller(seller)

    for category in watched_categories:
        CategoryRepository.add_category(category)
