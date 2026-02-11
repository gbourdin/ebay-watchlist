import AppShell from "../components/layout/AppShell";
import FiltersSidebar from "../features/items/components/FiltersSidebar";
import ItemsPage from "../features/items/ItemsPage";
import { useItemsQuery } from "../features/items/useItemsQuery";

export default function App() {
  const itemsQuery = useItemsQuery();

  return (
    <AppShell
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
      <ItemsPage itemsQuery={itemsQuery} />
    </AppShell>
  );
}
