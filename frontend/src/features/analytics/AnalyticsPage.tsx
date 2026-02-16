import { useEffect, useMemo, useState } from "react";

import {
  fetchAnalyticsSnapshot,
  type AnalyticsResponse,
  type AnalyticsMetricSnapshot,
  type AnalyticsRankingRow,
} from "../items/api";

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
        {new Intl.NumberFormat().format(value)}
      </p>
    </article>
  );
}

function RankingTable({
  title,
  rows,
}: {
  title: string;
  rows: AnalyticsRankingRow[];
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <th className="px-1 py-2 font-semibold">Name</th>
              <th className="px-1 py-2 text-right font-semibold">Items</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className="border-b border-slate-100 last:border-b-0 dark:border-slate-800"
              >
                <td className="px-1 py-2 text-slate-800 dark:text-slate-100">{row.name}</td>
                <td className="px-1 py-2 text-right font-medium text-slate-800 dark:text-slate-100">
                  {row.count}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-1 py-3 text-slate-500 dark:text-slate-400">
                  No ranking data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function AnalyticsPage() {
  const [snapshot, setSnapshot] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchAnalyticsSnapshot();
        if (!canceled) {
          setSnapshot(response);
        }
      } catch (err) {
        if (!canceled) {
          setSnapshot(null);
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      canceled = true;
    };
  }, []);

  const metrics: Array<{ key: keyof AnalyticsMetricSnapshot; label: string }> = useMemo(
    () => [
      { key: "total_items", label: "Total Items" },
      { key: "active_items", label: "Active Items" },
      { key: "ending_soon_items", label: "Ending in 24h" },
      { key: "new_last_7_days", label: "New Last 7 Days" },
      { key: "favorite_items", label: "Favorites" },
      { key: "hidden_items", label: "Hidden" },
    ],
    []
  );

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Snapshot of auction volume, active inventory, and top entities.
        </p>
      </header>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading analytics...</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {snapshot && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                value={snapshot.metrics[metric.key]}
              />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <RankingTable title="Top Sellers" rows={snapshot.top_sellers} />
            <RankingTable title="Top Categories" rows={snapshot.top_categories} />
          </div>
        </>
      )}
    </section>
  );
}
