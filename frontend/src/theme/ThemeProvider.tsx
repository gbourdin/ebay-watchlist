import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  deriveStoredPreference,
  normalizeStoredTheme,
  resolveEffectiveTheme,
  type ThemeMode,
  type ThemePreference,
} from "./theme-preference";

export const THEME_STORAGE_KEY = "ebay-watchlist.theme";

export interface ThemeContextValue {
  effectiveTheme: ThemeMode;
  systemTheme: ThemeMode;
  preference: ThemePreference;
  setTheme: (nextTheme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSystemTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return normalizeStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

function persistStoredPreference(preference: ThemePreference): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (preference === null) {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage failures (private mode / blocked storage).
  }
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(readSystemTheme);
  const [preference, setPreference] = useState<ThemePreference>(readStoredPreference);

  const effectiveTheme = resolveEffectiveTheme(preference, systemTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (preference !== null && preference === systemTheme) {
      setPreference(null);
      persistStoredPreference(null);
    }
  }, [preference, systemTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", effectiveTheme === "dark");
  }, [effectiveTheme]);

  const setTheme = useCallback(
    (nextTheme: ThemeMode) => {
      const nextPreference = deriveStoredPreference(nextTheme, systemTheme);
      setPreference(nextPreference);
      persistStoredPreference(nextPreference);
    },
    [systemTheme]
  );

  const toggleTheme = useCallback(() => {
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  }, [effectiveTheme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      effectiveTheme,
      systemTheme,
      preference,
      setTheme,
      toggleTheme,
    }),
    [effectiveTheme, systemTheme, preference, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
