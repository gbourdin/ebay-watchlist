import { describe, expect, it } from "vitest";

import {
  deriveStoredPreference,
  normalizeStoredTheme,
  resolveEffectiveTheme,
} from "./theme-preference";

describe("theme preference utilities", () => {
  it("resolves effective theme from system when no preference exists", () => {
    expect(resolveEffectiveTheme(null, "dark")).toBe("dark");
    expect(resolveEffectiveTheme(null, "light")).toBe("light");
  });

  it("resolves effective theme from explicit preference", () => {
    expect(resolveEffectiveTheme("light", "dark")).toBe("light");
    expect(resolveEffectiveTheme("dark", "light")).toBe("dark");
  });

  it("normalizes stored preference values", () => {
    expect(normalizeStoredTheme("light")).toBe("light");
    expect(normalizeStoredTheme("dark")).toBe("dark");
    expect(normalizeStoredTheme("system")).toBeNull();
    expect(normalizeStoredTheme("")).toBeNull();
    expect(normalizeStoredTheme(null)).toBeNull();
    expect(normalizeStoredTheme(undefined)).toBeNull();
  });

  it("derives persisted preference only when different from system", () => {
    expect(deriveStoredPreference("dark", "dark")).toBeNull();
    expect(deriveStoredPreference("light", "light")).toBeNull();
    expect(deriveStoredPreference("light", "dark")).toBe("light");
    expect(deriveStoredPreference("dark", "light")).toBe("dark");
  });
});
