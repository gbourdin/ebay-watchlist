import type { ItemsQueryState, ItemsRouteMode } from "./query-state";

export interface SavedFilterView {
  id: string;
  name: string;
  route_mode: ItemsRouteMode;
  query: Omit<ItemsQueryState, "page" | "page_size">;
}

export interface WatchedSearch {
  id: string;
  name: string;
  q: string;
  main_category: string[];
  category: string[];
  max_price: string | null;
}

const SAVED_VIEWS_STORAGE_KEY = "ebay-watchlist.saved-filter-views";
const WATCHED_SEARCHES_STORAGE_KEY = "ebay-watchlist.watched-searches";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function savedViewIdFromName(name: string): string {
  const slug = slugify(name);
  return `saved-view:${slug || "view"}`;
}

export function watchedSearchIdFromName(name: string): string {
  const slug = slugify(name);
  return `watched-search:${slug || "search"}`;
}

function safeJsonParse(raw: string | null): unknown {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadSavedFilterViews(): SavedFilterView[] {
  if (typeof window === "undefined") {
    return [];
  }

  const parsed = safeJsonParse(window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY));
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((value): value is SavedFilterView => {
    if (value === null || typeof value !== "object") {
      return false;
    }

    const candidate = value as Partial<SavedFilterView>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      (candidate.route_mode === "all" || candidate.route_mode === "favorites") &&
      candidate.query !== undefined
    );
  });
}

export function saveSavedFilterViews(savedViews: SavedFilterView[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(savedViews));
}

export function loadWatchedSearches(): WatchedSearch[] {
  if (typeof window === "undefined") {
    return [];
  }

  const parsed = safeJsonParse(window.localStorage.getItem(WATCHED_SEARCHES_STORAGE_KEY));
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((value): value is WatchedSearch => {
    if (value === null || typeof value !== "object") {
      return false;
    }

    const candidate = value as Partial<WatchedSearch>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.q === "string" &&
      Array.isArray(candidate.main_category) &&
      Array.isArray(candidate.category) &&
      (typeof candidate.max_price === "string" || candidate.max_price === null)
    );
  });
}

export function saveWatchedSearches(watchedSearches: WatchedSearch[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(WATCHED_SEARCHES_STORAGE_KEY, JSON.stringify(watchedSearches));
}

