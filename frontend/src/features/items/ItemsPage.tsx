import { useMemo, useState } from "react";

import {
  toggleFavorite,
  toggleHidden,
  updateItemNote,
  type ItemRow,
  type ItemsSort,
  type ItemsView,
} from "./api";
import DenseTableView from "./components/DenseTableView";
import HybridListView from "./components/HybridListView";
import ItemsToolbar from "./components/ItemsToolbar";
import CardGridView from "./components/CardGridView";
import ItemNoteEditor from "./components/ItemNoteEditor";
import { useItemsQuery, type UseItemsQueryResult } from "./useItemsQuery";

type ItemPatch = {
  favorite?: boolean;
  hidden?: boolean;
  note_text?: string | null;
  note_created_at?: string | null;
  note_last_modified?: string | null;
};

interface ItemsPageProps {
  itemsQuery?: UseItemsQueryResult;
}

export default function ItemsPage({ itemsQuery }: ItemsPageProps) {
  const { query, data, loading, error, updateQuery } = itemsQuery ?? useItemsQuery();
  const [optimisticState, setOptimisticState] = useState<Record<string, ItemPatch>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteEditorItem, setNoteEditorItem] = useState<ItemRow | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);

  const items = useMemo(() => {
    const rows = data?.items ?? [];
    return rows.map((item) => {
      const patch = optimisticState[item.item_id];
      if (!patch) {
        return item;
      }

      const nextItem = { ...item };
      if (patch.favorite !== undefined) {
        nextItem.favorite = patch.favorite;
      }
      if (patch.hidden !== undefined) {
        nextItem.hidden = patch.hidden;
      }
      if (patch.note_text !== undefined) {
        nextItem.note_text = patch.note_text;
      }
      if (patch.note_created_at !== undefined) {
        nextItem.note_created_at = patch.note_created_at;
      }
      if (patch.note_last_modified !== undefined) {
        nextItem.note_last_modified = patch.note_last_modified;
      }

      return nextItem;
    });
  }, [data?.items, optimisticState]);

  const editingItem = noteEditorItem
    ? items.find((item) => item.item_id === noteEditorItem.item_id) ?? noteEditorItem
    : null;

  async function handleSaveNote(item: ItemRow, noteText: string) {
    setActionError(null);
    setNoteSaving(true);
    const normalizedText = noteText.trim();
    const nowIso = new Date().toISOString();
    const previousPatch = optimisticState[item.item_id];

    setOptimisticState((prev) => ({
      ...prev,
      [item.item_id]: {
        ...prev[item.item_id],
        note_text: normalizedText.length ? normalizedText : null,
        note_created_at:
          normalizedText.length > 0
            ? item.note_created_at ?? nowIso
            : null,
        note_last_modified: normalizedText.length > 0 ? nowIso : null,
      },
    }));

    try {
      const result = await updateItemNote(item.item_id, noteText);
      setOptimisticState((prev) => ({
        ...prev,
        [item.item_id]: {
          ...prev[item.item_id],
          note_text: result.note_text,
          note_created_at: result.note_created_at,
          note_last_modified: result.note_last_modified,
        },
      }));
      setNoteEditorItem(null);
    } catch {
      setActionError("Could not update note. Please retry.");
      setOptimisticState((prev) => ({
        ...prev,
        [item.item_id]: previousPatch ?? {},
      }));
    } finally {
      setNoteSaving(false);
    }
  }

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
          onEditNote={setNoteEditorItem}
        />
      )}

      {query.view === "hybrid" && (
        <HybridListView
          items={items}
          onToggleFavorite={handleFavorite}
          onToggleHidden={handleHidden}
          onEditNote={setNoteEditorItem}
        />
      )}

      {query.view === "cards" && (
        <CardGridView
          items={items}
          onToggleFavorite={handleFavorite}
          onToggleHidden={handleHidden}
          onEditNote={setNoteEditorItem}
        />
      )}

      <ItemNoteEditor
        item={editingItem}
        saving={noteSaving}
        error={actionError}
        onClose={() => {
          setNoteEditorItem(null);
          setActionError(null);
        }}
        onSave={handleSaveNote}
      />
    </div>
  );
}
