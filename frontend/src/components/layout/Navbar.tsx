import { useEffect, useRef, useState } from "react";

import type { AppRoutePath } from "../../app/routes";

interface NavbarProps {
  onOpenSidebar?: () => void;
  activePath?: AppRoutePath;
  onNavigate?: (path: AppRoutePath) => void;
}

type NavDestination = {
  label: string;
  path: AppRoutePath;
};

const NAV_DESTINATIONS: NavDestination[] = [
  { label: "Home", path: "/" },
  { label: "Manage Watchlist", path: "/manage" },
  { label: "Analytics", path: "/analytics" },
];

export default function Navbar({
  onOpenSidebar,
  activePath = "/",
  onNavigate,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onWindowClick(event: MouseEvent) {
      if (!menuRef.current) {
        return;
      }
      if (event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      window.addEventListener("click", onWindowClick);
    }

    return () => {
      window.removeEventListener("click", onWindowClick);
    };
  }, [menuOpen]);

  function navigate(path: AppRoutePath) {
    if (onNavigate) {
      onNavigate(path);
      setMenuOpen(false);
      return;
    }

    if (window.location.pathname !== path) {
      window.location.assign(path);
    }
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur">
      <div className="flex h-16 w-full">
        <div
          data-testid="navbar-brand-panel"
          className="hidden h-full w-[320px] shrink-0 items-center px-6 lg:flex"
        >
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="truncate text-left text-2xl font-bold leading-none text-slate-100"
            >
              Watched Listings
            </button>
            <p className="truncate text-sm text-slate-300">
              Fast triage for newly scraped auctions
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between px-4 lg:justify-end lg:px-6">
          <div className="flex min-w-0 flex-col lg:hidden">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="truncate text-left text-2xl font-bold leading-none text-slate-100"
            >
              Watched Listings
            </button>
            <p className="truncate text-sm text-slate-300">
              Fast triage for newly scraped auctions
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSidebar && (
              <button
                type="button"
                aria-label="Open filters"
                onClick={onOpenSidebar}
                className="inline-flex h-10 items-center rounded-lg border border-slate-500 px-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                Filters
              </button>
            )}

            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="Open navigation menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
                className="inline-flex h-10 items-center rounded-lg border border-slate-500 px-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                Menu
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-52 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                  <ul className="py-1">
                    {NAV_DESTINATIONS.map((destination) => {
                      const active =
                        destination.path === "/"
                          ? activePath === "/" || activePath === "/favorites"
                          : activePath === destination.path;
                      return (
                        <li key={destination.path}>
                          <button
                            type="button"
                            onClick={() => navigate(destination.path)}
                            className={`block w-full px-3 py-2 text-left text-sm transition ${
                              active
                                ? "bg-slate-800 text-slate-100"
                                : "text-slate-200 hover:bg-slate-800"
                            }`}
                          >
                            {destination.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
