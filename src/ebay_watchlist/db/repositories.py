from datetime import datetime

from peewee import DoesNotExist, fn

from ebay_watchlist.db.models import Item, WatchedCategory, WatchedSeller
from ebay_watchlist.ebay.dtos import EbayItem


class ItemRepository:
    @staticmethod
    def _build_filtered_query(
        seller_names: list[str] | None = None,
        category_names: list[str] | None = None,
        scraped_category_ids: list[int] | None = None,
        search_query: str | None = None,
    ):
        query = Item.select()

        if seller_names:
            query = query.where(Item.seller_name.in_(seller_names))

        if category_names:
            query = query.where(Item.category_name.in_(category_names))

        if scraped_category_ids:
            query = query.where(Item.scraped_category_id.in_(scraped_category_ids))

        if search_query:
            query = query.where(Item.title.contains(search_query))

        return query

    @staticmethod
    def get_filtered_items(
        seller_names: list[str] | None = None,
        category_names: list[str] | None = None,
        scraped_category_ids: list[int] | None = None,
        search_query: str | None = None,
        sort: str = "newest",
        limit: int = 50,
        offset: int = 0,
    ) -> list[Item]:
        query = ItemRepository._build_filtered_query(
            seller_names=seller_names,
            category_names=category_names,
            scraped_category_ids=scraped_category_ids,
            search_query=search_query,
        )

        if sort == "ending_soon":
            query = query.where(Item.end_date >= datetime.now())
            query = query.order_by(Item.end_date.asc())
        elif sort == "price_low":
            query = query.order_by(Item.current_bid_price.asc())
        elif sort == "price_high":
            query = query.order_by(Item.current_bid_price.desc())
        else:
            query = query.order_by(Item.creation_date.desc())

        return query.offset(offset).limit(limit)

    @staticmethod
    def count_filtered_items(
        seller_names: list[str] | None = None,
        category_names: list[str] | None = None,
        scraped_category_ids: list[int] | None = None,
        search_query: str | None = None,
        sort: str = "newest",
    ) -> int:
        query = ItemRepository._build_filtered_query(
            seller_names=seller_names,
            category_names=category_names,
            scraped_category_ids=scraped_category_ids,
            search_query=search_query,
        )
        if sort == "ending_soon":
            query = query.where(Item.end_date >= datetime.now())
        return query.count()

    @staticmethod
    def get_distinct_seller_names() -> list[str]:
        query = (
            Item.select(Item.seller_name)
            .distinct()
            .order_by(Item.seller_name.asc())
        )
        return [str(item.seller_name) for item in query if item.seller_name]

    @staticmethod
    def get_distinct_category_names(
        scraped_category_ids: list[int] | None = None,
    ) -> list[str]:
        query = Item.select(Item.category_name)
        if scraped_category_ids:
            query = query.where(Item.scraped_category_id.in_(scraped_category_ids))
        query = query.distinct().order_by(Item.category_name.asc())
        return [str(item.category_name) for item in query if item.category_name]

    @staticmethod
    def get_distinct_scraped_category_ids() -> list[int]:
        query = (
            Item.select(Item.scraped_category_id)
            .distinct()
            .order_by(Item.scraped_category_id.asc())
        )
        return [int(item.scraped_category_id) for item in query]

    @staticmethod
    def get_scraped_category_suggestions() -> list[tuple[int, str]]:
        query = (
            Item.select(
                Item.scraped_category_id,
                fn.MIN(Item.category_name).alias("category_label"),
            )
            .group_by(Item.scraped_category_id)
            .order_by(Item.scraped_category_id.asc())
        )
        return [
            (
                int(item.scraped_category_id),
                str(getattr(item, "category_label")),
            )
            for item in query
        ]

    @staticmethod
    def get_category_name_by_id(category_id: int) -> str | None:
        item = (
            Item.select(Item.category_name)
            .where(Item.category_id == category_id)
            .order_by(Item.creation_date.desc())
            .first()
        )
        if item is None:
            return None
        return str(item.category_name)

    @staticmethod
    def create_or_update_item_from_ebay_item_dto(
        item_dto: EbayItem, scraped_category_id: int
    ) -> Item:
        db_item = Item.get_or_none(item_id=item_dto.item_id)

        force_insert = False
        if db_item is None:
            db_item = Item()
            force_insert = True

        db_item.item_id = item_dto.item_id
        db_item.title = item_dto.title

        # eBay payloads can omit or mismatch category ids; keep writes resilient.
        resolved_category_id = item_dto.main_category
        if resolved_category_id is None:
            if item_dto.categories:
                resolved_category_id = item_dto.categories[0].categoryId
            else:
                resolved_category_id = scraped_category_id

        db_item.category_id = int(resolved_category_id)

        if item_dto.main_category is None and item_dto.categories:
            db_item.category_name = item_dto.categories[0].categoryName
        else:
            db_item.category_name = next(
                (
                    category.categoryName
                    for category in item_dto.categories
                    if category.categoryId == db_item.category_id
                ),
                "Unknown",
            )

        db_item.scraped_category_id = scraped_category_id
        db_item.image_url = item_dto.image
        db_item.seller_name = item_dto.seller.username
        db_item.condition = item_dto.condition
        db_item.shipping_options = item_dto.shipping_options
        db_item.buying_options = item_dto.buying_options
        if item_dto.price:
            db_item.price = item_dto.price.value
            db_item.price_currency = item_dto.price.currency
        if item_dto.current_bid_price:
            db_item.current_bid_price = item_dto.current_bid_price.value
            db_item.current_bid_price_currency = item_dto.current_bid_price.currency

        db_item.bid_count = item_dto.bid_count or 0
        db_item.web_url = item_dto.web_url

        # SQLite doesn't support timezone aware timestamps, the following is a bit hacky
        # transforming aware datetimes to naive. It works because it's all UTC
        db_item.origin_date = item_dto.origin_date.replace(tzinfo=None)
        db_item.creation_date = item_dto.creation_date.replace(tzinfo=None)
        db_item.end_date = item_dto.end_date.replace(tzinfo=None)

        db_item.db_update_date = datetime.now()

        db_item.save(force_insert=force_insert)

        return db_item

    @staticmethod
    def get_items_created_after_datetime(start_datetime: datetime) -> list[Item]:
        # TODO: Maybe return DTOs
        return (
            Item.select()
            .where(Item.db_creation_date >= start_datetime)
            .order_by(Item.creation_date.desc())
        )

    @staticmethod
    def get_latest_items(limit: int = 50) -> list[Item]:
        # TODO: Maybe return DTOs
        return Item.select().order_by(Item.creation_date.desc()).limit(limit)

    @staticmethod
    def get_latest_items_for_scraped_category(
        category_id: int, limit: int = 50
    ) -> list[Item]:
        """
        The scraped category is usually a parent category where the actual
        item's category may be a few levels down the tree.

        This filter is intended to be used to get items in the parent category
        """
        return (
            Item.select()
            .where(Item.scraped_category_id == category_id)
            .order_by(Item.creation_date.desc())
            .limit(limit)
        )

    @staticmethod
    def get_latest_items_for_category(category_id: int, limit: int = 50) -> list[Item]:
        """
        The scraped category is usually a parent category where the actual
        item's category may be a few levels down the tree.

        This filter is intended to be used to get items in the leaf category
        """
        return (
            Item.select()
            .where(Item.category_id == category_id)
            .order_by(Item.creation_date.desc())
            .limit(limit)
        )

    @staticmethod
    def get_latest_items_for_seller(seller_name: str, limit: int = 50) -> list[Item]:
        return (
            Item.select()
            .where(Item.seller_name == seller_name)
            .order_by(Item.creation_date.desc())
            .limit(limit)
        )

    @staticmethod
    def delete_items_ended_before(cutoff: datetime) -> int:
        return Item.delete().where(Item.end_date < cutoff).execute()


class SellerRepository:
    @staticmethod
    def add_seller(seller_name: str):
        try:
            db_seller = WatchedSeller.get(username=seller_name)
        except DoesNotExist:
            db_seller = WatchedSeller(username=seller_name)

        db_seller.enabled = True
        db_seller.save()

    @staticmethod
    def get_enabled_sellers() -> list[str]:
        return [
            seller.username
            for seller in WatchedSeller.select().where(WatchedSeller.enabled)
        ]

    @staticmethod
    def remove_seller(seller_name: str):
        try:
            db_seller = WatchedSeller.get(username=seller_name)
        except DoesNotExist:
            return

        db_seller.delete_instance()


class CategoryRepository:
    @staticmethod
    def add_category(category_id: int):
        try:
            db_category = WatchedCategory.get(category_id=category_id)
        except DoesNotExist:
            db_category = WatchedCategory(category_id=category_id)

        db_category.enabled = True
        db_category.save()

    @staticmethod
    def get_enabled_categories() -> list[int]:
        return [
            category.category_id
            for category in WatchedCategory.select().where(WatchedCategory.enabled)
        ]

    @staticmethod
    def disable_category(category_id: int):
        try:
            db_category = WatchedCategory.get(category_id=category_id)
        except DoesNotExist:
            return

        db_category.enabled = False
        db_category.save()
