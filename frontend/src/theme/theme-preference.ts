export type ThemeMode = "light" | "dark";
export type ThemePreference = ThemeMode | null;

export function resolveEffectiveTheme(
  preference: ThemePreference,
  systemTheme: ThemeMode
): ThemeMode {
  return preference ?? systemTheme;
}

export function normalizeStoredTheme(rawValue: unknown): ThemePreference {
  if (rawValue === "light" || rawValue === "dark") {
    return rawValue;
  }
  return null;
}

export function deriveStoredPreference(
  nextTheme: ThemeMode,
  systemTheme: ThemeMode
): ThemePreference {
  if (nextTheme === systemTheme) {
    return null;
  }
  return nextTheme;
}
