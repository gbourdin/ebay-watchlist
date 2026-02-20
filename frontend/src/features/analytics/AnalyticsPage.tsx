import { useEffect, useMemo, useState } from "react";

import {
  fetchAnalyticsSnapshot,
  type AnalyticsDistributionRow,
  type AnalyticsResponse,
  type AnalyticsMetricSnapshot,
  type AnalyticsRankingRow,
} from "../items/api";

function computeNiceAxisStep(maxValue: number, maxTicks = 7): number {
  if (maxValue <= 0) {
    return 1;
  }

  const rawStep = maxValue / Math.max(1, maxTicks - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;

  if (normalized < 1.5) {
    return 1 * magnitude;
  }
  if (normalized < 3) {
    return 2 * magnitude;
  }
  if (normalized < 7) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

function buildAxisTicks(maxValue: number): number[] {
  const axisStep = computeNiceAxisStep(maxValue, 7);
  const axisMax = Math.max(axisStep, Math.ceil(maxValue / axisStep) * axisStep);
  const tickCount = Math.floor(axisMax / axisStep) + 1;

  return Array.from({ length: tickCount }, (_, tickIndex) => axisMax - tickIndex * axisStep);
}

function formatAxisTick(value: number, mode: "absolute" | "relative"): string {
  if (mode === "relative") {
    return `${Math.round(value)}%`;
  }

  if (value >= 1000) {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }

  return String(Math.round(value));
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
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
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
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

function DistributionBarChart({
  chartId,
  title,
  rows,
  dense = false,
}: {
  chartId: string;
  title: string;
  rows: AnalyticsDistributionRow[];
  dense?: boolean;
}) {
  const [displayMode, setDisplayMode] = useState<"absolute" | "relative">("absolute");
  const maxCount = rows.reduce((currentMax, row) => Math.max(currentMax, row.count), 0);
  const totalCount = rows.reduce((total, row) => total + row.count, 0);
  const maxRelativeValue = totalCount > 0
    ? rows.reduce((currentMax, row) => Math.max(currentMax, (row.count / totalCount) * 100), 0)
    : 0;
  const compactLabels = dense && rows.length > 12;
  const labelInterval = compactLabels ? 2 : 1;
  const minPlotWidth = rows.length * (dense ? 28 : 36);
  const axisTicks = buildAxisTicks(displayMode === "relative" ? maxRelativeValue : maxCount);
  const axisMax = axisTicks[0] ?? 1;
  const axisTickDivisor = Math.max(1, axisTicks.length - 1);
  const axisLabelInterval = axisTicks.length > 7 ? 2 : 1;
  const chartHeightClass = dense ? "h-48 sm:h-56" : "h-56 sm:h-64";

  function rowValue(row: AnalyticsDistributionRow): number {
    if (displayMode === "absolute") {
      return row.count;
    }
    if (totalCount === 0) {
      return 0;
    }
    return (row.count / totalCount) * 100;
  }

  function rowValueLabel(row: AnalyticsDistributionRow): string {
    if (displayMode === "absolute") {
      return String(row.count);
    }
    return `${rowValue(row).toFixed(1)}%`;
  }

  return (
    <article
      data-testid={`distribution-card-${chartId}`}
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <div
          className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600"
          role="group"
          aria-label={`Value mode for ${title}`}
        >
          <button
            type="button"
            onClick={() => setDisplayMode("absolute")}
            aria-label={`Show counts for ${title}`}
            className={`px-2 py-1 text-xs font-medium transition ${
              displayMode === "absolute"
                ? "bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-900"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Count
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("relative")}
            aria-label={`Show percentages for ${title}`}
            className={`border-l border-slate-300 px-2 py-1 text-xs font-medium transition dark:border-slate-600 ${
              displayMode === "relative"
                ? "bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-900"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            %
          </button>
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          No distribution data available.
        </p>
      ) : (
        <div className="mt-3 max-w-full overflow-x-auto pb-2">
          <div className="grid w-max min-w-full grid-cols-[3.25rem_auto] gap-2">
            <ol
              data-testid={`distribution-axis-${chartId}`}
              aria-hidden="true"
              className={`relative ${chartHeightClass} text-[10px] text-slate-500 dark:text-slate-400`}
            >
              {axisTicks.map((tick, index) => (
                <li
                  key={`${chartId}-axis-${tick}-${index}`}
                  className={`absolute right-0 ${
                    index === 0 ? "translate-y-0" : index === axisTicks.length - 1 ? "-translate-y-full" : "-translate-y-1/2"
                  }`}
                  style={{ top: `${(index / axisTickDivisor) * 100}%` }}
                >
                  {index % axisLabelInterval === 0 || index === axisTicks.length - 1
                    ? formatAxisTick(tick, displayMode)
                    : ""}
                </li>
              ))}
            </ol>

            <ol
              data-testid={`distribution-bars-${chartId}`}
              className={`relative flex w-full items-end gap-1 border-b border-l border-slate-300 px-1 dark:border-slate-600 sm:gap-2 ${chartHeightClass}`}
              style={{ minWidth: `${minPlotWidth}px` }}
            >
              {axisTicks.map((_, index) => (
                <span
                  key={`${chartId}-grid-${index}`}
                  className={`absolute left-0 right-0 border-t border-dashed border-slate-200 dark:border-slate-700 ${
                    index === axisTicks.length - 1 ? "border-slate-300 dark:border-slate-600" : ""
                  }`}
                  style={{ top: `${(index / axisTickDivisor) * 100}%` }}
                />
              ))}
              {rows.map((row, index) => {
                const value = rowValue(row);
                const ratio = axisMax > 0 ? value / axisMax : 0;
                const barHeight = value > 0 ? Math.max(3, ratio * 100) : 0;
                return (
                  <li
                    key={row.label}
                    className="relative h-full flex-1"
                  >
                    <span className="absolute inset-x-0 bottom-5 top-1">
                      <span
                        title={`${row.label}: ${rowValueLabel(row)}`}
                        className="absolute inset-x-0 bottom-0 block rounded-t-sm bg-sky-600 dark:bg-sky-500"
                        style={{ height: `${barHeight}%` }}
                      />
                    </span>
                    <span className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 truncate text-center text-[10px] font-medium text-slate-700 dark:text-slate-300">
                      {index % labelInterval === 0 ? row.label : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
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
    <section className="min-w-0 space-y-6">
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
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                value={snapshot.metrics[metric.key]}
              />
            ))}
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <RankingTable title="Top Sellers" rows={snapshot.top_sellers} />
            <RankingTable title="Top Categories" rows={snapshot.top_categories} />
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <DistributionBarChart
              chartId="posted-by-month"
              title="Items Posted per Month"
              rows={snapshot.distributions.posted_by_month}
            />
            <DistributionBarChart
              chartId="posted-by-weekday"
              title="Items Posted by Day of Week"
              rows={snapshot.distributions.posted_by_weekday}
            />
          </div>

          <div className="grid min-w-0 gap-4">
            <DistributionBarChart
              chartId="posted-by-hour"
              title="Items Posted by Hour of Day (UTC)"
              rows={snapshot.distributions.posted_by_hour}
              dense
            />
          </div>
        </>
      )}
    </section>
  );
}
