import { useEffect, useMemo, useState } from "react";

import {
  refreshItem,
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
import DenseTableColumnControls from "./components/DenseTableColumnControls";
import { useItemsQuery, type UseItemsQueryResult } from "./useItemsQuery";
import useIsPhoneViewport from "./useIsPhoneViewport";
import {
  loadStoredDenseTableColumns,
  saveDenseTableColumns,
  type DenseTableColumnKey,
} from "./table-columns";
import type { NavbarMenuAction } from "../../components/layout/menu-actions";

type ItemPatch = Partial<ItemRow>;

type FilterField = "seller" | "category";

interface ItemsPageProps {
  itemsQuery?: UseItemsQueryResult;
  onMenuActionsChange?: (actions: NavbarMenuAction[]) => void;
}

export default function ItemsPage({ itemsQuery, onMenuActionsChange }: ItemsPageProps) {
  const { query, data, loading, error, updateQuery } = itemsQuery ?? useItemsQuery();
  const isPhoneViewport = useIsPhoneViewport();
  const [optimisticState, setOptimisticState] = useState<Record<string, ItemPatch>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteEditorItem, setNoteEditorItem] = useState<ItemRow | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [refreshingItemIds, setRefreshingItemIds] = useState<Record<string, boolean>>({});
  const [visibleColumns, setVisibleColumns] = useState<DenseTableColumnKey[]>(
    loadStoredDenseTableColumns
  );
  const [columnsPanelOpen, setColumnsPanelOpen] = useState(false);

  useEffect(() => {
    saveDenseTableColumns(visibleColumns);
  }, [visibleColumns]);

  useEffect(() => {
    if (query.view !== "table") {
      setColumnsPanelOpen(false);
    }
  }, [query.view]);

  useEffect(() => {
    if (!onMenuActionsChange) {
      return;
    }

    if (query.view === "table") {
      onMenuActionsChange([
        {
          id: "columns",
          label: "Columns",
          onSelect: () => setColumnsPanelOpen(true),
        },
      ]);
    } else {
      onMenuActionsChange([]);
    }
  }, [onMenuActionsChange, query.view]);

  const items = useMemo(() => {
    const rows = data?.items ?? [];
    return rows.map((item) => {
      const patch = optimisticState[item.item_id];
      if (!patch) {
        return item;
      }

      return { ...item, ...patch };
    });
  }, [data?.items, optimisticState]);
  const activeView: ItemsView =
    isPhoneViewport && query.view === "hybrid" ? "cards" : query.view;

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

  async function handleRefresh(item: ItemRow) {
    setActionError(null);
    setRefreshingItemIds((prev) => ({ ...prev, [item.item_id]: true }));

    try {
      const refreshedItem = await refreshItem(item.item_id);
      setOptimisticState((prev) => ({
        ...prev,
        [item.item_id]: {
          ...prev[item.item_id],
          ...refreshedItem,
        },
      }));
    } catch {
      setActionError("Could not refresh item data. Please retry.");
    } finally {
      setRefreshingItemIds((prev) => ({
        ...prev,
        [item.item_id]: false,
      }));
    }
  }

  function onSortChange(sort: ItemsSort) {
    updateQuery({ sort, page: 1 });
  }

  function onViewChange(view: ItemsView) {
    const nextView = isPhoneViewport && view === "hybrid" ? "cards" : view;
    updateQuery({ view: nextView, page: 1 });
  }

  function appendFilterValue(field: FilterField, value: string) {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    updateQuery((prev) => {
      if (prev[field].includes(normalized)) {
        return { page: 1 };
      }
      return {
        [field]: [...prev[field], normalized],
        page: 1,
      };
    });
  }

  function handleAddSellerFilter(item: ItemRow) {
    appendFilterValue("seller", item.seller);
  }

  function handleAddCategoryFilter(item: ItemRow) {
    appendFilterValue("category", item.category);
  }

  return (
    <div>
      <ItemsToolbar
        total={data?.total ?? 0}
        sort={query.sort}
        view={activeView}
        onSortChange={onSortChange}
        onViewChange={onViewChange}
      />

      {loading && <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Loading items...</p>}
      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {actionError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      {activeView === "table" && (
        <>
          <DenseTableColumnControls
            columns={visibleColumns}
            onChangeColumns={setVisibleColumns}
            showTrigger={!onMenuActionsChange}
            open={onMenuActionsChange ? columnsPanelOpen : undefined}
            onOpenChange={onMenuActionsChange ? setColumnsPanelOpen : undefined}
          />
          <DenseTableView
            items={items}
            visibleColumns={visibleColumns}
            onToggleFavorite={handleFavorite}
            onToggleHidden={handleHidden}
            onRefreshItem={handleRefresh}
            isRefreshingItem={(itemId) => Boolean(refreshingItemIds[itemId])}
            onAddSellerFilter={handleAddSellerFilter}
            onAddCategoryFilter={handleAddCategoryFilter}
            onEditNote={setNoteEditorItem}
          />
        </>
      )}

      {activeView === "hybrid" && (
        <HybridListView
          items={items}
          onToggleFavorite={handleFavorite}
          onToggleHidden={handleHidden}
          onRefreshItem={handleRefresh}
          isRefreshingItem={(itemId) => Boolean(refreshingItemIds[itemId])}
          onAddSellerFilter={handleAddSellerFilter}
          onAddCategoryFilter={handleAddCategoryFilter}
          onEditNote={setNoteEditorItem}
        />
      )}

      {activeView === "cards" && (
        <CardGridView
          items={items}
          onToggleFavorite={handleFavorite}
          onToggleHidden={handleHidden}
          onRefreshItem={handleRefresh}
          isRefreshingItem={(itemId) => Boolean(refreshingItemIds[itemId])}
          onAddSellerFilter={handleAddSellerFilter}
          onAddCategoryFilter={handleAddCategoryFilter}
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
