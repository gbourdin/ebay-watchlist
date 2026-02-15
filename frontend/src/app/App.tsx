import { useEffect, useState } from "react";

import AppShell from "../components/layout/AppShell";
import AnalyticsPage from "../features/analytics/AnalyticsPage";
import ItemsPage from "../features/items/ItemsPage";
import FiltersSidebar from "../features/items/components/FiltersSidebar";
import { useItemsQuery } from "../features/items/useItemsQuery";
import ManagePage from "../features/manage/ManagePage";
import {
  isItemsRoute,
  normalizeRoutePath,
  type AppRoutePath,
} from "./routes";
import type { NavbarMenuAction } from "../components/layout/menu-actions";

function ItemsRouteView({
  path,
  onNavigate,
}: {
  path: AppRoutePath;
  onNavigate: (path: AppRoutePath) => void;
}) {
  const itemsQuery = useItemsQuery({
    basePath: path,
    forceFavorite: path === "/favorites",
  });
  const [menuActions, setMenuActions] = useState<NavbarMenuAction[]>([]);

  return (
    <AppShell
      activePath={path}
      onNavigate={onNavigate}
      sidebarEnabled
      menuActions={menuActions}
      sidebar={<FiltersSidebar itemsQuery={itemsQuery} />}
      railActions={{
        favoritesOnly: itemsQuery.query.favorite,
        showHidden: itemsQuery.query.show_hidden,
        onToggleFavoritesOnly: () =>
          itemsQuery.updateQuery((prev) => ({
            favorite: !prev.favorite,
            page: 1,
          })),
        onToggleShowHidden: () =>
          itemsQuery.updateQuery((prev) => ({
            show_hidden: !prev.show_hidden,
            page: 1,
          })),
      }}
    >
      <ItemsPage itemsQuery={itemsQuery} onMenuActionsChange={setMenuActions} />
    </AppShell>
  );
}

export default function App() {
  const [path, setPath] = useState<AppRoutePath>(() =>
    normalizeRoutePath(window.location.pathname)
  );

  useEffect(() => {
    function onPopState() {
      setPath(normalizeRoutePath(window.location.pathname));
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: AppRoutePath) {
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
    setPath(nextPath);
  }

  if (isItemsRoute(path)) {
    return <ItemsRouteView path={path} onNavigate={navigate} />;
  }

  if (path === "/manage") {
    return (
      <AppShell activePath={path} onNavigate={navigate} sidebarEnabled={false}>
        <ManagePage />
      </AppShell>
    );
  }

  return (
    <AppShell activePath={path} onNavigate={navigate} sidebarEnabled={false}>
      <AnalyticsPage />
    </AppShell>
  );
}
