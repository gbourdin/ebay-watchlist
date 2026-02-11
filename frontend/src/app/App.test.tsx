import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import App from "./App";

vi.mock("../features/items/ItemsPage", () => ({
  default: () => <div>Items page</div>,
}));

test("renders app shell landmarks", () => {
  render(<App />);

  expect(screen.getByRole("navigation")).toBeInTheDocument();
  expect(screen.getByTestId("desktop-sidebar")).toBeInTheDocument();
  expect(screen.getByTestId("results-main")).toBeInTheDocument();
});
