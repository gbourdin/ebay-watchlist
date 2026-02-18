import type { ItemsSort, ItemsView } from "../api";
import useIsPhoneViewport from "../useIsPhoneViewport";

interface ItemsToolbarProps {
  total: number;
  sort: ItemsSort;
  view: ItemsView;
  onSortChange: (sort: ItemsSort) => void;
  onViewChange: (view: ItemsView) => void;
}

const sortOptions: Array<{ value: ItemsSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "ending_soon_active", label: "Ending soon" },
  { value: "price_low", label: "Price low-high" },
  { value: "price_high", label: "Price high-low" },
  { value: "bids_desc", label: "Most bids" },
];

const viewOptions: Array<{ value: ItemsView; label: string }> = [
  { value: "table", label: "Table" },
  { value: "hybrid", label: "Hybrid" },
  { value: "cards", label: "Cards" },
];

function viewIcon(view: ItemsView): string {
  if (view === "table") {
    return "▦";
  }
  if (view === "hybrid") {
    return "☰";
  }
  return "◫";
}

export default function ItemsToolbar({
  total,
  sort,
  view,
  onSortChange,
  onViewChange,
}: ItemsToolbarProps) {
  const isPhoneViewport = useIsPhoneViewport();
  const availableViewOptions = isPhoneViewport
    ? viewOptions.filter((option) => option.value !== "hybrid")
    : viewOptions;

  return (
    <div
      data-testid="items-toolbar"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{total} items</p>

      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="sort-select">
          Sort
        </label>
        <select
          id="sort-select"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as ItemsSort)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800 sm:hidden">
          {availableViewOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-label={`Switch to ${option.label.toLowerCase()} view`}
              onClick={() => onViewChange(option.value)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-base font-semibold transition ${
                view === option.value
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span aria-hidden="true">{viewIcon(option.value)}</span>
            </button>
          ))}
        </div>

        <div className="hidden rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800 sm:inline-flex">
          {availableViewOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onViewChange(option.value)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                view === option.value
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
