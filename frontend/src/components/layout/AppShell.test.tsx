import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import AppShell from "./AppShell";

test("sidebar collapses on desktop and becomes drawer on mobile", async () => {
  window.localStorage.setItem("ebay-watchlist.sidebar.open", "1");

  const user = userEvent.setup();
  render(
    <AppShell
      railActions={{
        favoritesOnly: false,
        showHidden: false,
        onToggleFavoritesOnly: () => {},
        onToggleShowHidden: () => {},
      }}
    />
  );

  expect(screen.getByTestId("desktop-sidebar")).toHaveAttribute("data-open", "true");
  expect(screen.getByTestId("desktop-sidebar")).toHaveClass("top-16", "bottom-0");

  await user.click(screen.getByRole("button", { name: "Collapse filters" }));

  expect(screen.getByTestId("desktop-sidebar")).toHaveAttribute("data-open", "false");
  expect(screen.getByTestId("sidebar-rail")).toBeInTheDocument();
  expect(screen.queryByText("Show Filters")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Open filters" }));

  expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
});

test("sidebar hidden state does not reduce table width", async () => {
  window.localStorage.setItem("ebay-watchlist.sidebar.open", "1");

  const user = userEvent.setup();
  render(
    <AppShell
      railActions={{
        favoritesOnly: false,
        showHidden: false,
        onToggleFavoritesOnly: () => {},
        onToggleShowHidden: () => {},
      }}
    />
  );

  await user.click(screen.getByRole("button", { name: "Collapse filters" }));

  expect(screen.getByTestId("results-main")).toHaveAttribute("data-sidebar-open", "false");
  expect(screen.getByRole("button", { name: "Expand filters panel" })).toBeInTheDocument();
});

test("collapsed rail toggles favorites and hidden actions", async () => {
  window.localStorage.setItem("ebay-watchlist.sidebar.open", "0");
  const user = userEvent.setup();
  const onToggleFavoritesOnly = vi.fn();
  const onToggleShowHidden = vi.fn();

  render(
    <AppShell
      railActions={{
        favoritesOnly: false,
        showHidden: false,
        onToggleFavoritesOnly,
        onToggleShowHidden,
      }}
    />
  );

  await user.click(screen.getByRole("button", { name: "Enable favorites-only filter" }));
  await user.click(screen.getByRole("button", { name: "Show hidden items" }));

  expect(onToggleFavoritesOnly).toHaveBeenCalledTimes(1);
  expect(onToggleShowHidden).toHaveBeenCalledTimes(1);
});
