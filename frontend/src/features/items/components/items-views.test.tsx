import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";

import AppShell from "../../../components/layout/AppShell";
import type { NavbarMenuAction } from "../../../components/layout/menu-actions";
import ThemeProvider from "../../../theme/ThemeProvider";
import ItemsPage from "../ItemsPage";
import type { ItemRow } from "../api";
import type { ItemsQueryState } from "../query-state";
import type { QueryPatch } from "../useItemsQuery";

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
const {
  toggleFavoriteMock,
  toggleHiddenMock,
  updateItemNoteMock,
  refreshItemMock,
} = vi.hoisted(() => ({
  toggleFavoriteMock: vi.fn(),
  toggleHiddenMock: vi.fn(),
  updateItemNoteMock: vi.fn(),
  refreshItemMock: vi.fn(),
}));

let queryState: ItemsQueryState = {
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

const updateQuery = vi.fn((patch: QueryPatch) => {
  const nextPatch = typeof patch === "function" ? patch(queryState) : patch;
  queryState = { ...queryState, ...nextPatch };
});

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
    toggleFavorite: toggleFavoriteMock,
    toggleHidden: toggleHiddenMock,
    refreshItem: refreshItemMock,
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
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  }));
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
  toggleFavoriteMock.mockReset();
  toggleHiddenMock.mockReset();
  updateItemNoteMock.mockClear();
  refreshItemMock.mockClear();
  toggleFavoriteMock.mockResolvedValue(undefined);
  toggleHiddenMock.mockResolvedValue(undefined);
  refreshItemMock.mockResolvedValue({
    ...sampleItem,
    price: 120,
    bids: 9,
    ends_at: "2025-01-03T12:00:00",
  });
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
  expect(screen.getByTestId("items-toolbar")).toHaveClass("dark:bg-slate-900");
  expect(screen.getByTestId("view-table")).toHaveClass("dark:border-slate-700");
});

test("view switcher supports dense, hybrid, and cards", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<ItemsPage />);

  expect(screen.getByTestId("view-table")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Hybrid" }));
  rerender(<ItemsPage />);
  expect(screen.getByTestId("view-hybrid")).toBeInTheDocument();
  expect(screen.getByTestId("posted-1")).toHaveAttribute("title");
  expect(screen.getByTestId("ends-1")).toHaveAttribute("title");

  await user.click(screen.getByRole("button", { name: "Cards" }));
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
  expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
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
  expect(itemImage).toHaveClass("min-w-20");
  expect(itemImage).toHaveClass("max-w-none");
});

test("uses placeholder image when source is missing in all views", async () => {
  const user = userEvent.setup();
  rows = [{ ...sampleItem, image_url: "" }];
  const { rerender } = render(<ItemsPage />);

  const assertPlaceholder = () => {
    expect(screen.getByRole("img", { name: "Vintage Telecaster" })).toHaveAttribute(
      "src",
      expect.stringContaining("data:image/svg+xml")
    );
  };

  assertPlaceholder();

  await user.click(screen.getByRole("button", { name: "Hybrid" }));
  rerender(<ItemsPage />);
  assertPlaceholder();

  await user.click(screen.getByRole("button", { name: "Cards" }));
  rerender(<ItemsPage />);
  assertPlaceholder();
});

test("replaces image with placeholder if loading fails", () => {
  render(<ItemsPage />);

  const itemImage = screen.getByRole("img", { name: "Vintage Telecaster" }) as HTMLImageElement;
  expect(itemImage).toHaveAttribute("src", "https://img.example/item.jpg");

  fireEvent.error(itemImage);

  expect(itemImage).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml"));
});

test("view switcher provides compact icon controls on mobile", () => {
  render(<ItemsPage />);

  expect(screen.getByRole("button", { name: "Switch to table view" })).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Switch to hybrid view" })
  ).not.toBeInTheDocument();
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

  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Edit item note" })).not.toBeInTheDocument()
  );
  expect(screen.getByRole("button", { name: "Note" })).toHaveClass("border-blue-500");
});

test("refresh action calls API and updates row data", async () => {
  const user = userEvent.setup();
  render(<ItemsPage />);

  expect(screen.getByText("99 GBP")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Refresh" }));

  expect(await screen.findByText("120 GBP")).toBeInTheDocument();
});

test("shows query loading and request error states", () => {
  render(
    <ItemsPage
      itemsQuery={{
        query: queryState,
        data: null,
        loading: true,
        error: "items fetch failed",
        updateQuery,
        resetQuery: vi.fn(),
      }}
    />
  );

  expect(screen.getByText("Loading items...")).toBeInTheDocument();
  expect(screen.getByText("items fetch failed")).toBeInTheDocument();
});

test("favorite failure shows error and rolls optimistic state back", async () => {
  const user = userEvent.setup();
  toggleFavoriteMock.mockRejectedValueOnce(new Error("failed"));
  render(<ItemsPage />);

  await user.click(screen.getByRole("button", { name: "Fav" }));

  expect(await screen.findByText("Could not update favorite state. Please retry.")).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Fav" })).toHaveAttribute("aria-pressed", "false")
  );
});

test("hidden failure shows error and rolls optimistic state back", async () => {
  const user = userEvent.setup();
  toggleHiddenMock.mockRejectedValueOnce(new Error("failed"));
  render(<ItemsPage />);

  await user.click(screen.getByRole("button", { name: "Hide" }));

  expect(await screen.findByText("Could not update hidden state. Please retry.")).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Hide" })).toHaveAttribute("aria-pressed", "false")
  );
});

test("note save failure keeps editor open and displays action error", async () => {
  const user = userEvent.setup();
  updateItemNoteMock.mockRejectedValueOnce(new Error("save failed"));
  render(<ItemsPage />);

  await user.click(screen.getByRole("button", { name: "Note" }));
  await user.type(screen.getByLabelText("Personal note"), "still pending");
  await user.click(screen.getByRole("button", { name: "Save note" }));

  expect((await screen.findAllByText("Could not update note. Please retry.")).length).toBeGreaterThan(
    0
  );
  expect(screen.getByRole("dialog", { name: "Edit item note" })).toBeInTheDocument();
});

test("refresh failure surfaces action error", async () => {
  const user = userEvent.setup();
  refreshItemMock.mockRejectedValueOnce(new Error("refresh failed"));
  render(<ItemsPage />);

  await user.click(screen.getByRole("button", { name: "Refresh" }));

  expect(await screen.findByText("Could not refresh item data. Please retry.")).toBeInTheDocument();
});

test("refresh action is available in table, hybrid, and card views", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<ItemsPage />);

  expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Hybrid" }));
  rerender(<ItemsPage />);
  expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Cards" }));
  rerender(<ItemsPage />);
  expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
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

test("columns trigger is hidden when controls are provided by navbar menu", () => {
  const onMenuActionsChange = vi.fn();

  render(<ItemsPage onMenuActionsChange={onMenuActionsChange} />);

  expect(screen.queryByRole("button", { name: "Columns" })).not.toBeInTheDocument();
  expect(onMenuActionsChange).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ id: "columns", label: "Columns" })])
  );
});

test("columns menu action opens the column controls dialog", async () => {
  const user = userEvent.setup();
  let latestActions: Array<{ id: string; onSelect: () => void }> = [];
  const onMenuActionsChange = vi.fn((actions) => {
    latestActions = actions as Array<{ id: string; onSelect: () => void }>;
  });

  render(<ItemsPage onMenuActionsChange={onMenuActionsChange} />);

  await waitFor(() =>
    expect(latestActions.some((action) => action.id === "columns")).toBe(true)
  );

  const columnsAction = latestActions.find((action) => action.id === "columns");
  expect(columnsAction).toBeDefined();
  act(() => {
    columnsAction?.onSelect();
  });
  expect(screen.getByRole("dialog", { name: "Column controls" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Close column controls" }));
  expect(
    screen.queryByRole("dialog", { name: "Column controls" })
  ).not.toBeInTheDocument();
});

test("navbar menu item opens the column controls dialog end-to-end", async () => {
  const user = userEvent.setup();

  function Harness() {
    const [menuActions, setMenuActions] = useState<NavbarMenuAction[]>([]);
    return (
      <ThemeProvider>
        <AppShell activePath="/" menuActions={menuActions} sidebarEnabled={false}>
          <ItemsPage onMenuActionsChange={setMenuActions} />
        </AppShell>
      </ThemeProvider>
    );
  }

  render(<Harness />);

  await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
  await user.click(screen.getByRole("button", { name: "Columns" }));
  expect(screen.getByRole("dialog", { name: "Column controls" })).toBeInTheDocument();
});

test("seller and category labels add filters across table, hybrid, and card views", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<ItemsPage />);

  await user.click(screen.getByRole("button", { name: "Filter by seller alice" }));
  expect(queryState.seller).toContain("alice");

  await user.click(screen.getByRole("button", { name: "Filter by category Electric Guitars" }));
  expect(queryState.category).toContain("Electric Guitars");

  await user.click(screen.getByRole("button", { name: "Hybrid" }));
  rerender(<ItemsPage />);

  await user.click(screen.getByRole("button", { name: "Filter by seller alice" }));
  await user.click(screen.getByRole("button", { name: "Filter by category Electric Guitars" }));
  expect(queryState.seller).toContain("alice");
  expect(queryState.category).toContain("Electric Guitars");

  await user.click(screen.getByRole("button", { name: "Cards" }));
  rerender(<ItemsPage />);

  await user.click(screen.getByRole("button", { name: "Filter by seller alice" }));
  await user.click(screen.getByRole("button", { name: "Filter by category Electric Guitars" }));
  expect(queryState.seller).toContain("alice");
  expect(queryState.category).toContain("Electric Guitars");
});

test("repeated seller/category quick-filters do not duplicate selected values", async () => {
  const user = userEvent.setup();
  render(<ItemsPage />);

  await user.click(screen.getByRole("button", { name: "Filter by seller alice" }));
  await user.click(screen.getByRole("button", { name: "Filter by seller alice" }));
  await user.click(screen.getByRole("button", { name: "Filter by category Electric Guitars" }));
  await user.click(screen.getByRole("button", { name: "Filter by category Electric Guitars" }));

  expect(queryState.seller).toEqual(["alice"]);
  expect(queryState.category).toEqual(["Electric Guitars"]);
});
