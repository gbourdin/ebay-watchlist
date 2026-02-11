import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const SIDEBAR_STORAGE_KEY = "ebay-watchlist.sidebar.open";

interface AppShellProps {
  children?: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) != "0";
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, desktopSidebarOpen ? "1" : "0");
  }, [desktopSidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar onOpenSidebar={() => setMobileSidebarOpen(true)} />

      <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-20 lg:px-6">
        <div className="relative flex items-start gap-5">
          <aside
            data-testid="desktop-sidebar"
            data-open={desktopSidebarOpen ? "true" : "false"}
            className={`relative hidden shrink-0 transition-[width] duration-200 lg:block ${
              desktopSidebarOpen ? "w-[320px]" : "w-0"
            }`}
          >
            <div
              className={`h-[calc(100vh-7.5rem)] overflow-y-auto transition-opacity ${
                desktopSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <Sidebar
                heading="Filters"
                toggleLabel="Hide"
                onToggle={() => setDesktopSidebarOpen(false)}
              >
                <p>Sidebar controls will be implemented in the next tasks.</p>
              </Sidebar>
            </div>

            {!desktopSidebarOpen && (
              <button
                type="button"
                onClick={() => setDesktopSidebarOpen(true)}
                className="absolute left-0 top-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                Show Filters
              </button>
            )}
          </aside>

          <main
            data-testid="results-main"
            data-sidebar-open={desktopSidebarOpen ? "true" : "false"}
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6"
          >
            {children ?? (
              <>
                <h1 className="text-lg font-semibold text-slate-900">Latest Items</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Table and card views are coming next.
                </p>
              </>
            )}
          </main>
        </div>
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 lg:hidden" role="presentation">
          <div
            role="dialog"
            aria-label="Filters"
            className="h-full w-[85vw] max-w-sm border-r border-slate-300 bg-white shadow-xl"
          >
            <div className="h-full overflow-y-auto p-4">
              <Sidebar heading="Filters" toggleLabel="Close" onToggle={() => setMobileSidebarOpen(false)}>
                <p>Sidebar controls will be implemented in the next tasks.</p>
              </Sidebar>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
