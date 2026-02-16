import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  addWatchedCategory,
  addWatchedSeller,
  fetchAnalyticsSnapshot,
  fetchCategorySuggestions,
  fetchItems,
  fetchSellerSuggestions,
  fetchWatchlist,
  fetchWatchlistCategorySuggestions,
  refreshItem,
  removeWatchedCategory,
  removeWatchedSeller,
  toggleFavorite,
  toggleHidden,
  updateItemNote,
} from "./api";

function mockFetchOk(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    })
  );
}

function mockFetchError(status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({}),
    })
  );
}

async function expectApiError(call: () => Promise<unknown>, message: string) {
  await expect(call()).rejects.toThrow(message);
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("items api contract success paths", () => {
  test("fetchItems uses query string and returns parsed payload", async () => {
    const payload = { items: [], page: 1 };
    mockFetchOk(payload);

    const result = await fetchItems("q=guitar&page=2");

    expect(fetch).toHaveBeenCalledWith("/api/v1/items?q=guitar&page=2");
    expect(result).toEqual(payload);
  });

  test("fetch suggestions endpoints encode query parameters", async () => {
    const payload = { items: [{ value: "alice", label: "alice" }] };
    mockFetchOk(payload);
    const sellerResult = await fetchSellerSuggestions("alice shop");
    expect(fetch).toHaveBeenCalledWith("/api/v1/suggestions/sellers?q=alice%20shop");
    expect(sellerResult).toEqual(payload);

    mockFetchOk(payload);
    const categoryResult = await fetchCategorySuggestions("guitar amp", ["Music", "Vintage"]);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/suggestions/categories?q=guitar+amp&main_category=Music&main_category=Vintage"
    );
    expect(categoryResult).toEqual(payload);
  });

  test("item actions call expected endpoints with payloads", async () => {
    mockFetchOk({});
    await toggleFavorite("v1|123|0", true);
    expect(fetch).toHaveBeenCalledWith("/api/v1/items/v1%7C123%7C0/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: true }),
    });

    mockFetchOk({});
    await toggleHidden("v1|123|0", false);
    expect(fetch).toHaveBeenCalledWith("/api/v1/items/v1%7C123%7C0/hide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: false }),
    });
  });

  test("refreshItem and updateItemNote return parsed responses", async () => {
    const refreshed = { item: { item_id: "abc", title: "Item" } };
    mockFetchOk(refreshed);
    const refreshedItem = await refreshItem("abc");
    expect(fetch).toHaveBeenCalledWith("/api/v1/items/abc/refresh", { method: "POST" });
    expect(refreshedItem).toEqual(refreshed.item);

    const notePayload = {
      item_id: "abc",
      note_text: "max 100",
      note_created_at: "2026-02-01T10:00:00Z",
      note_last_modified: "2026-02-01T10:05:00Z",
    };
    mockFetchOk(notePayload);
    const noteResponse = await updateItemNote("abc", "max 100");
    expect(fetch).toHaveBeenCalledWith("/api/v1/items/abc/note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note_text: "max 100" }),
    });
    expect(noteResponse).toEqual(notePayload);
  });

  test("watchlist and analytics endpoints return parsed payloads", async () => {
    const watchlistPayload = {
      sellers: ["alice"],
      categories: [{ id: 619, name: "Musical Instruments" }],
      main_category_options: ["Musical Instruments"],
    };
    mockFetchOk(watchlistPayload);
    const watchlist = await fetchWatchlist();
    expect(fetch).toHaveBeenCalledWith("/api/v1/watchlist");
    expect(watchlist).toEqual(watchlistPayload);

    const analyticsPayload = {
      metrics: {
        total_items: 10,
        active_items: 9,
        ending_soon_items: 2,
        new_last_7_days: 4,
        hidden_items: 1,
        favorite_items: 3,
      },
      top_sellers: [{ name: "alice", count: 4 }],
      top_categories: [{ name: "Guitars", count: 5 }],
    };
    mockFetchOk(analyticsPayload);
    const analytics = await fetchAnalyticsSnapshot();
    expect(fetch).toHaveBeenCalledWith("/api/v1/analytics");
    expect(analytics).toEqual(analyticsPayload);
  });

  test("watchlist mutation endpoints call expected routes", async () => {
    mockFetchOk({});
    await addWatchedSeller("alice_shop");
    expect(fetch).toHaveBeenCalledWith("/api/v1/watchlist/sellers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seller_name: "alice_shop" }),
    });

    mockFetchOk({});
    await removeWatchedSeller("alice_shop");
    expect(fetch).toHaveBeenCalledWith("/api/v1/watchlist/sellers/alice_shop", {
      method: "DELETE",
    });

    mockFetchOk({});
    await addWatchedCategory({ categoryId: 619 });
    expect(fetch).toHaveBeenCalledWith("/api/v1/watchlist/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_id: 619 }),
    });

    mockFetchOk({});
    await addWatchedCategory({ categoryName: "Musical Instruments" });
    expect(fetch).toHaveBeenCalledWith("/api/v1/watchlist/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_name: "Musical Instruments" }),
    });

    mockFetchOk({});
    await removeWatchedCategory(58058);
    expect(fetch).toHaveBeenCalledWith("/api/v1/watchlist/categories/58058", {
      method: "DELETE",
    });

    const suggestionPayload = {
      suggestions: [{ id: "619", name: "Musical Instruments", path: "Root > Musical Instruments" }],
    };
    mockFetchOk(suggestionPayload);
    const suggestions = await fetchWatchlistCategorySuggestions("music shop");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/watchlist/category-suggestions?q=music%20shop"
    );
    expect(suggestions).toEqual(suggestionPayload);
  });
});

describe("items api contract error paths", () => {
  test("throws readable errors for all endpoints when response is not ok", async () => {
    mockFetchError(500);
    await expectApiError(() => fetchItems(""), "items fetch failed: 500");

    mockFetchError(501);
    await expectApiError(() => fetchSellerSuggestions("alice"), "seller suggestions failed: 501");

    mockFetchError(502);
    await expectApiError(
      () => fetchCategorySuggestions("guitar", ["Music"]),
      "category suggestions failed: 502"
    );

    mockFetchError(503);
    await expectApiError(() => toggleFavorite("1", true), "favorite update failed: 503");

    mockFetchError(504);
    await expectApiError(() => toggleHidden("1", true), "hidden update failed: 504");

    mockFetchError(505);
    await expectApiError(() => refreshItem("1"), "refresh failed: 505");

    mockFetchError(506);
    await expectApiError(() => updateItemNote("1", "note"), "note update failed: 506");

    mockFetchError(507);
    await expectApiError(() => fetchWatchlist(), "watchlist fetch failed: 507");

    mockFetchError(508);
    await expectApiError(() => addWatchedSeller("alice"), "add seller failed: 508");

    mockFetchError(509);
    await expectApiError(() => removeWatchedSeller("alice"), "remove seller failed: 509");

    mockFetchError(510);
    await expectApiError(
      () => addWatchedCategory({ categoryName: "Music" }),
      "add category failed: 510"
    );

    mockFetchError(511);
    await expectApiError(() => removeWatchedCategory(619), "remove category failed: 511");

    mockFetchError(512);
    await expectApiError(
      () => fetchWatchlistCategorySuggestions("music"),
      "watchlist category suggestions failed: 512"
    );

    mockFetchError(513);
    await expectApiError(() => fetchAnalyticsSnapshot(), "analytics fetch failed: 513");
  });
});
