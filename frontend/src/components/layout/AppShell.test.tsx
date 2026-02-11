import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AppShell from "./AppShell";

test("sidebar collapses on desktop and becomes drawer on mobile", async () => {
  window.localStorage.setItem("ebay-watchlist.sidebar.open", "1");

  const user = userEvent.setup();
  render(<AppShell />);

  expect(screen.getByTestId("desktop-sidebar")).toHaveAttribute("data-open", "true");

  await user.click(screen.getByRole("button", { name: "Hide" }));

  expect(screen.getByTestId("desktop-sidebar")).toHaveAttribute("data-open", "false");

  await user.click(screen.getByRole("button", { name: "Open filters" }));

  expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
});

test("sidebar hidden state does not reduce table width", async () => {
  window.localStorage.setItem("ebay-watchlist.sidebar.open", "1");

  const user = userEvent.setup();
  render(<AppShell />);

  await user.click(screen.getByRole("button", { name: "Hide" }));

  expect(screen.getByTestId("results-main")).toHaveAttribute("data-sidebar-open", "false");
});
