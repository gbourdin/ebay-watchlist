import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ThemeProvider from "./ThemeProvider";
import { useTheme } from "./useTheme";

const STORAGE_KEY = "ebay-watchlist.theme";

type MatchMediaController = {
  setSystemDark: (nextDark: boolean) => void;
};

function installMatchMedia(initialDark: boolean): MatchMediaController {
  let matches = initialDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mediaQueryList = {
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject
    ) => {
      if (type !== "change") {
        return;
      }
      if (typeof listener === "function") {
        listeners.add(listener as (event: MediaQueryListEvent) => void);
        return;
      }
      listeners.add((event) => listener.handleEvent(event));
    },
    removeEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject
    ) => {
      if (type !== "change") {
        return;
      }
      if (typeof listener === "function") {
        listeners.delete(listener as (event: MediaQueryListEvent) => void);
        return;
      }
      listeners.forEach((registered) => {
        if (registered === listener.handleEvent) {
          listeners.delete(registered);
        }
      });
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;

  Object.defineProperty(mediaQueryList, "matches", {
    get: () => matches,
  });

  window.matchMedia = vi.fn().mockImplementation(() => mediaQueryList);

  return {
    setSystemDark(nextDark: boolean) {
      matches = nextDark;
      const event = {
        matches: nextDark,
        media: mediaQueryList.media,
      } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

function ThemeProbe() {
  const { effectiveTheme, systemTheme, preference, setTheme } = useTheme();
  return (
    <div>
      <p data-testid="effective">{effectiveTheme}</p>
      <p data-testid="system">{systemTheme}</p>
      <p data-testid="preference">{preference ?? "none"}</p>
      <button type="button" onClick={() => setTheme("light")}>
        Set light
      </button>
      <button type="button" onClick={() => setTheme("dark")}>
        Set dark
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to system theme when no preference is stored", () => {
    installMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("effective")).toHaveTextContent("dark");
    expect(screen.getByTestId("system")).toHaveTextContent("dark");
    expect(screen.getByTestId("preference")).toHaveTextContent("none");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("updates with system theme changes while no explicit preference exists", () => {
    const controller = installMatchMedia(false);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("effective")).toHaveTextContent("light");
    act(() => controller.setSystemDark(true));
    expect(screen.getByTestId("effective")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists user selection only when it differs from system theme", async () => {
    installMatchMedia(true);
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: "Set light" }));

    expect(screen.getByTestId("effective")).toHaveTextContent("light");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("clears stored preference when user-selected theme equals system theme", async () => {
    installMatchMedia(true);
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: "Set light" }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("light");

    await user.click(screen.getByRole("button", { name: "Set dark" }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId("preference")).toHaveTextContent("none");
    expect(screen.getByTestId("effective")).toHaveTextContent("dark");
  });

  it("does not crash when localStorage is unavailable", async () => {
    installMatchMedia(true);
    const user = userEvent.setup();
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("effective")).toHaveTextContent("dark");
    await user.click(screen.getByRole("button", { name: "Set light" }));
    expect(screen.getByTestId("effective")).toHaveTextContent("light");
    await user.click(screen.getByRole("button", { name: "Set dark" }));
    expect(screen.getByTestId("effective")).toHaveTextContent("dark");
  });
});
