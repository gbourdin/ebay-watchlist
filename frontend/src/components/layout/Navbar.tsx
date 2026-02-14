interface NavbarProps {
  onOpenSidebar: () => void;
}

export default function Navbar({ onOpenSidebar }: NavbarProps) {
  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur">
      <div className="flex h-16 w-full">
        <div
          data-testid="navbar-brand-panel"
          className="hidden h-full w-[320px] shrink-0 items-center px-6 lg:flex"
        >
          <div className="min-w-0">
            <a href="/" className="truncate text-2xl font-bold leading-none">
              Watched Listings
            </a>
            <p className="truncate text-sm text-slate-300">
              Fast triage for newly scraped auctions
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between px-4 lg:justify-end lg:px-6">
          <div className="flex min-w-0 flex-col lg:hidden">
            <a href="/" className="truncate text-2xl font-bold leading-none">
              Watched Listings
            </a>
            <p className="truncate text-sm text-slate-300">
              Fast triage for newly scraped auctions
            </p>
          </div>

        <button
          type="button"
          aria-label="Open filters"
          onClick={onOpenSidebar}
          className="inline-flex h-10 items-center rounded-lg border border-slate-500 px-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
        >
          Menu
        </button>
        </div>
      </div>
    </nav>
  );
}
