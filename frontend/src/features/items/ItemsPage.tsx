import { useMemo, useState } from "react";

import {
  toggleFavorite,
  toggleHidden,
  type ItemRow,
  type ItemsSort,
  type ItemsView,
} from "./api";
import DenseTableView from "./components/DenseTableView";
import HybridListView from "./components/HybridListView";
import ItemsToolbar from "./components/ItemsToolbar";
import CardGridView from "./components/CardGridView";
import { useItemsQuery, type UseItemsQueryResult } from "./useItemsQuery";

type ItemPatch = {
  favorite?: boolean;
  hidden?: boolean;
};

interface ItemsPageProps {
  itemsQuery?: UseItemsQueryResult;
}

export default function ItemsPage({ itemsQuery }: ItemsPageProps) {
  const { query, data, loading, error, updateQuery } = itemsQuery ?? useItemsQuery();
  const [optimisticState, setOptimisticState] = useState<Record<string, ItemPatch>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const items = useMemo(() => {
    const rows = data?.items ?? [];
    return rows.map((item) => {
      const patch = optimisticState[item.item_id];
      if (!patch) {
        return item;
      }

      return {
        ...item,
        favorite: patch.favorite ?? item.favorite,
        hidden: patch.hidden ?? item.hidden,
      };
    });
  }, [data?.items, optimisticState]);

  async function handleFavorite(item: ItemRow) {
    setActionError(null);
    const nextFavorite = !item.favorite;

    setOptimisticState((prev) => ({
      ...prev,
      [item.item_id]: {
        ...prev[item.item_id],
        favorite: nextFavorite,
      },
    }));

    try {
      await toggleFavorite(item.item_id, nextFavorite);
    } catch {
      setActionError("Could not update favorite state. Please retry.");
      setOptimisticState((prev) => ({
        ...prev,
        [item.item_id]: {
          ...prev[item.item_id],
          favorite: item.favorite,
        },
      }));
    }
  }

  async function handleHidden(item: ItemRow) {
    setActionError(null);
    const nextHidden = !item.hidden;

    setOptimisticState((prev) => ({
      ...prev,
      [item.item_id]: {
        ...prev[item.item_id],
        hidden: nextHidden,
      },
    }));

    try {
      await toggleHidden(item.item_id, nextHidden);
    } catch {
      setActionError("Could not update hidden state. Please retry.");
      setOptimisticState((prev) => ({
        ...prev,
        [item.item_id]: {
          ...prev[item.item_id],
          hidden: item.hidden,
        },
      }));
    }
  }

  function onSortChange(sort: ItemsSort) {
    updateQuery({ sort, page: 1 });
  }

  function onViewChange(view: ItemsView) {
    updateQuery({ view, page: 1 });
  }

  return (
    <div>
      <ItemsToolbar
        total={data?.total ?? 0}
        sort={query.sort}
        view={query.view}
        onSortChange={onSortChange}
        onViewChange={onViewChange}
      />

      {loading && <p className="mb-3 text-sm text-slate-500">Loading items...</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

      {query.view === "table" && (
        <DenseTableView
          items={items}
          onToggleFavorite={handleFavorite}
          onToggleHidden={handleHidden}
        />
      )}

      {query.view === "hybrid" && (
        <HybridListView
          items={items}
          onToggleFavorite={handleFavorite}
          onToggleHidden={handleHidden}
        />
      )}

      {query.view === "cards" && (
        <CardGridView
          items={items}
          onToggleFavorite={handleFavorite}
          onToggleHidden={handleHidden}
        />
      )}
    </div>
  );
}
