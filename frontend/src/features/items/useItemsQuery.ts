import { useEffect, useMemo, useState } from "react";

import { fetchItems, type ItemsResponse } from "./api";
import {
  DEFAULT_QUERY_STATE,
  parseQueryState,
  serializeQueryState,
  type ItemsQueryState,
} from "./query-state";

export type QueryPatch =
  | Partial<ItemsQueryState>
  | ((prev: ItemsQueryState) => Partial<ItemsQueryState>);

export interface UseItemsQueryConfig {
  basePath?: string;
  forceFavorite?: boolean;
}

export interface UseItemsQueryResult {
  query: ItemsQueryState;
  data: ItemsResponse | null;
  loading: boolean;
  error: string | null;
  updateQuery: (patch: QueryPatch) => void;
  resetQuery: () => void;
}

export function useItemsQuery(config: UseItemsQueryConfig = {}): UseItemsQueryResult {
  const { basePath = "/", forceFavorite = false } = config;

  const [query, setQuery] = useState<ItemsQueryState>(() => {
    const parsedQuery = parseQueryState(window.location.search);
    if (forceFavorite) {
      return {
        ...parsedQuery,
        favorite: true,
      };
    }
    return parsedQuery;
  });
  const [data, setData] = useState<ItemsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => serializeQueryState(query), [query]);

  useEffect(() => {
    const nextUrl = queryString ? `${basePath}?${queryString}` : basePath;
    window.history.replaceState(null, "", nextUrl);
  }, [basePath, queryString]);

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

  function updateQuery(patch: QueryPatch) {
    setQuery((prev) => {
      const nextPatch = typeof patch === "function" ? patch(prev) : patch;
      const nextQuery = {
        ...prev,
        ...nextPatch,
      };
      if (forceFavorite) {
        nextQuery.favorite = true;
      }
      return nextQuery;
    });
  }

  return {
    query,
    data,
    loading,
    error,
    updateQuery,
    resetQuery: () =>
      setQuery(
        forceFavorite
          ? {
              ...DEFAULT_QUERY_STATE,
              favorite: true,
            }
          : DEFAULT_QUERY_STATE
      ),
  };
}
