export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="bg-slate-900 p-4 text-slate-100">Navbar</nav>
      <div className="mx-auto flex max-w-6xl gap-4 p-4">
        <aside
          data-testid="filters-sidebar"
          className="min-h-[320px] w-72 rounded-xl bg-white p-4 shadow-sm"
        >
          Sidebar
        </aside>
        <main
          data-testid="results-main"
          className="min-h-[320px] flex-1 rounded-xl bg-white p-4 shadow-sm"
        >
          Main content
        </main>
      </div>
    </div>
  );
}
