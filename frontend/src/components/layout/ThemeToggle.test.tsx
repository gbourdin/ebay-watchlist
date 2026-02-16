import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ThemeProvider from "../../theme/ThemeProvider";
import Navbar from "./Navbar";
import ThemeToggle from "./ThemeToggle";

function installMatchMedia(isDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: isDark,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  }));
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("renders as a switch with sun/moon icons and toggles theme", async () => {
    installMatchMedia(false);
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggle = screen.getByRole("switch", { name: "Toggle color theme" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveClass("rounded-full");
    expect(screen.getByTestId("theme-thumb")).toHaveClass("translate-x-0");
    expect(screen.getByTestId("theme-thumb-icon-sun")).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("theme-thumb")).toHaveClass("translate-x-9");
    expect(screen.getByTestId("theme-thumb-icon-moon")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("is rendered inside the navbar action group", () => {
    installMatchMedia(false);

    render(
      <ThemeProvider>
        <Navbar activePath="/" />
      </ThemeProvider>
    );

    expect(screen.getByRole("switch", { name: "Toggle color theme" })).toBeInTheDocument();
  });
});
