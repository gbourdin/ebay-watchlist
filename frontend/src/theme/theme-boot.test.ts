import { describe, expect, it } from "vitest";

import { resolveInitialTheme } from "./theme-boot";

describe("resolveInitialTheme", () => {
  it("uses valid stored preference over system theme", () => {
    expect(resolveInitialTheme("light", true)).toBe("light");
    expect(resolveInitialTheme("dark", false)).toBe("dark");
  });

  it("falls back to system theme when preference is missing or invalid", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(undefined, false)).toBe("light");
    expect(resolveInitialTheme("system", true)).toBe("dark");
  });
});
