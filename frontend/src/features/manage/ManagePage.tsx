import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  addWatchedCategory,
  addWatchedSeller,
  fetchWatchlist,
  fetchWatchlistCategorySuggestions,
  removeWatchedCategory,
  removeWatchedSeller,
  type WatchlistCategorySuggestion,
  type WatchlistResponse,
} from "../items/api";

interface FlashMessage {
  tone: "success" | "error";
  text: string;
}

function toCategoryId(value: string): number | null {
  const cleaned = value.trim();
  if (!/^\d+$/.test(cleaned)) {
    return null;
  }
  return Number.parseInt(cleaned, 10);
}

export default function ManagePage() {
  const [watchlist, setWatchlist] = useState<WatchlistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashMessage | null>(null);

  const [sellerInput, setSellerInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [categorySuggestions, setCategorySuggestions] = useState<
    WatchlistCategorySuggestion[]
  >([]);

  const selectedCategorySuggestion = useMemo(() => {
    const cleaned = categoryInput.trim().toLowerCase();
    if (!cleaned) {
      return null;
    }

    return (
      categorySuggestions.find((suggestion) => suggestion.name.toLowerCase() === cleaned) ??
      null
    );
  }, [categoryInput, categorySuggestions]);

  async function loadWatchlist() {
    setLoading(true);
    setError(null);

    try {
      const snapshot = await fetchWatchlist();
      setWatchlist(snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watchlist");
      setWatchlist(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWatchlist();
  }, []);

  useEffect(() => {
    let canceled = false;

    async function loadSuggestions() {
      const cleaned = categoryInput.trim();
      if (cleaned.length < 2) {
        setCategorySuggestions([]);
        return;
      }

      try {
        const response = await fetchWatchlistCategorySuggestions(cleaned);
        if (!canceled) {
          setCategorySuggestions(response.suggestions);
        }
      } catch {
        if (!canceled) {
          setCategorySuggestions([]);
        }
      }
    }

    void loadSuggestions();

    return () => {
      canceled = true;
    };
  }, [categoryInput]);

  async function refreshAfterChange(successText: string) {
    await loadWatchlist();
    setFlash({ tone: "success", text: successText });
  }

  async function handleAddSeller(event: FormEvent) {
    event.preventDefault();

    const sellerName = sellerInput.trim();
    if (!sellerName) {
      return;
    }

    setBusy(true);
    setFlash(null);
    setError(null);
    try {
      await addWatchedSeller(sellerName);
      setSellerInput("");
      await refreshAfterChange("Seller added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add seller");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveSeller(sellerName: string) {
    setBusy(true);
    setFlash(null);
    setError(null);
    try {
      await removeWatchedSeller(sellerName);
      await refreshAfterChange("Seller removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove seller");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddCategory(event: FormEvent) {
    event.preventDefault();

    const rawInput = categoryInput.trim();
    if (!rawInput) {
      return;
    }

    const selectedCategoryId =
      selectedCategorySuggestion !== null
        ? Number.parseInt(selectedCategorySuggestion.id, 10)
        : toCategoryId(rawInput);

    setBusy(true);
    setFlash(null);
    setError(null);
    try {
      await addWatchedCategory({
        categoryId: selectedCategoryId ?? undefined,
        categoryName: selectedCategoryId === null ? rawInput : undefined,
      });
      setCategoryInput("");
      setCategorySuggestions([]);
      await refreshAfterChange("Category added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add category");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveCategory(categoryId: number) {
    setBusy(true);
    setFlash(null);
    setError(null);
    try {
      await removeWatchedCategory(categoryId);
      await refreshAfterChange("Category removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove category");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Manage Watchlist</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure watched sellers and category IDs used by daemon fetches.
        </p>
      </header>

      {loading && <p className="text-sm text-slate-500">Loading watchlist...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {flash && (
        <p
          className={`text-sm ${
            flash.tone === "success" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {flash.text}
        </p>
      )}

      {watchlist && (
        <div className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Watched Sellers</h2>

            <form className="mt-3 flex gap-2" onSubmit={(event) => void handleAddSeller(event)}>
              <input
                aria-label="Seller name"
                value={sellerInput}
                onChange={(event) => setSellerInput(event.target.value)}
                placeholder="Type seller username"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Add
              </button>
            </form>

            <ul className="mt-4 space-y-2">
              {watchlist.sellers.map((seller) => (
                <li
                  key={seller}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-800">{seller}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRemoveSeller(seller)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Remove
                  </button>
                </li>
              ))}
              {watchlist.sellers.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                  No watched sellers yet.
                </li>
              )}
            </ul>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Watched Categories</h2>
            <p className="mt-1 text-xs text-slate-500">
              Add by numeric ID or by name from suggestions.
            </p>

            <form
              className="mt-3 flex flex-col gap-2"
              onSubmit={(event) => void handleAddCategory(event)}
            >
              <input
                aria-label="Category name or ID"
                list="watchlist-category-suggestions"
                value={categoryInput}
                onChange={(event) => setCategoryInput(event.target.value)}
                placeholder="Type category name or ID"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <datalist id="watchlist-category-suggestions">
                {categorySuggestions.map((suggestion) => (
                  <option
                    key={suggestion.id}
                    value={suggestion.name}
                    label={`${suggestion.path} (#${suggestion.id})`}
                  />
                ))}
              </datalist>
              <button
                type="submit"
                disabled={busy}
                className="self-start rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Add category
              </button>
            </form>

            <ul className="mt-4 space-y-2">
              {watchlist.categories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{category.name}</p>
                    <p className="text-xs text-slate-500">ID: {category.id}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRemoveCategory(category.id)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Remove
                  </button>
                </li>
              ))}
              {watchlist.categories.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                  No watched categories yet.
                </li>
              )}
            </ul>
          </article>
        </div>
      )}
    </section>
  );
}
