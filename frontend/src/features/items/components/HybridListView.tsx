import type { ItemRow } from "../api";
import { formatExactDateTime, humanizeDateTime } from "../relative-time";

interface HybridListViewProps {
  items: ItemRow[];
  onToggleFavorite: (item: ItemRow) => void;
  onToggleHidden: (item: ItemRow) => void;
  onRefreshItem: (item: ItemRow) => void;
  isRefreshingItem: (itemId: string) => boolean;
  onAddSellerFilter: (item: ItemRow) => void;
  onAddCategoryFilter: (item: ItemRow) => void;
  onEditNote: (item: ItemRow) => void;
}

export default function HybridListView({
  items,
  onToggleFavorite,
  onToggleHidden,
  onRefreshItem,
  isRefreshingItem,
  onAddSellerFilter,
  onAddCategoryFilter,
  onEditNote,
}: HybridListViewProps) {
  return (
    <div data-testid="view-hybrid" className="space-y-3">
      {items.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No items found.
        </div>
      )}
      {items.map((item) => (
        <article
          key={item.item_id}
          className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none sm:grid-cols-[120px_minmax(0,1fr)_130px]"
        >
          <img
            src={item.image_url}
            alt={item.title}
            className="h-[120px] w-[120px] rounded-lg object-cover"
            loading="lazy"
          />
          <div className="space-y-2">
            <a
              href={item.web_url}
              target="_blank"
              rel="noreferrer"
              className="text-lg font-semibold text-blue-700 hover:underline dark:text-blue-300"
            >
              {item.title}
            </a>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <button
                type="button"
                onClick={() => onAddSellerFilter(item)}
                className="font-medium text-blue-700 hover:underline dark:text-blue-300"
                aria-label={`Filter by seller ${item.seller}`}
              >
                {item.seller}
              </button>
              {" · "}
              <button
                type="button"
                onClick={() => onAddCategoryFilter(item)}
                className="font-medium text-blue-700 hover:underline dark:text-blue-300"
                aria-label={`Filter by category ${item.category}`}
              >
                {item.category}
              </button>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Posted{" "}
              <time
                data-testid={`posted-${item.item_id}`}
                dateTime={item.posted_at}
                title={formatExactDateTime(item.posted_at)}
              >
                {humanizeDateTime(item.posted_at)}
              </time>
              {" · "}
              Ends{" "}
              <time
                data-testid={`ends-${item.item_id}`}
                dateTime={item.ends_at}
                title={formatExactDateTime(item.ends_at)}
              >
                {humanizeDateTime(item.ends_at)}
              </time>
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {item.price} {item.currency}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{item.bids} bids</p>
            <button
              type="button"
              onClick={() => onRefreshItem(item)}
              disabled={isRefreshingItem(item.item_id)}
              className="inline-flex w-full justify-center rounded-md border border-emerald-400 px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
            >
              {isRefreshingItem(item.item_id) ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => onToggleFavorite(item)}
              aria-pressed={item.favorite}
              className={`inline-flex w-full justify-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                item.favorite
                  ? "border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-200"
                  : "border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/35"
              }`}
            >
              Fav
            </button>
            <button
              type="button"
              onClick={() => onToggleHidden(item)}
              aria-pressed={item.hidden}
              className={`inline-flex w-full justify-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                item.hidden
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-400 text-slate-700 hover:bg-slate-100 dark:border-slate-500 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              Hide
            </button>
            <button
              type="button"
              onClick={() => onEditNote(item)}
              className={`inline-flex w-full justify-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                item.note_text
                  ? "border-blue-500 bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200"
                  : "border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-900/30"
              }`}
            >
              Note
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
