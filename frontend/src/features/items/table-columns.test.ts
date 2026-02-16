import { describe, expect, test, vi } from "vitest";

import {
  DEFAULT_DENSE_TABLE_COLUMNS,
  DENSE_TABLE_COLUMNS_STORAGE_KEY,
  DENSE_TABLE_PRESETS_STORAGE_KEY,
  loadStoredDenseTableColumns,
  loadUserDenseTablePresets,
  normalizeDenseTableColumns,
  presetIdFromLabel,
  saveDenseTableColumns,
  saveUserDenseTablePresets,
} from "./table-columns";

describe("table column normalization", () => {
  test("keeps only allowed columns and preserves canonical order", () => {
    const result = normalizeDenseTableColumns(["seller", "image", "unknown", "seller"]);

    expect(result).toEqual(["image", "seller"]);
  });

  test("falls back to defaults when normalized selection is empty", () => {
    const result = normalizeDenseTableColumns([]);

    expect(result).toEqual(DEFAULT_DENSE_TABLE_COLUMNS);
  });
});

describe("stored columns", () => {
  test("loads defaults when storage is empty, invalid, or malformed", () => {
    window.localStorage.removeItem(DENSE_TABLE_COLUMNS_STORAGE_KEY);
    expect(loadStoredDenseTableColumns()).toEqual(DEFAULT_DENSE_TABLE_COLUMNS);

    window.localStorage.setItem(DENSE_TABLE_COLUMNS_STORAGE_KEY, "{broken json");
    expect(loadStoredDenseTableColumns()).toEqual(DEFAULT_DENSE_TABLE_COLUMNS);

    window.localStorage.setItem(DENSE_TABLE_COLUMNS_STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(loadStoredDenseTableColumns()).toEqual(DEFAULT_DENSE_TABLE_COLUMNS);
  });

  test("loads and persists valid column selections", () => {
    window.localStorage.setItem(
      DENSE_TABLE_COLUMNS_STORAGE_KEY,
      JSON.stringify(["seller", "title", "actions"])
    );
    expect(loadStoredDenseTableColumns()).toEqual(["title", "seller", "actions"]);

    saveDenseTableColumns(["image", "title", "actions"]);
    expect(window.localStorage.getItem(DENSE_TABLE_COLUMNS_STORAGE_KEY)).toBe(
      JSON.stringify(["image", "title", "actions"])
    );
  });
});

describe("user presets", () => {
  test("returns empty when presets storage is empty or invalid", () => {
    window.localStorage.removeItem(DENSE_TABLE_PRESETS_STORAGE_KEY);
    expect(loadUserDenseTablePresets()).toEqual([]);

    window.localStorage.setItem(DENSE_TABLE_PRESETS_STORAGE_KEY, "{broken json");
    expect(loadUserDenseTablePresets()).toEqual([]);

    window.localStorage.setItem(DENSE_TABLE_PRESETS_STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(loadUserDenseTablePresets()).toEqual([]);
  });

  test("filters malformed preset entries and normalizes valid ones", () => {
    window.localStorage.setItem(
      DENSE_TABLE_PRESETS_STORAGE_KEY,
      JSON.stringify([
        null,
        "bad",
        { id: 1, label: "Wrong", columns: [] },
        {
          id: "custom:triage",
          label: "Triage",
          columns: ["seller", "image", "unknown", "actions"],
        },
      ])
    );

    expect(loadUserDenseTablePresets()).toEqual([
      {
        id: "custom:triage",
        label: "Triage",
        columns: ["image", "seller", "actions"],
      },
    ]);
  });

  test("persists user presets", () => {
    const presets = [
      {
        id: "custom:min",
        label: "Minimal",
        columns: ["title", "price", "actions"] as const,
      },
    ];

    saveUserDenseTablePresets(
      presets.map((preset) => ({
        ...preset,
        columns: [...preset.columns],
      }))
    );

    expect(window.localStorage.getItem(DENSE_TABLE_PRESETS_STORAGE_KEY)).toBe(
      JSON.stringify([
        {
          id: "custom:min",
          label: "Minimal",
          columns: ["title", "price", "actions"],
        },
      ])
    );
  });
});

describe("preset id slugging", () => {
  test("builds a stable slug and falls back when label is empty", () => {
    expect(presetIdFromLabel("  No Seller / Quick  ")).toBe("custom:no-seller-quick");
    expect(presetIdFromLabel("   ")).toBe("custom:preset");
  });
});

test("storage helpers are no-ops in non-browser environments", () => {
  const originalWindow = globalThis.window;
  vi.stubGlobal("window", undefined);

  expect(loadStoredDenseTableColumns()).toEqual(DEFAULT_DENSE_TABLE_COLUMNS);
  expect(loadUserDenseTablePresets()).toEqual([]);
  expect(() => saveDenseTableColumns(["image", "title", "actions"])).not.toThrow();
  expect(() =>
    saveUserDenseTablePresets([{ id: "custom:x", label: "X", columns: ["title"] }])
  ).not.toThrow();

  vi.stubGlobal("window", originalWindow);
});
