import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import AppShell from "../../../components/layout/AppShell";
import ThemeProvider from "../../../theme/ThemeProvider";
import { fetchCategorySuggestions } from "../api";
import { fetchSellerSuggestions } from "../api";
import { fetchWatchlist } from "../api";
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
    fetchWatchlist: vi.fn().mockResolvedValue({
      sellers: [],
      categories: [],
      main_category_options: ["Musical Instruments", "Computers", "Videogames"],
    }),
  };
});

const mockedFetchSellerSuggestions = vi.mocked(fetchSellerSuggestions);
const mockedFetchCategorySuggestions = vi.mocked(fetchCategorySuggestions);
const mockedFetchWatchlist = vi.mocked(fetchWatchlist);

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
  mockedFetchWatchlist.mockReset();
  mockedFetchWatchlist.mockResolvedValue({
    sellers: [],
    categories: [],
    main_category_options: ["Musical Instruments", "Computers", "Videogames"],
  });
});

function createItemsQueryMock(): UseItemsQueryResult {
  let query: ItemsQueryState = {
    seller: [] as string[],
    category: [] as string[],
    main_category: [] as string[],
    q: "",
    favorite: false,
    show_hidden: false,
    show_ended: false,
    last_24h: false,
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
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
      show_ended: false,
      last_24h: false,
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
  expect(harness.getQuery()?.q).toBe("");
  await user.keyboard("{Enter}");
  expect(harness.getQuery()?.q).toBe("tele");

  await user.type(screen.getByLabelText("Sellers"), "alice{enter}");
  expect(harness.getQuery()?.seller).toContain("alice");

  await user.click(screen.getByLabelText("Favorites only"));
  expect(harness.getQuery()?.favorite).toBe(true);
});

test("mobile layout starts with results visible and filters drawer closed", async () => {
  const itemsQuery = createItemsQueryMock();

  render(
    <ThemeProvider>
      <AppShell sidebar={<FiltersSidebar itemsQuery={itemsQuery} />}>
        <div data-testid="table-content">Table content</div>
      </AppShell>
    </ThemeProvider>
  );

  await waitFor(() => expect(mockedFetchWatchlist).toHaveBeenCalled());
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

test("seller suggestions show loading and error states", async () => {
  const user = userEvent.setup();
  const deferred = createDeferred<{ items: { value: string; label: string }[] }>();
  mockedFetchSellerSuggestions.mockImplementation(() => deferred.promise);

  renderFiltersSidebarHarness();

  await user.type(screen.getByLabelText("Sellers"), "al");
  expect(await screen.findByText("Loading seller suggestions...")).toBeInTheDocument();
  deferred.reject(new Error("network"));
  expect(await screen.findByText("Could not load seller suggestions.")).toBeInTheDocument();
});

test("main category supports exact-match add and removable tag pills", async () => {
  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();
  await waitFor(() => expect(mockedFetchWatchlist).toHaveBeenCalled());

  await user.type(screen.getByLabelText("Main Categories"), "musical instruments");
  await user.tab();
  expect(harness.getQuery()?.main_category).toEqual(["Musical Instruments"]);

  await user.click(screen.getByRole("button", { name: "Musical Instruments ×" }));
  expect(harness.getQuery()?.main_category).toEqual([]);
});

test("main category options are sourced from API response", async () => {
  mockedFetchWatchlist.mockResolvedValueOnce({
    sellers: [],
    categories: [],
    main_category_options: ["Photography"],
  });

  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();
  await waitFor(() => expect(mockedFetchWatchlist).toHaveBeenCalled());

  await user.type(screen.getByLabelText("Main Categories"), "photography");
  await user.tab();
  expect(harness.getQuery()?.main_category).toEqual(["Photography"]);
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
  await user.click(screen.getByLabelText("Show ended items"));
  await user.click(screen.getByLabelText("Added in last 24 hours"));
  await user.click(screen.getByLabelText("Favorites only"));

  expect(harness.getQuery()?.show_hidden).toBe(true);
  expect(harness.getQuery()?.show_ended).toBe(true);
  expect(harness.getQuery()?.last_24h).toBe(true);
  expect(harness.getQuery()?.favorite).toBe(true);
});

test("fetches category suggestions using selected main categories", async () => {
  mockedFetchCategorySuggestions.mockResolvedValue({
    items: [{ value: "Clarinets", label: "Clarinet" }],
  });

  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();
  await waitFor(() => expect(mockedFetchWatchlist).toHaveBeenCalled());

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

test("category suggestions show loading and error states", async () => {
  const user = userEvent.setup();
  const deferred = createDeferred<{ items: { value: string; label: string }[] }>();
  mockedFetchCategorySuggestions.mockImplementation(() => deferred.promise);
  renderFiltersSidebarHarness();

  await user.type(screen.getByLabelText("Categories"), "ac");
  expect(await screen.findByText("Loading category suggestions...")).toBeInTheDocument();
  deferred.reject(new Error("network"));
  expect(await screen.findByText("Could not load category suggestions.")).toBeInTheDocument();
});

test("sidebar does not render routes, saved views, or watched searches controls", async () => {
  const itemsQuery = createItemsQueryMock();
  render(<FiltersSidebar itemsQuery={itemsQuery} />);

  await waitFor(() => expect(mockedFetchWatchlist).toHaveBeenCalled());
  expect(screen.queryByText("Route")).not.toBeInTheDocument();
  expect(screen.queryByText("Saved Views")).not.toBeInTheDocument();
  expect(screen.queryByText("Watched Searches")).not.toBeInTheDocument();
});

test("sidebar internals keep dark styling regardless of global theme", async () => {
  const itemsQuery = createItemsQueryMock();
  render(<FiltersSidebar itemsQuery={itemsQuery} />);

  await waitFor(() => expect(mockedFetchWatchlist).toHaveBeenCalled());
  const sellersLabel = screen.getByText("Sellers");
  const sellersInput = screen.getByLabelText("Sellers");

  expect(sellersLabel).toHaveClass("text-slate-300");
  expect(sellersInput).toHaveClass("border-slate-700", "bg-slate-900", "text-slate-100");
});
