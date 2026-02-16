import type { ReactNode } from "react";

interface SidebarProps {
  heading: string;
  toggleLabel: string;
  onToggle: () => void;
  toggleAriaLabel?: string;
  children?: ReactNode;
}

export default function Sidebar({
  heading,
  toggleLabel,
  onToggle,
  toggleAriaLabel,
  children,
}: SidebarProps) {
  return (
    <section className="h-full bg-[#040823] text-slate-100 dark:bg-[#040823] dark:text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3 dark:border-slate-800">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 dark:text-slate-300">
          {heading}
        </h2>
        <button
          type="button"
          onClick={onToggle}
          aria-label={toggleAriaLabel ?? "Collapse filters"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 text-base font-semibold text-slate-100 transition hover:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          {toggleLabel}
        </button>
      </header>
      <div className="space-y-4 p-4 text-sm text-slate-100 dark:text-slate-100">{children}</div>
    </section>
  );
}
