import { render, screen } from "@testing-library/react";

import App from "./App";

test("renders app shell landmarks", () => {
  render(<App />);

  expect(screen.getByRole("navigation")).toBeInTheDocument();
  expect(screen.getByTestId("filters-sidebar")).toBeInTheDocument();
  expect(screen.getByTestId("results-main")).toBeInTheDocument();
});
