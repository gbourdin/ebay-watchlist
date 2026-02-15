import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";

import ItemsPage from "../ItemsPage";
import type { ItemRow } from "../api";

const sampleItem: ItemRow = {
  item_id: "1",
  title: "Vintage Telecaster",
  image_url: "https://img.example/item.jpg",
  price: 99,
  currency: "GBP",
  bids: 4,
  seller: "alice",
  category: "Electric Guitars",
  posted_at: "2025-01-01T12:00:00",
  ends_at: "2025-01-02T12:00:00",
  web_url: "https://www.ebay.com/itm/1",
  hidden: false,
  favorite: false,
  note_text: null,
  note_created_at: null,
  note_last_modified: null,
};
let rows: ItemRow[] = [sampleItem];
const { updateItemNoteMock } = vi.hoisted(() => ({ updateItemNoteMock: vi.fn() }));

let queryState = {
  seller: [],
  category: [],
  main_category: [],
  q: "",
  favorite: false,
  show_hidden: false,
  sort: "newest" as const,
  view: "table" as const,
  page: 1,
  page_size: 100,
};

const updateQuery = vi.fn(
  (
    patch:
      | Partial<typeof queryState>
      | ((prev: typeof queryState) => Partial<typeof queryState>)
  ) => {
    const nextPatch = typeof patch === "function" ? patch(queryState) : patch;
    queryState = { ...queryState, ...nextPatch };
  }
);

vi.mock("../useItemsQuery", () => ({
  useItemsQuery: () => ({
    query: queryState,
    data: {
      items: rows,
      page: 1,
      page_size: 100,
      total: rows.length,
      total_pages: 1,
      has_next: false,
      has_prev: false,
      sort: queryState.sort,
    },
    loading: false,
    error: null,
    updateQuery,
    resetQuery: vi.fn(),
  }),
}));

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return {
    ...actual,
    toggleFavorite: vi.fn().mockResolvedValue(undefined),
    toggleHidden: vi.fn().mockResolvedValue(undefined),
    updateItemNote: updateItemNoteMock.mockResolvedValue({
      item_id: "1",
      note_text: "watch this one",
      note_created_at: "2025-01-01T12:00:00",
      note_last_modified: "2025-01-01T12:05:00",
    }),
  };
});

beforeEach(() => {
  window.localStorage.clear();
  queryState = {
    seller: [],
    category: [],
    main_category: [],
    q: "",
    favorite: false,
    show_hidden: false,
    sort: "newest",
    view: "table",
    page: 1,
    page_size: 100,
  };
  rows = [sampleItem];
  updateQuery.mockClear();
  updateItemNoteMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

test("dense table is the default view", () => {
  render(<ItemsPage />);

  expect(screen.getByTestId("view-table")).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Image" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Title" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Price" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Bids" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Seller" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Posted" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Ends" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
  expect(screen.getByTestId("posted-1").textContent).not.toContain("T");
  expect(screen.getByTestId("ends-1").textContent).not.toContain("T");
  expect(screen.getByTestId("posted-1")).toHaveAttribute("title");
  expect(screen.getByTestId("ends-1")).toHaveAttribute("title");
});

test("view switcher supports dense, hybrid, and cards", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<ItemsPage />);

  expect(screen.getByTestId("view-table")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Hybrid" }));
  expect(updateQuery).toHaveBeenCalledWith({ view: "hybrid", page: 1 });
  rerender(<ItemsPage />);
  expect(screen.getByTestId("view-hybrid")).toBeInTheDocument();
  expect(screen.getByTestId("posted-1")).toHaveAttribute("title");
  expect(screen.getByTestId("ends-1")).toHaveAttribute("title");

  await user.click(screen.getByRole("button", { name: "Cards" }));
  expect(updateQuery).toHaveBeenCalledWith({ view: "cards", page: 1 });
  rerender(<ItemsPage />);
  expect(screen.getByTestId("view-cards")).toBeInTheDocument();
  expect(screen.getByTestId("posted-1")).toHaveAttribute("title");
  expect(screen.getByTestId("ends-1")).toHaveAttribute("title");
});

test("title links to ebay and row actions include favorite, hide and note", () => {
  render(<ItemsPage />);

  const titleLink = screen.getByRole("link", { name: "Vintage Telecaster" });
  expect(titleLink).toHaveAttribute("href", "https://www.ebay.com/itm/1");

  expect(screen.getByRole("button", { name: "Fav" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Note" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Notify" })).not.toBeInTheDocument();
});

test("favorite and hide actions expose persistent active state", () => {
  rows = [{ ...sampleItem, favorite: true, hidden: true }];
  render(<ItemsPage />);

  expect(screen.getByRole("button", { name: "Fav" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Hide" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("dense table images keep square shape on mobile", () => {
  render(<ItemsPage />);

  const itemImage = screen.getByRole("img", { name: "Vintage Telecaster" });
  expect(itemImage).toHaveClass("aspect-square");
});

test("view switcher provides compact icon controls on mobile", () => {
  render(<ItemsPage />);

  expect(screen.getByRole("button", { name: "Switch to table view" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Switch to hybrid view" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Switch to cards view" })).toBeInTheDocument();
});

test("note action opens editor and saves note text", async () => {
  const user = userEvent.setup();
  render(<ItemsPage />);

  await user.click(screen.getByRole("button", { name: "Note" }));
  expect(screen.getByRole("dialog", { name: "Edit item note" })).toBeInTheDocument();

  const textArea = screen.getByLabelText("Personal note");
  await user.clear(textArea);
  await user.type(textArea, "watch this one");
  await user.click(screen.getByRole("button", { name: "Save note" }));

  await waitFor(() => {
    expect(updateItemNoteMock).toHaveBeenCalledWith("1", "watch this one");
  });
});

test("dense table supports column toggles and saved presets", async () => {
  const user = userEvent.setup();
  render(<ItemsPage />);

  await user.click(screen.getByRole("button", { name: "Columns" }));
  const sellerToggle = screen.getByRole("checkbox", { name: "Seller" });
  expect(sellerToggle).toBeChecked();

  await user.click(sellerToggle);
  expect(screen.queryByRole("columnheader", { name: "Seller" })).not.toBeInTheDocument();

  const presetName = screen.getByLabelText("Preset name");
  await user.type(presetName, "No Seller");
  await user.click(screen.getByRole("button", { name: "Save preset" }));

  const presets = screen.getByLabelText("Column presets");
  expect(presets).toHaveValue("custom:no-seller");

  await user.click(screen.getByRole("checkbox", { name: "Seller" }));
  expect(screen.getByRole("columnheader", { name: "Seller" })).toBeInTheDocument();

  await user.selectOptions(presets, "custom:no-seller");
  expect(screen.queryByRole("columnheader", { name: "Seller" })).not.toBeInTheDocument();
});
