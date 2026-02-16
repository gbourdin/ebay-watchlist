import { useMemo, useState } from "react";

import {
  BUILTIN_DENSE_TABLE_PRESETS,
  DENSE_TABLE_COLUMN_DEFINITIONS,
  loadUserDenseTablePresets,
  normalizeDenseTableColumns,
  presetIdFromLabel,
  saveUserDenseTablePresets,
  type DenseTableColumnKey,
  type DenseTableUserPreset,
} from "../table-columns";

interface DenseTableColumnControlsProps {
  columns: DenseTableColumnKey[];
  onChangeColumns: (columns: DenseTableColumnKey[]) => void;
  showTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function signature(columns: DenseTableColumnKey[]): string {
  return columns.join("|");
}

export default function DenseTableColumnControls({
  columns,
  onChangeColumns,
  showTrigger = true,
  open,
  onOpenChange,
}: DenseTableColumnControlsProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [userPresets, setUserPresets] = useState<DenseTableUserPreset[]>(() =>
    loadUserDenseTablePresets()
  );

  const panelOpen = open ?? internalOpen;

  function setOpen(next: boolean) {
    if (open === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  }

  const columnSet = useMemo(() => new Set(columns), [columns]);

  const allPresets = useMemo(
    () => [...BUILTIN_DENSE_TABLE_PRESETS, ...userPresets],
    [userPresets]
  );

  const activePresetId = useMemo(() => {
    const current = signature(columns);
    const match = allPresets.find((preset) => signature(preset.columns) === current);
    return match?.id ?? "";
  }, [allPresets, columns]);

  function handleColumnToggle(column: DenseTableColumnKey) {
    const next = new Set(columns);
    if (next.has(column)) {
      next.delete(column);
    } else {
      next.add(column);
    }
    if (next.size === 0) {
      return;
    }
    onChangeColumns(normalizeDenseTableColumns(Array.from(next)));
  }

  function handlePresetApply(presetId: string) {
    const preset = allPresets.find((value) => value.id === presetId);
    if (!preset) {
      return;
    }
    onChangeColumns(normalizeDenseTableColumns(preset.columns));
  }

  function handleSavePreset() {
    const label = presetName.trim();
    if (!label) {
      return;
    }

    const id = presetIdFromLabel(label);
    const nextPreset = { id, label, columns };
    const nextUserPresets = [...userPresets.filter((preset) => preset.id !== id), nextPreset];
    setUserPresets(nextUserPresets);
    saveUserDenseTablePresets(nextUserPresets);
    setPresetName("");
  }

  function handleDeletePreset() {
    if (!activePresetId.startsWith("custom:")) {
      return;
    }

    const nextUserPresets = userPresets.filter((preset) => preset.id !== activePresetId);
    setUserPresets(nextUserPresets);
    saveUserDenseTablePresets(nextUserPresets);
    onChangeColumns(BUILTIN_DENSE_TABLE_PRESETS[0].columns);
  }

  return (
    <>
      {showTrigger && (
        <div className="relative mb-4">
          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            onClick={() => setOpen(!panelOpen)}
            aria-expanded={panelOpen}
            aria-controls="dense-table-columns-panel"
          >
            Columns
          </button>
        </div>
      )}

      {panelOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <section
            id="dense-table-columns-panel"
            role="dialog"
            aria-label="Column controls"
            onClick={(event) => event.stopPropagation()}
            className="absolute right-4 top-20 z-20 w-[min(96vw,380px)] rounded-xl border border-slate-300 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                Columns
              </p>
              <button
                type="button"
                aria-label="Close column controls"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <label
                className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300"
                htmlFor="column-presets"
              >
                Column presets
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="column-presets"
                  aria-label="Column presets"
                  value={activePresetId}
                  onChange={(event) => handlePresetApply(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Custom selection</option>
                  {allPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleDeletePreset}
                  disabled={!activePresetId.startsWith("custom:")}
                  className="rounded-md border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {DENSE_TABLE_COLUMN_DEFINITIONS.map((column) => (
                <label
                  key={column.key}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={columnSet.has(column.key)}
                    onChange={() => handleColumnToggle(column.key)}
                  />
                  {column.label}
                </label>
              ))}
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
              <label
                className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300"
                htmlFor="column-preset-name"
              >
                Preset name
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="column-preset-name"
                  aria-label="Preset name"
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="e.g. No Seller"
                />
                <button
                  type="button"
                  onClick={handleSavePreset}
                  className="rounded-md border border-blue-700 bg-blue-700 px-2 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Save preset
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
