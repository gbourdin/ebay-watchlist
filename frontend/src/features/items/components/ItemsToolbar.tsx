import type { ItemsSort, ItemsView } from "../api";

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

export default function ItemsToolbar({
  total,
  sort,
  view,
  onSortChange,
  onViewChange,
}: ItemsToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-700">{total} items</p>

      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="sort-select">
          Sort
        </label>
        <select
          id="sort-select"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as ItemsSort)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
          {viewOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onViewChange(option.value)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                view === option.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
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
