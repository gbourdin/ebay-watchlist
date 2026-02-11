import { useEffect, useMemo, useState } from "react";

import { fetchItems, type ItemsResponse } from "./api";
import {
  DEFAULT_QUERY_STATE,
  parseQueryState,
  serializeQueryState,
  type ItemsQueryState,
} from "./query-state";

export function useItemsQuery() {
  const [query, setQuery] = useState<ItemsQueryState>(() =>
    parseQueryState(window.location.search)
  );
  const [data, setData] = useState<ItemsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => serializeQueryState(query), [query]);

  useEffect(() => {
    const nextUrl = queryString ? `?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [queryString]);

  useEffect(() => {
    let canceled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchItems(queryString);
        if (!canceled) {
          setData(result);
        }
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : "Failed to load items");
          setData(null);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      canceled = true;
    };
  }, [queryString]);

  function updateQuery(
    patch:
      | Partial<ItemsQueryState>
      | ((prev: ItemsQueryState) => Partial<ItemsQueryState>)
  ) {
    setQuery((prev) => {
      const nextPatch = typeof patch === "function" ? patch(prev) : patch;
      return {
        ...prev,
        ...nextPatch,
      };
    });
  }

  return {
    query,
    data,
    loading,
    error,
    updateQuery,
    resetQuery: () => setQuery(DEFAULT_QUERY_STATE),
  };
}
