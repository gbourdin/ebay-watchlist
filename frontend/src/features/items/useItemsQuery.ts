import { useEffect, useMemo, useState } from "react";

import { fetchItems, type ItemsResponse } from "./api";
import {
  DEFAULT_QUERY_STATE,
  parseRouteMode,
  parseQueryState,
  routeModeToPath,
  serializeQueryState,
  type ItemsRouteMode,
  type ItemsQueryState,
} from "./query-state";

export type QueryPatch =
  | Partial<ItemsQueryState>
  | ((prev: ItemsQueryState) => Partial<ItemsQueryState>);

export interface UseItemsQueryResult {
  routeMode: ItemsRouteMode;
  query: ItemsQueryState;
  data: ItemsResponse | null;
  loading: boolean;
  error: string | null;
  updateQuery: (patch: QueryPatch) => void;
  setRouteMode: (routeMode: ItemsRouteMode) => void;
  resetQuery: () => void;
}

export function useItemsQuery(): UseItemsQueryResult {
  const [routeMode, setRouteMode] = useState<ItemsRouteMode>(() =>
    parseRouteMode(window.location.pathname)
  );
  const [query, setQuery] = useState<ItemsQueryState>(() => {
    const parsedQuery = parseQueryState(window.location.search);
    if (parseRouteMode(window.location.pathname) === "favorites") {
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
    if (routeMode === "favorites" && !query.favorite) {
      setRouteMode("all");
    }
  }, [routeMode, query.favorite]);

  useEffect(() => {
    const path = routeModeToPath(routeMode);
    const nextUrl = queryString ? `${path}?${queryString}` : path;
    window.history.replaceState(null, "", nextUrl);
  }, [queryString, routeMode]);

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
      return {
        ...prev,
        ...nextPatch,
      };
    });
  }

  return {
    routeMode,
    query,
    data,
    loading,
    error,
    updateQuery,
    setRouteMode: (nextRouteMode) => {
      setRouteMode(nextRouteMode);
      setQuery((prev) => ({
        ...prev,
        favorite: nextRouteMode === "favorites" ? true : false,
        page: 1,
      }));
    },
    resetQuery: () => setQuery(DEFAULT_QUERY_STATE),
  };
}
