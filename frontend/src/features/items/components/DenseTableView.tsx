import type { ItemRow } from "../api";

interface DenseTableViewProps {
  items: ItemRow[];
  onToggleFavorite: (item: ItemRow) => void;
  onToggleHidden: (item: ItemRow) => void;
}

export default function DenseTableView({
  items,
  onToggleFavorite,
  onToggleHidden,
}: DenseTableViewProps) {
  return (
    <div data-testid="view-table" className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-700">
          <tr>
            <th className="px-3 py-3">Image</th>
            <th className="px-3 py-3">Title</th>
            <th className="px-3 py-3">Price</th>
            <th className="px-3 py-3">Bids</th>
            <th className="px-3 py-3">Seller</th>
            <th className="px-3 py-3">Category</th>
            <th className="px-3 py-3">Ends</th>
            <th className="px-3 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
          {items.length === 0 ? (
            <tr>
              <td className="px-3 py-10 text-center text-slate-500" colSpan={8}>
                No items found.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.item_id} className="align-top">
                <td className="px-3 py-3">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-[108px] w-[108px] rounded-lg object-cover"
                    loading="lazy"
                  />
                </td>
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
                <td className="px-3 py-3">
                  {item.price} {item.currency}
                </td>
                <td className="px-3 py-3">{item.bids}</td>
                <td className="px-3 py-3">{item.seller}</td>
                <td className="px-3 py-3">{item.category}</td>
                <td className="px-3 py-3">{item.ends_in}</td>
                <td className="space-y-2 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(item)}
                    className="inline-flex w-full justify-center rounded-md border border-amber-400 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    Fav
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleHidden(item)}
                    className="inline-flex w-full justify-center rounded-md border border-slate-400 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Hide
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
