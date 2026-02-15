export type DenseTableColumnKey =
  | "image"
  | "title"
  | "price"
  | "bids"
  | "seller"
  | "category"
  | "posted"
  | "ends"
  | "actions";

export interface DenseTableColumnDefinition {
  key: DenseTableColumnKey;
  label: string;
}

export interface DenseTableUserPreset {
  id: string;
  label: string;
  columns: DenseTableColumnKey[];
}

export const DENSE_TABLE_COLUMNS_STORAGE_KEY = "ebay-watchlist.table.columns";
export const DENSE_TABLE_PRESETS_STORAGE_KEY = "ebay-watchlist.table.presets";

export const DENSE_TABLE_COLUMN_DEFINITIONS: DenseTableColumnDefinition[] = [
  { key: "image", label: "Image" },
  { key: "title", label: "Title" },
  { key: "price", label: "Price" },
  { key: "bids", label: "Bids" },
  { key: "seller", label: "Seller" },
  { key: "category", label: "Category" },
  { key: "posted", label: "Posted" },
  { key: "ends", label: "Ends" },
  { key: "actions", label: "Actions" },
];

const COLUMN_ORDER = DENSE_TABLE_COLUMN_DEFINITIONS.map((column) => column.key);
const ALLOWED_COLUMNS = new Set<DenseTableColumnKey>(COLUMN_ORDER);

export const DEFAULT_DENSE_TABLE_COLUMNS: DenseTableColumnKey[] = [...COLUMN_ORDER];

export const BUILTIN_DENSE_TABLE_PRESETS: DenseTableUserPreset[] = [
  { id: "preset:all", label: "All columns", columns: [...COLUMN_ORDER] },
  {
    id: "preset:triage",
    label: "Triage",
    columns: ["image", "title", "price", "seller", "posted", "ends", "actions"],
  },
  {
    id: "preset:compact",
    label: "Compact",
    columns: ["image", "title", "price", "ends", "actions"],
  },
];

export function normalizeDenseTableColumns(
  columns: readonly string[]
): DenseTableColumnKey[] {
  const selected = new Set<DenseTableColumnKey>();
  for (const value of columns) {
    if (ALLOWED_COLUMNS.has(value as DenseTableColumnKey)) {
      selected.add(value as DenseTableColumnKey);
    }
  }

  const normalized = COLUMN_ORDER.filter((key) => selected.has(key));
  if (normalized.length === 0) {
    return [...DEFAULT_DENSE_TABLE_COLUMNS];
  }
  return normalized;
}

export function loadStoredDenseTableColumns(): DenseTableColumnKey[] {
  if (typeof window === "undefined") {
    return [...DEFAULT_DENSE_TABLE_COLUMNS];
  }

  const raw = window.localStorage.getItem(DENSE_TABLE_COLUMNS_STORAGE_KEY);
  if (!raw) {
    return [...DEFAULT_DENSE_TABLE_COLUMNS];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_DENSE_TABLE_COLUMNS];
    }
    return normalizeDenseTableColumns(parsed);
  } catch {
    return [...DEFAULT_DENSE_TABLE_COLUMNS];
  }
}

export function saveDenseTableColumns(columns: DenseTableColumnKey[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(DENSE_TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(columns));
}

export function loadUserDenseTablePresets(): DenseTableUserPreset[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(DENSE_TABLE_PRESETS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((value): value is DenseTableUserPreset => {
        return (
          value !== null &&
          typeof value === "object" &&
          typeof value.id === "string" &&
          typeof value.label === "string" &&
          Array.isArray(value.columns)
        );
      })
      .map((preset) => ({
        id: preset.id,
        label: preset.label,
        columns: normalizeDenseTableColumns(preset.columns),
      }));
  } catch {
    return [];
  }
}

export function saveUserDenseTablePresets(presets: DenseTableUserPreset[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(DENSE_TABLE_PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

export function presetIdFromLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `custom:${slug || "preset"}`;
}

