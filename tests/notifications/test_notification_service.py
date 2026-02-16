from types import SimpleNamespace

from python_ntfy import MessageSendError

from ebay_watchlist.notifications import service as notification_service_module
from ebay_watchlist.notifications.service import NotificationService


class FailingClient:
    def send(self, **kwargs):
        raise MessageSendError("boom")


def test_send_individual_notification_handles_send_error():
    service = NotificationService.__new__(NotificationService)
    service._client = FailingClient()

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

    caplog.set_level("WARNING", logger="ebay_watchlist.notifications.service")
    service.notify_new_items([SimpleNamespace(seller_name="alice")])

    assert "NTFY_TOPIC_ID is not configured; skipping notifications" in caplog.text


def test_notify_new_items_dispatches_individual_and_grouped_paths(monkeypatch):
    service = NotificationService.__new__(NotificationService)
    service._client = object()

    calls = {"individual": [], "grouped": []}
    monkeypatch.setattr(
        service,
        "send_individual_notification",
        lambda item: calls["individual"].append(item.seller_name),
    )
    monkeypatch.setattr(
        service,
        "send_grouped_notification",
        lambda items: calls["grouped"].append([item.seller_name for item in items]),
    )

    small_batch = [SimpleNamespace(seller_name="alice"), SimpleNamespace(seller_name="bob")]
    large_batch = [
        SimpleNamespace(seller_name="alice"),
        SimpleNamespace(seller_name="alice"),
        SimpleNamespace(seller_name="bob"),
    ]

    service.notify_new_items(small_batch)
    service.notify_new_items(large_batch)

    assert calls["individual"] == ["alice", "bob"]
    assert calls["grouped"] == [["alice", "alice", "bob"]]


def test_send_individual_notification_includes_web_links(monkeypatch):
    sent: dict[str, object] = {}

    class CapturingClient:
        def send(self, **kwargs):
            sent.update(kwargs)

    monkeypatch.setattr(notification_service_module, "WEBSERVICE_URL", "https://watch.local")
    monkeypatch.setattr(
        notification_service_module,
        "ViewAction",
        lambda label, url: {"label": label, "url": url},
    )

    service = NotificationService.__new__(NotificationService)
    service._client = CapturingClient()

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

    monkeypatch.setattr(notification_service_module, "WEBSERVICE_URL", "https://watch.local")
    monkeypatch.setattr(
        notification_service_module,
        "ViewAction",
        lambda label, url: {"label": label, "url": url},
    )

    service = NotificationService.__new__(NotificationService)
    service._client = CapturingClient()

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

    caplog.set_level("ERROR", logger="ebay_watchlist.notifications.service")
    service.send_grouped_notification(
        [SimpleNamespace(seller_name="alice"), SimpleNamespace(seller_name="bob")]
    )

    assert "Failed to send grouped notification." in caplog.text
