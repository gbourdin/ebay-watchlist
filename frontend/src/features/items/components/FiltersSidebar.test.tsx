import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import AppShell from "../../../components/layout/AppShell";
import ThemeProvider from "../../../theme/ThemeProvider";
import { fetchCategorySuggestions } from "../api";
import { fetchSellerSuggestions } from "../api";
import { parseQueryState } from "../query-state";
import type { ItemsQueryState } from "../query-state";
import type { UseItemsQueryResult } from "../useItemsQuery";
import FiltersSidebar from "./FiltersSidebar";

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return {
    ...actual,
    fetchSellerSuggestions: vi.fn().mockResolvedValue({ items: [] }),
    fetchCategorySuggestions: vi.fn().mockResolvedValue({ items: [] }),
  };
});

const mockedFetchSellerSuggestions = vi.mocked(fetchSellerSuggestions);
const mockedFetchCategorySuggestions = vi.mocked(fetchCategorySuggestions);

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
  mockedFetchSellerSuggestions.mockReset();
  mockedFetchSellerSuggestions.mockResolvedValue({ items: [] });
  mockedFetchCategorySuggestions.mockReset();
  mockedFetchCategorySuggestions.mockResolvedValue({ items: [] });
});

function createItemsQueryMock(): UseItemsQueryResult {
  let query: ItemsQueryState = {
    seller: [] as string[],
    category: [] as string[],
    main_category: [] as string[],
    q: "",
    favorite: false,
    show_hidden: false,
    sort: "newest" as const,
    view: "table" as const,
    page: 1,
    page_size: 100,
  };

  const updateQuery: UseItemsQueryResult["updateQuery"] = (patch) => {
    const nextPatch = typeof patch === "function" ? patch(query) : patch;
    query = {
      ...query,
      ...nextPatch,
    };
    itemsQuery.query = query;
  };

  const itemsQuery: UseItemsQueryResult = {
    query,
    data: null,
    loading: false,
    error: null,
    updateQuery,
    resetQuery: vi.fn(),
  };

  return itemsQuery;
}

function renderFiltersSidebarHarness() {
  const latest = { query: null as ItemsQueryState | null };

  function Harness() {
    const [query, setQuery] = useState<ItemsQueryState>({
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
    });

    latest.query = query;

    const itemsQuery: UseItemsQueryResult = {
      query,
      data: null,
      loading: false,
      error: null,
      updateQuery: (patch) => {
        setQuery((prev) => {
          const nextPatch = typeof patch === "function" ? patch(prev) : patch;
          return {
            ...prev,
            ...nextPatch,
          };
        });
      },
      resetQuery: vi.fn(),
    };

    return <FiltersSidebar itemsQuery={itemsQuery} />;
  }

  render(<Harness />);

  return {
    getQuery: () => latest.query,
  };
}

test("filters apply immediately and update query state", async () => {
  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();

  await user.type(screen.getByLabelText("Search"), "tele");
  expect(harness.getQuery()?.q).toBe("tele");

  await user.type(screen.getByLabelText("Sellers"), "alice{enter}");
  expect(harness.getQuery()?.seller).toContain("alice");

  await user.click(screen.getByLabelText("Favorites only"));
  expect(harness.getQuery()?.favorite).toBe(true);
});

test("mobile layout starts with results visible and filters drawer closed", () => {
  const itemsQuery = createItemsQueryMock();

  render(
    <ThemeProvider>
      <AppShell sidebar={<FiltersSidebar itemsQuery={itemsQuery} />}>
        <div data-testid="table-content">Table content</div>
      </AppShell>
    </ThemeProvider>
  );

  expect(screen.getByTestId("results-main")).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
});

test("default sort is newest", () => {
  expect(parseQueryState("").sort).toBe("newest");
});

test("seller input auto-adds on blur when value matches suggestion", async () => {
  mockedFetchSellerSuggestions.mockResolvedValue({
    items: [{ value: "alice_shop", label: "alice_shop" }],
  });

  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();

  await user.type(screen.getByLabelText("Sellers"), "alice_shop");
  await waitFor(() => expect(mockedFetchSellerSuggestions).toHaveBeenCalled());
  await user.tab();

  await waitFor(() => expect(harness.getQuery()?.seller).toContain("alice_shop"));
});

test("main category supports exact-match add and removable tag pills", async () => {
  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();

  await user.type(screen.getByLabelText("Main Categories"), "musical instruments");
  await user.tab();
  expect(harness.getQuery()?.main_category).toEqual(["Musical Instruments"]);

  await user.click(screen.getByRole("button", { name: "Musical Instruments ×" }));
  expect(harness.getQuery()?.main_category).toEqual([]);
});

test("category input uses suggestions on blur and supports pill removal", async () => {
  mockedFetchCategorySuggestions.mockResolvedValue({
    items: [{ value: "Acoustic Guitars", label: "Acoustic Guitars" }],
  });

  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();

  await user.type(screen.getByLabelText("Categories"), "Acoustic Guitars");
  await user.tab();

  await waitFor(() => expect(harness.getQuery()?.category).toContain("Acoustic Guitars"));
  await user.click(screen.getByRole("button", { name: "Acoustic Guitars ×" }));
  expect(harness.getQuery()?.category).toEqual([]);
});

test("category input supports enter-add with trimmed values and avoids duplicates", async () => {
  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();

  await user.type(screen.getByLabelText("Categories"), "  Electric Guitars  {enter}");
  expect(harness.getQuery()?.category).toEqual(["Electric Guitars"]);

  await user.type(screen.getByLabelText("Categories"), "Electric Guitars{enter}");
  expect(harness.getQuery()?.category).toEqual(["Electric Guitars"]);
});

test("checkbox toggles update hidden and favorites filters immediately", async () => {
  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();

  await user.click(screen.getByLabelText("Show hidden items"));
  await user.click(screen.getByLabelText("Favorites only"));

  expect(harness.getQuery()?.show_hidden).toBe(true);
  expect(harness.getQuery()?.favorite).toBe(true);
});

test("fetches category suggestions using selected main categories", async () => {
  mockedFetchCategorySuggestions.mockResolvedValue({
    items: [{ value: "Clarinets", label: "Clarinet" }],
  });

  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();

  await user.type(screen.getByLabelText("Main Categories"), "Musical Instruments");
  await user.tab();
  expect(harness.getQuery()?.main_category).toEqual(["Musical Instruments"]);

  await user.type(screen.getByLabelText("Categories"), "Cla");
  await waitFor(() =>
    expect(mockedFetchCategorySuggestions).toHaveBeenLastCalledWith("Cla", [
      "Musical Instruments",
    ])
  );
});

test("sidebar does not render routes, saved views, or watched searches controls", () => {
  const itemsQuery = createItemsQueryMock();
  render(<FiltersSidebar itemsQuery={itemsQuery} />);

  expect(screen.queryByText("Route")).not.toBeInTheDocument();
  expect(screen.queryByText("Saved Views")).not.toBeInTheDocument();
  expect(screen.queryByText("Watched Searches")).not.toBeInTheDocument();
});

test("sidebar internals keep dark styling regardless of global theme", () => {
  const itemsQuery = createItemsQueryMock();
  render(<FiltersSidebar itemsQuery={itemsQuery} />);

  const sellersLabel = screen.getByText("Sellers");
  const sellersInput = screen.getByLabelText("Sellers");

  expect(sellersLabel).toHaveClass("text-slate-300");
  expect(sellersInput).toHaveClass("border-slate-700", "bg-slate-900", "text-slate-100");
});
