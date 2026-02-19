import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";

import AppShell from "./AppShell";
import ThemeProvider from "../../theme/ThemeProvider";

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

test("sidebar collapses on desktop and becomes drawer on mobile", async () => {
  window.localStorage.setItem("ebay-watchlist.sidebar.open", "1");

  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <AppShell
        railActions={{
          favoritesOnly: false,
          showHidden: false,
          onToggleFavoritesOnly: () => {},
          onToggleShowHidden: () => {},
        }}
      />
    </ThemeProvider>
  );

  expect(screen.getByTestId("desktop-sidebar")).toHaveAttribute("data-open", "true");
  expect(screen.getByTestId("desktop-sidebar")).toHaveClass("top-16", "bottom-0");

  await user.click(screen.getByRole("button", { name: "Collapse filters" }));

  expect(screen.getByTestId("desktop-sidebar")).toHaveAttribute("data-open", "false");
  expect(screen.getByTestId("sidebar-rail")).toBeInTheDocument();
  expect(screen.queryByText("Show Filters")).not.toBeInTheDocument();

  const openFiltersButton = screen.getByRole("button", { name: "Open filters" });
  expect(openFiltersButton).toHaveClass(
    "rounded-full",
    "h-14",
    "w-14",
    "bg-[#040823]",
    "dark:bg-[#040823]"
  );
  await user.click(openFiltersButton);

  const mobileDialog = await screen.findByRole("dialog", { name: "Filters" });
  expect(mobileDialog).toBeInTheDocument();
  expect(mobileDialog).toHaveClass(
    "bg-[#040823]",
    "dark:bg-[#040823]",
    "rounded-2xl",
    "transition-all",
    "duration-200"
  );
  expect(screen.getByRole("button", { name: "Close filters" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open filters" })).not.toBeInTheDocument();
});

test("sidebar hidden state does not reduce table width", async () => {
  window.localStorage.setItem("ebay-watchlist.sidebar.open", "1");

  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <AppShell
        railActions={{
          favoritesOnly: false,
          showHidden: false,
          onToggleFavoritesOnly: () => {},
          onToggleShowHidden: () => {},
        }}
      />
    </ThemeProvider>
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
    <ThemeProvider>
      <AppShell
        railActions={{
          favoritesOnly: false,
          showHidden: false,
          onToggleFavoritesOnly,
          onToggleShowHidden,
        }}
      />
    </ThemeProvider>
  );

  await user.click(screen.getByRole("button", { name: "Enable favorites-only filter" }));
  await user.click(screen.getByRole("button", { name: "Show hidden items" }));

  expect(onToggleFavoritesOnly).toHaveBeenCalledTimes(1);
  expect(onToggleShowHidden).toHaveBeenCalledTimes(1);
});

test("desktop brand panel does not render right divider", () => {
  render(
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
  expect(screen.getByTestId("navbar-brand-panel")).not.toHaveClass("border-r");
});

test("shell surfaces include dark-mode class variants", () => {
  render(
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );

  expect(screen.getByTestId("app-shell")).toHaveClass("dark:bg-slate-950");
  expect(screen.getByTestId("navbar-root")).toHaveClass("dark:bg-slate-950/95");
  expect(screen.getByTestId("desktop-sidebar")).toHaveClass(
    "dark:bg-[#040823]",
    "dark:border-slate-800"
  );
  expect(screen.getByTestId("results-main")).toHaveClass("dark:bg-slate-900");
});
