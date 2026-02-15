import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import AppShell from "../../../components/layout/AppShell";
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

beforeEach(() => {
  window.localStorage.clear();
  mockedFetchSellerSuggestions.mockReset();
  mockedFetchSellerSuggestions.mockResolvedValue({ items: [] });
});

function createItemsQueryMock(): UseItemsQueryResult {
  let routeMode: "all" | "favorites" = "all";
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
    routeMode,
    query,
    data: null,
    loading: false,
    error: null,
    updateQuery,
    setRouteMode: (nextRouteMode) => {
      routeMode = nextRouteMode;
      query = {
        ...query,
        favorite: nextRouteMode === "favorites",
        page: 1,
      };
      itemsQuery.routeMode = routeMode;
      itemsQuery.query = query;
    },
    resetQuery: vi.fn(),
  };

  return itemsQuery;
}

function renderFiltersSidebarHarness() {
  const latest = { query: null as ItemsQueryState | null };
  const latestRoute = { routeMode: "all" as "all" | "favorites" };

  function Harness() {
    const [routeMode, setRouteMode] = useState<"all" | "favorites">("all");
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
    latestRoute.routeMode = routeMode;

    const itemsQuery: UseItemsQueryResult = {
      routeMode,
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
      setRouteMode: (nextRouteMode) => {
        setRouteMode(nextRouteMode);
        setQuery((prev) => ({
          ...prev,
          favorite: nextRouteMode === "favorites",
          page: 1,
        }));
      },
      resetQuery: vi.fn(),
    };

    return <FiltersSidebar itemsQuery={itemsQuery} />;
  }

  render(<Harness />);

  return {
    getQuery: () => latest.query,
    getRouteMode: () => latestRoute.routeMode,
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
    <AppShell sidebar={<FiltersSidebar itemsQuery={itemsQuery} />}>
      <div data-testid="table-content">Table content</div>
    </AppShell>
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

test("can save and re-apply a saved filter view", async () => {
  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();

  await user.type(screen.getByLabelText("Search"), "telecaster");
  await user.type(screen.getByLabelText("Sellers"), "alice{enter}");

  await user.type(screen.getByLabelText("Saved view name"), "Alice Telecaster");
  await user.click(screen.getByRole("button", { name: "Save view" }));

  await user.clear(screen.getByLabelText("Search"));
  await user.type(screen.getByLabelText("Search"), "drums");
  expect(harness.getQuery()?.q).toBe("drums");

  await user.selectOptions(screen.getByLabelText("Saved views"), "saved-view:alice-telecaster");
  await user.click(screen.getByRole("button", { name: "Apply view" }));

  expect(harness.getQuery()?.q).toBe("telecaster");
  expect(harness.getQuery()?.seller).toContain("alice");
});

test("can save and apply a watched search entry", async () => {
  const user = userEvent.setup();
  const harness = renderFiltersSidebarHarness();

  await user.type(screen.getByLabelText("Search"), "telecaster");
  await user.type(screen.getByLabelText("Main Categories"), "Musical Instruments{enter}");
  await user.type(screen.getByLabelText("Categories"), "Electric Guitars{enter}");

  await user.type(screen.getByLabelText("Watched search name"), "Tele under 100");
  await user.type(screen.getByLabelText("Max price"), "100");
  await user.click(screen.getByRole("button", { name: "Save watched search" }));

  await user.clear(screen.getByLabelText("Search"));
  expect(harness.getQuery()?.q).toBe("");

  await user.selectOptions(
    screen.getByLabelText("Watched searches"),
    "watched-search:tele-under-100"
  );
  await user.click(screen.getByRole("button", { name: "Apply watched search" }));

  expect(harness.getQuery()?.q).toBe("telecaster");
  expect(harness.getQuery()?.main_category).toContain("Musical Instruments");
  expect(harness.getQuery()?.category).toContain("Electric Guitars");
});
