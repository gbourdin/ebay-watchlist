interface NavbarProps {
  onOpenSidebar: () => void;
}

export default function Navbar({ onOpenSidebar }: NavbarProps) {
  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 lg:px-6">
        <div className="flex min-w-0 flex-col">
          <a href="/" className="truncate text-2xl font-bold leading-none">
            Watched Listings
          </a>
          <p className="truncate text-sm text-slate-300">Fast triage for newly scraped auctions</p>
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
    </nav>
  );
}
