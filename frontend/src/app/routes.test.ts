import { describe, expect, test } from "vitest";

import { isItemsRoute, normalizeRoutePath } from "./routes";

describe("route normalization", () => {
  test("maps supported routes and trims trailing slashes", () => {
    expect(normalizeRoutePath("")).toBe("/");
    expect(normalizeRoutePath("/")).toBe("/");
    expect(normalizeRoutePath("/favorites/")).toBe("/favorites");
    expect(normalizeRoutePath("/manage///")).toBe("/manage");
    expect(normalizeRoutePath("/analytics")).toBe("/analytics");
  });

  test("falls back to home for unsupported paths", () => {
    expect(normalizeRoutePath("/unknown")).toBe("/");
    expect(normalizeRoutePath("/analytics/extra")).toBe("/");
  });
});

describe("items route predicate", () => {
  test("returns true only for item list routes", () => {
    expect(isItemsRoute("/")).toBe(true);
    expect(isItemsRoute("/favorites")).toBe(true);
    expect(isItemsRoute("/manage")).toBe(false);
    expect(isItemsRoute("/analytics")).toBe(false);
  });
});
