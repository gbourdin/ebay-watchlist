from datetime import datetime

from peewee import (
    BooleanField,
    CharField,
    DateTimeField,
    DecimalField,
    ForeignKeyField,
    IntegerField,
    Model,
    TextField,
)
from playhouse.sqlite_ext import JSONField

from ebay_watchlist.db.config import database


class BaseModel(Model):
    class Meta:
        database = database


class Item(BaseModel):
    item_id = CharField(primary_key=True)
    title = TextField()
    scraped_category_id = IntegerField()
    category_id = IntegerField()
    category_name = CharField(max_length=512)
    image_url = TextField(null=True)
    seller_name = CharField()
    condition = TextField(null=True)
    shipping_options = JSONField(null=True)
    buying_options = JSONField(null=True)
    price = DecimalField(null=True)
    price_currency = CharField(null=True, max_length=16)
    current_bid_price = DecimalField(null=True)
    current_bid_price_currency = CharField(null=True, max_length=16)
    bid_count = IntegerField(default=0)
    web_url = TextField()
    origin_date = DateTimeField()
    creation_date = DateTimeField()
    end_date = DateTimeField(index=True)
    db_creation_date = DateTimeField(default=datetime.now, index=True)
    db_update_date = DateTimeField(default=datetime.now)


class ItemState(BaseModel):
    item = ForeignKeyField(
        Item,
        backref="state",
        column_name="item_id",
        field=Item.item_id,
        primary_key=True,
    )
    hidden = BooleanField(default=False)
    favorite = BooleanField(default=False)
    db_update_date = DateTimeField(default=datetime.now)


class WatchedSeller(BaseModel):
    username = CharField(unique=True)
    enabled = BooleanField(default=True)


class WatchedCategory(BaseModel):
    category_id = IntegerField(unique=True)
    enabled = BooleanField(default=True)
