import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, vi } from "vitest";

import ThemeProvider from "../theme/ThemeProvider";
import App from "./App";

vi.mock("../features/items/ItemsPage", () => ({
  default: () => <div>Items page</div>,
}));

vi.mock("../features/items/components/FiltersSidebar", () => ({
  default: () => <div>Filters sidebar</div>,
}));

vi.mock("../features/manage/ManagePage", () => ({
  default: () => <div>Manage page</div>,
}));

vi.mock("../features/analytics/AnalyticsPage", () => ({
  default: () => <div>Analytics page</div>,
}));

vi.mock("../features/items/useItemsQuery", () => ({
  useItemsQuery: () => ({
    query: {
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
    },
    data: null,
    loading: false,
    error: null,
    updateQuery: vi.fn(),
    resetQuery: vi.fn(),
  }),
}));

beforeEach(() => {
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
});

test("renders app shell landmarks", () => {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );

  expect(screen.getByRole("navigation")).toBeInTheDocument();
  expect(screen.getByTestId("desktop-sidebar")).toBeInTheDocument();
  expect(screen.getByTestId("results-main")).toBeInTheDocument();
});

test("renders manage route without filters sidebar", () => {
  window.history.replaceState(null, "", "/manage");

  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );

  expect(screen.getByText("Manage page")).toBeInTheDocument();
  expect(screen.queryByTestId("desktop-sidebar")).not.toBeInTheDocument();
});

test("renders analytics route and responds to popstate navigation", () => {
  window.history.replaceState(null, "", "/analytics");

  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );

  expect(screen.getByText("Analytics page")).toBeInTheDocument();

  act(() => {
    window.history.pushState(null, "", "/favorites");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  expect(screen.getByText("Items page")).toBeInTheDocument();
  expect(screen.getByTestId("desktop-sidebar")).toBeInTheDocument();
});
