from datetime import datetime
from decimal import Decimal
from urllib.parse import urljoin, urlparse

from pydantic import BaseModel, field_validator


class EbayPrice(BaseModel):
    value: Decimal
    currency: str


class CurrentBidPrice(BaseModel):
    value: Decimal
    currency: str


class EbaySeller(BaseModel):
    username: str
    feedbackPercentage: float
    feedbackScore: int


class EbayCategory(BaseModel):
    categoryName: str
    categoryId: int


class EbayItem(BaseModel):
    item_id: str
    title: str
    main_category: int | None
    categories: list[EbayCategory]
    image: str | None
    seller: EbaySeller
    condition: str | None
    shipping_options: list[dict] | None
    buying_options: list[str]
    price: EbayPrice | None
    current_bid_price: CurrentBidPrice | None
    bid_count: int | None
    web_url: str
    origin_date: datetime
    creation_date: datetime
    end_date: datetime

    @field_validator("web_url")
    @classmethod
    def format_web_url(cls, web_url: str):
        return urljoin(web_url, urlparse(web_url).path)
