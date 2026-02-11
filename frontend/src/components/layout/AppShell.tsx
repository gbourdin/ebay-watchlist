import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const SIDEBAR_STORAGE_KEY = "ebay-watchlist.sidebar.open";

interface RailActions {
  favoritesOnly: boolean;
  showHidden: boolean;
  onToggleFavoritesOnly: () => void;
  onToggleShowHidden: () => void;
}

interface AppShellProps {
  children?: ReactNode;
  sidebar?: ReactNode;
  railActions?: RailActions;
}

function RailButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600 bg-slate-900/80 text-slate-200 transition hover:bg-slate-800"
    >
      {icon}
    </button>
  );
}

function EyeIcon({ closed }: { closed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z" />
      {!closed && <circle cx="12" cy="12" r="3" />}
      {closed && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function AppShell({ children, sidebar, railActions }: AppShellProps) {
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

      <div className="pt-16">
        <div className="flex min-h-[calc(100vh-4rem)] items-stretch">
          <aside
            data-testid="desktop-sidebar"
            data-open={desktopSidebarOpen ? "true" : "false"}
            className={`fixed bottom-0 left-0 top-16 z-30 hidden shrink-0 border-r border-slate-800 bg-[#040823] transition-[width] duration-200 lg:block ${
              desktopSidebarOpen ? "w-[320px]" : "w-[72px]"
            }`}
          >
            {desktopSidebarOpen ? (
              <div className="h-full overflow-y-auto">
                <Sidebar
                  heading="Filters"
                  toggleLabel="←"
                  onToggle={() => setDesktopSidebarOpen(false)}
                >
                  {sidebar ?? <p>Sidebar controls will be implemented in the next tasks.</p>}
                </Sidebar>
              </div>
            ) : (
              <div
                data-testid="sidebar-rail"
                className="flex h-full flex-col items-center gap-3 px-2 py-3"
              >
                <RailButton
                  label="Expand filters panel"
                  onClick={() => setDesktopSidebarOpen(true)}
                  icon={<span className="text-lg font-semibold leading-none">›</span>}
                />
                {railActions && (
                  <>
                    <RailButton
                      label={
                        railActions.favoritesOnly
                          ? "Disable favorites-only filter"
                          : "Enable favorites-only filter"
                      }
                      onClick={railActions.onToggleFavoritesOnly}
                      icon={
                        <span
                          className={`text-base leading-none ${
                            railActions.favoritesOnly ? "text-amber-300" : "text-slate-300"
                          }`}
                        >
                          {railActions.favoritesOnly ? "★" : "☆"}
                        </span>
                      }
                    />
                    <RailButton
                      label={
                        railActions.showHidden
                          ? "Hide hidden items"
                          : "Show hidden items"
                      }
                      onClick={railActions.onToggleShowHidden}
                      icon={
                        <span
                          className={
                            railActions.showHidden ? "text-sky-300" : "text-slate-300"
                          }
                        >
                          <EyeIcon closed={!railActions.showHidden} />
                        </span>
                      }
                    />
                  </>
                )}
              </div>
            )}
          </aside>

          <div
            className={`min-w-0 flex-1 p-4 lg:p-6 ${
              desktopSidebarOpen ? "lg:pl-[344px]" : "lg:pl-[96px]"
            }`}
          >
            <main
              data-testid="results-main"
              data-sidebar-open={desktopSidebarOpen ? "true" : "false"}
              className="min-h-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6"
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
                {sidebar ?? <p>Sidebar controls will be implemented in the next tasks.</p>}
              </Sidebar>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
