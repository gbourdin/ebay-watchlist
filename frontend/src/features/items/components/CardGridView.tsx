import type { ItemRow } from "../api";

interface CardGridViewProps {
  items: ItemRow[];
  onToggleFavorite: (item: ItemRow) => void;
  onToggleHidden: (item: ItemRow) => void;
}

export default function CardGridView({
  items,
  onToggleFavorite,
  onToggleHidden,
}: CardGridViewProps) {
  return (
    <div data-testid="view-cards" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.length === 0 && (
        <div className="col-span-full rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          No items found.
        </div>
      )}
      {items.map((item) => (
        <article
          key={item.item_id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <img
            src={item.image_url}
            alt={item.title}
            className="h-[220px] w-full object-cover"
            loading="lazy"
          />
          <div className="space-y-2 p-4">
            <a
              href={item.web_url}
              target="_blank"
              rel="noreferrer"
              className="line-clamp-2 text-base font-semibold text-blue-700 hover:underline"
            >
              {item.title}
            </a>
            <p className="text-sm text-slate-600">
              {item.price} {item.currency} · {item.bids} bids
            </p>
            <p className="text-sm text-slate-600">
              {item.seller} · {item.category}
            </p>
            <p className="text-sm text-slate-500">Ends {item.ends_in}</p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => onToggleFavorite(item)}
                className="inline-flex flex-1 justify-center rounded-md border border-amber-400 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                Fav
              </button>
              <button
                type="button"
                onClick={() => onToggleHidden(item)}
                className="inline-flex flex-1 justify-center rounded-md border border-slate-400 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Hide
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
