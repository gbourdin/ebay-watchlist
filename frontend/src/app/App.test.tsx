import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import ThemeProvider from "../theme/ThemeProvider";
import App from "./App";

vi.mock("../features/items/ItemsPage", () => ({
  default: () => <div>Items page</div>,
}));

vi.mock("../features/items/components/FiltersSidebar", () => ({
  default: () => <div>Filters sidebar</div>,
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

test("renders app shell landmarks", () => {
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

  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );

  expect(screen.getByRole("navigation")).toBeInTheDocument();
  expect(screen.getByTestId("desktop-sidebar")).toBeInTheDocument();
  expect(screen.getByTestId("results-main")).toBeInTheDocument();
});
