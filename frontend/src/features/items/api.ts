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
  ends_in: string;
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
