import type { ItemsSort, ItemsView } from "./api";

export interface ItemsQueryState {
  seller: string[];
  category: string[];
  main_category: string[];
  q: string;
  favorite: boolean;
  show_hidden: boolean;
  show_ended: boolean;
  last_24h: boolean;
  sort: ItemsSort;
  view: ItemsView;
  page: number;
  page_size: number;
}

export const DEFAULT_QUERY_STATE: ItemsQueryState = {
  seller: [],
  category: [],
  main_category: [],
  q: "",
  favorite: false,
  show_hidden: false,
  show_ended: false,
  last_24h: false,
  sort: "newest",
  view: "table",
  page: 1,
  page_size: 100,
};

const SORTS: Set<ItemsSort> = new Set([
  "newest",
  "ending_soon_active",
  "price_low",
  "price_high",
  "bids_desc",
]);
const VIEWS: Set<ItemsView> = new Set(["table", "hybrid", "cards"]);

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function parseQueryState(search: string): ItemsQueryState {
  const params = new URLSearchParams(search);
  const parsedSort = params.get("sort") || "newest";
  const parsedView = params.get("view") || "table";

  return {
    seller: params.getAll("seller"),
    category: params.getAll("category"),
    main_category: params.getAll("main_category"),
    q: params.get("q") || "",
    favorite: params.get("favorite") === "1",
    show_hidden: params.get("show_hidden") === "1",
    show_ended: params.get("show_ended") === "1",
    last_24h: params.get("last_24h") === "1",
    sort: SORTS.has(parsedSort as ItemsSort) ? (parsedSort as ItemsSort) : "newest",
    view: VIEWS.has(parsedView as ItemsView) ? (parsedView as ItemsView) : "table",
    page: parsePositiveInt(params.get("page"), 1),
    page_size: parsePositiveInt(params.get("page_size"), 100),
  };
}

export function serializeQueryState(state: ItemsQueryState): string {
  const params = new URLSearchParams();

  for (const seller of state.seller) {
    params.append("seller", seller);
  }
  for (const category of state.category) {
    params.append("category", category);
  }
  for (const mainCategory of state.main_category) {
    params.append("main_category", mainCategory);
  }

  if (state.q) {
    params.set("q", state.q);
  }
  if (state.favorite) {
    params.set("favorite", "1");
  }
  if (state.show_hidden) {
    params.set("show_hidden", "1");
  }
  if (state.show_ended) {
    params.set("show_ended", "1");
  }
  if (state.last_24h) {
    params.set("last_24h", "1");
  }
  if (state.sort !== "newest") {
    params.set("sort", state.sort);
  }
  if (state.view !== "table") {
    params.set("view", state.view);
  }
  if (state.page > 1) {
    params.set("page", String(state.page));
  }
  if (state.page_size !== 100) {
    params.set("page_size", String(state.page_size));
  }

  return params.toString();
}
