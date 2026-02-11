import AppShell from "../components/layout/AppShell";
import FiltersSidebar from "../features/items/components/FiltersSidebar";
import ItemsPage from "../features/items/ItemsPage";
import { useItemsQuery } from "../features/items/useItemsQuery";

export default function App() {
  const itemsQuery = useItemsQuery();

  return (
    <AppShell sidebar={<FiltersSidebar itemsQuery={itemsQuery} />}>
      <ItemsPage itemsQuery={itemsQuery} />
    </AppShell>
  );
}
