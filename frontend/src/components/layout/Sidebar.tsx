import type { ReactNode } from "react";

interface SidebarProps {
  heading: string;
  toggleLabel: string;
  onToggle: () => void;
  children?: ReactNode;
}

export default function Sidebar({
  heading,
  toggleLabel,
  onToggle,
  children,
}: SidebarProps) {
  return (
    <section className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{heading}</h2>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          {toggleLabel}
        </button>
      </header>
      <div className="space-y-4 p-4 text-sm text-slate-700">{children}</div>
    </section>
  );
}
