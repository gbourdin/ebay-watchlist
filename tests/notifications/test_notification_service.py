from types import SimpleNamespace

from python_ntfy import MessageSendError

from ebay_watchlist.notifications import service as notification_service_module
from ebay_watchlist.notifications.service import NotificationService
from ebay_watchlist.settings import Settings


class FailingClient:
    def send(self, **kwargs):
        raise MessageSendError("boom")


def _settings(
    webservice_url: str | None = None,
    ntfy_topic_id: str | None = None,
) -> Settings:
    return Settings(
        database_url=":memory:",
        ebay_client_id=None,
        ebay_client_secret=None,
        ebay_marketplace_id="EBAY_GB",
        enable_notifications=False,
        ntfy_topic_id=ntfy_topic_id,
        webservice_url=webservice_url,
    )


def test_notification_service_uses_settings_for_topic():
    service = NotificationService(settings=_settings(ntfy_topic_id="watchlist-topic"))

    assert service._client is not None


def test_send_individual_notification_handles_send_error():
    service = NotificationService.__new__(NotificationService)
    service._client = FailingClient()
    service._settings = _settings()

    item = SimpleNamespace(
        seller_name="alice",
        current_bid_price=None,
        current_bid_price_currency=None,
        price=12.34,
        price_currency="GBP",
        title="Vintage synth",
        web_url="https://example.com/item",
    )

    service.send_individual_notification(item)


def test_notify_new_items_warns_when_topic_is_not_configured(caplog):
    service = NotificationService.__new__(NotificationService)
    service._client = None
    service._settings = _settings()

    caplog.set_level("WARNING", logger="ebay_watchlist.notifications.service")
    service.notify_new_items([SimpleNamespace(seller_name="alice")])

    assert "NTFY_TOPIC_ID is not configured; skipping notifications" in caplog.text


def _build_item(seller_name: str):
    return SimpleNamespace(
        seller_name=seller_name,
        current_bid_price=15.5,
        current_bid_price_currency="GBP",
        price=12.0,
        price_currency="GBP",
        title=f"{seller_name} item",
        web_url=f"https://example.com/{seller_name}",
    )


def test_notify_new_items_uses_individual_for_small_batches_and_grouped_for_large():
    sent_messages: list[dict] = []

    class CapturingClient:
        def send(self, **kwargs):
            sent_messages.append(kwargs)

    service = NotificationService.__new__(NotificationService)
    service._client = CapturingClient()
    service._settings = _settings()

    service.notify_new_items([_build_item("alice"), _build_item("bob")])
    assert len(sent_messages) == 2
    assert {entry["title"] for entry in sent_messages} == {
        "New item from alice",
        "New item from bob",
    }

    sent_messages.clear()
    service.notify_new_items([_build_item("alice"), _build_item("alice"), _build_item("bob")])
    assert len(sent_messages) == 1
    assert sent_messages[0]["title"] == "3 new items published"


def test_send_individual_notification_includes_web_links(monkeypatch):
    sent: dict[str, object] = {}

    class CapturingClient:
        def send(self, **kwargs):
            sent.update(kwargs)

    monkeypatch.setattr(
        notification_service_module,
        "ViewAction",
        lambda label, url: {"label": label, "url": url},
    )

    service = NotificationService.__new__(NotificationService)
    service._client = CapturingClient()
    service._settings = _settings(webservice_url="https://watch.local")

    item = SimpleNamespace(
        seller_name="alice",
        current_bid_price=15.5,
        current_bid_price_currency="GBP",
        price=12.0,
        price_currency="GBP",
        title="Vintage synth",
        web_url="https://example.com/item",
    )

    service.send_individual_notification(item)

    assert sent["title"] == "New item from alice"
    assert "Current Price: 15.5 GBP" in str(sent["message"])
    assert sent["tags"] == ["rotating_light"]
    assert sent["actions"] == [
        {"label": "View on ebay", "url": "https://example.com/item"},
        {"label": "Items by alice", "url": "https://watch.local/sellers/alice"},
    ]


def test_send_grouped_notification_aggregates_by_seller(monkeypatch):
    sent: dict[str, object] = {}

    class CapturingClient:
        def send(self, **kwargs):
            sent.update(kwargs)

    monkeypatch.setattr(
        notification_service_module,
        "ViewAction",
        lambda label, url: {"label": label, "url": url},
    )

    service = NotificationService.__new__(NotificationService)
    service._client = CapturingClient()
    service._settings = _settings(webservice_url="https://watch.local")

    items = [
        SimpleNamespace(seller_name="alice"),
        SimpleNamespace(seller_name="alice"),
        SimpleNamespace(seller_name="bob"),
    ]

    service.send_grouped_notification(items)

    assert sent["title"] == "3 new items published"
    assert "2 items from: alice" in str(sent["message"])
    assert "1 items from: bob" in str(sent["message"])
    assert sent["actions"] == [{"label": "View all items", "url": "https://watch.local"}]


def test_send_grouped_notification_handles_send_error(caplog):
    service = NotificationService.__new__(NotificationService)
    service._client = FailingClient()
    service._settings = _settings()

    caplog.set_level("ERROR", logger="ebay_watchlist.notifications.service")
    service.send_grouped_notification(
        [SimpleNamespace(seller_name="alice"), SimpleNamespace(seller_name="bob")]
    )

    assert "Failed to send grouped notification." in caplog.text
