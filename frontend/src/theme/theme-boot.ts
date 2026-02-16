import { normalizeStoredTheme, resolveEffectiveTheme, type ThemeMode } from "./theme-preference";

export function resolveInitialTheme(rawStoredTheme: unknown, prefersDark: boolean): ThemeMode {
  const systemTheme: ThemeMode = prefersDark ? "dark" : "light";
  const preference = normalizeStoredTheme(rawStoredTheme);
  return resolveEffectiveTheme(preference, systemTheme);
}
