import type { ItemRow } from "../api";
import { formatExactDateTime, humanizeDateTime } from "../relative-time";
import type { DenseTableColumnKey } from "../table-columns";

interface DenseTableViewProps {
  items: ItemRow[];
  visibleColumns: DenseTableColumnKey[];
  onToggleFavorite: (item: ItemRow) => void;
  onToggleHidden: (item: ItemRow) => void;
  onEditNote: (item: ItemRow) => void;
}

export default function DenseTableView({
  items,
  visibleColumns,
  onToggleFavorite,
  onToggleHidden,
  onEditNote,
}: DenseTableViewProps) {
  const visible = new Set(visibleColumns);
  const colSpan = Math.max(visibleColumns.length, 1);

  return (
    <div data-testid="view-table" className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-700">
          <tr>
            {visible.has("image") && <th className="px-3 py-3">Image</th>}
            {visible.has("title") && <th className="px-3 py-3">Title</th>}
            {visible.has("price") && <th className="px-3 py-3">Price</th>}
            {visible.has("bids") && <th className="px-3 py-3">Bids</th>}
            {visible.has("seller") && <th className="px-3 py-3">Seller</th>}
            {visible.has("category") && <th className="px-3 py-3">Category</th>}
            {visible.has("posted") && <th className="px-3 py-3 whitespace-nowrap">Posted</th>}
            {visible.has("ends") && <th className="px-3 py-3 whitespace-nowrap">Ends</th>}
            {visible.has("actions") && <th className="px-3 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
          {items.length === 0 ? (
            <tr>
              <td className="px-3 py-10 text-center text-slate-500" colSpan={colSpan}>
                No items found.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.item_id} className="align-top">
                {visible.has("image") && (
                  <td className="px-3 py-3">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="aspect-square h-20 w-20 rounded-lg object-cover sm:h-[108px] sm:w-[108px]"
                      loading="lazy"
                    />
                  </td>
                )}
                {visible.has("title") && (
                  <td className="px-3 py-3">
                    <a
                      className="font-semibold text-blue-700 hover:underline"
                      href={item.web_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.title}
                    </a>
                  </td>
                )}
                {visible.has("price") && (
                  <td className="px-3 py-3">
                    {item.price} {item.currency}
                  </td>
                )}
                {visible.has("bids") && <td className="px-3 py-3">{item.bids}</td>}
                {visible.has("seller") && <td className="px-3 py-3">{item.seller}</td>}
                {visible.has("category") && <td className="px-3 py-3">{item.category}</td>}
                {visible.has("posted") && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <time
                      data-testid={`posted-${item.item_id}`}
                      dateTime={item.posted_at}
                      title={formatExactDateTime(item.posted_at)}
                    >
                      {humanizeDateTime(item.posted_at)}
                    </time>
                  </td>
                )}
                {visible.has("ends") && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <time
                      data-testid={`ends-${item.item_id}`}
                      dateTime={item.ends_at}
                      title={formatExactDateTime(item.ends_at)}
                    >
                      {humanizeDateTime(item.ends_at)}
                    </time>
                  </td>
                )}
                {visible.has("actions") && (
                  <td className="space-y-2 px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(item)}
                      aria-pressed={item.favorite}
                      className={`inline-flex w-full justify-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                        item.favorite
                          ? "border-amber-500 bg-amber-100 text-amber-900"
                          : "border-amber-400 text-amber-700 hover:bg-amber-100"
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
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-400 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Hide
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditNote(item)}
                      className={`inline-flex w-full justify-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                        item.note_text
                          ? "border-blue-500 bg-blue-100 text-blue-900"
                          : "border-blue-300 text-blue-700 hover:bg-blue-100"
                      }`}
                    >
                      Note
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
