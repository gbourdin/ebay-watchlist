export type ItemsSort =
  | "newest"
  | "ending_soon_active"
  | "price_low"
  | "price_high"
  | "bids_desc";

export type ItemsView = "table" | "hybrid" | "cards";

export interface ItemRow {
  item_id: string;
  title: string;
  image_url: string;
  price: number;
  currency: string;
  bids: number;
  seller: string;
  category: string;
  posted_at: string;
  ends_at: string;
  web_url: string;
  hidden: boolean;
  favorite: boolean;
  note_text: string | null;
  note_created_at: string | null;
  note_last_modified: string | null;
}

export interface ItemsResponse {
  items: ItemRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  sort: ItemsSort;
}

export interface Suggestion {
  value: string;
  label: string;
}

export interface SuggestionsResponse {
  items: Suggestion[];
}

export interface ItemNoteResponse {
  item_id: string;
  note_text: string | null;
  note_created_at: string | null;
  note_last_modified: string | null;
}

export interface WatchedCategory {
  id: number;
  name: string;
}

export interface WatchlistResponse {
  sellers: string[];
  categories: WatchedCategory[];
  main_category_options: string[];
}

export interface WatchlistCategorySuggestion {
  id: string;
  name: string;
  path: string;
}

export interface WatchlistCategorySuggestionsResponse {
  suggestions: WatchlistCategorySuggestion[];
}

export interface AnalyticsMetricSnapshot {
  total_items: number;
  active_items: number;
  ending_soon_items: number;
  new_last_7_days: number;
  hidden_items: number;
  favorite_items: number;
}

export interface AnalyticsRankingRow {
  name: string;
  count: number;
}

export interface AnalyticsDistributionRow {
  label: string;
  count: number;
}

export interface AnalyticsDistributions {
  posted_by_month: AnalyticsDistributionRow[];
  posted_by_weekday: AnalyticsDistributionRow[];
  posted_by_hour: AnalyticsDistributionRow[];
}

export interface AnalyticsResponse {
  metrics: AnalyticsMetricSnapshot;
  top_sellers: AnalyticsRankingRow[];
  top_categories: AnalyticsRankingRow[];
  distributions: AnalyticsDistributions;
}

export async function fetchItems(queryString: string): Promise<ItemsResponse> {
  const response = await fetch(`/api/v1/items${queryString ? `?${queryString}` : ""}`);
  if (!response.ok) {
    throw new Error(`items fetch failed: ${response.status}`);
  }
  return (await response.json()) as ItemsResponse;
}

export async function fetchSellerSuggestions(query: string): Promise<SuggestionsResponse> {
  const response = await fetch(`/api/v1/suggestions/sellers?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`seller suggestions failed: ${response.status}`);
  }
  return (await response.json()) as SuggestionsResponse;
}

export async function fetchCategorySuggestions(
  query: string,
  mainCategories: string[]
): Promise<SuggestionsResponse> {
  const params = new URLSearchParams();
  params.set("q", query);
  for (const mainCategory of mainCategories) {
    params.append("main_category", mainCategory);
  }

  const response = await fetch(`/api/v1/suggestions/categories?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`category suggestions failed: ${response.status}`);
  }
  return (await response.json()) as SuggestionsResponse;
}

export async function toggleFavorite(itemId: string, value: boolean): Promise<void> {
  const response = await fetch(`/api/v1/items/${encodeURIComponent(itemId)}/favorite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });

  if (!response.ok) {
    throw new Error(`favorite update failed: ${response.status}`);
  }
}

export async function toggleHidden(itemId: string, value: boolean): Promise<void> {
  const response = await fetch(`/api/v1/items/${encodeURIComponent(itemId)}/hide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });

  if (!response.ok) {
    throw new Error(`hidden update failed: ${response.status}`);
  }
}

export async function refreshItem(itemId: string): Promise<ItemRow> {
  const response = await fetch(`/api/v1/items/${encodeURIComponent(itemId)}/refresh`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`refresh failed: ${response.status}`);
  }

  const payload = (await response.json()) as { item: ItemRow };
  return payload.item;
}

export async function updateItemNote(
  itemId: string,
  noteText: string
): Promise<ItemNoteResponse> {
  const response = await fetch(`/api/v1/items/${encodeURIComponent(itemId)}/note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note_text: noteText }),
  });

  if (!response.ok) {
    throw new Error(`note update failed: ${response.status}`);
  }

  return (await response.json()) as ItemNoteResponse;
}

export async function fetchWatchlist(): Promise<WatchlistResponse> {
  const response = await fetch("/api/v1/watchlist");
  if (!response.ok) {
    throw new Error(`watchlist fetch failed: ${response.status}`);
  }
  return (await response.json()) as WatchlistResponse;
}

export async function addWatchedSeller(sellerName: string): Promise<void> {
  const response = await fetch("/api/v1/watchlist/sellers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seller_name: sellerName }),
  });
  if (!response.ok) {
    throw new Error(`add seller failed: ${response.status}`);
  }
}

export async function removeWatchedSeller(sellerName: string): Promise<void> {
  const response = await fetch(
    `/api/v1/watchlist/sellers/${encodeURIComponent(sellerName)}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    throw new Error(`remove seller failed: ${response.status}`);
  }
}

export async function addWatchedCategory(input: {
  categoryId?: number;
  categoryName?: string;
}): Promise<void> {
  const payload: { category_id?: number; category_name?: string } = {};
  if (input.categoryId !== undefined) {
    payload.category_id = input.categoryId;
  }
  if (input.categoryName) {
    payload.category_name = input.categoryName;
  }

  const response = await fetch("/api/v1/watchlist/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`add category failed: ${response.status}`);
  }
}

export async function removeWatchedCategory(categoryId: number): Promise<void> {
  const response = await fetch(`/api/v1/watchlist/categories/${categoryId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`remove category failed: ${response.status}`);
  }
}

export async function fetchWatchlistCategorySuggestions(
  query: string
): Promise<WatchlistCategorySuggestionsResponse> {
  const response = await fetch(
    `/api/v1/watchlist/category-suggestions?q=${encodeURIComponent(query)}`
  );
  if (!response.ok) {
    throw new Error(`watchlist category suggestions failed: ${response.status}`);
  }
  return (await response.json()) as WatchlistCategorySuggestionsResponse;
}

export async function fetchAnalyticsSnapshot(): Promise<AnalyticsResponse> {
  const response = await fetch("/api/v1/analytics");
  if (!response.ok) {
    throw new Error(`analytics fetch failed: ${response.status}`);
  }
  return (await response.json()) as AnalyticsResponse;
}
