interface PaginationControlsProps {
  page: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}

type PageToken = number | "...";

function buildPageTokens(page: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const tokens: PageToken[] = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);

  if (left > 2) {
    tokens.push("...");
  }

  for (let current = left; current <= right; current += 1) {
    tokens.push(current);
  }

  if (right < totalPages - 1) {
    tokens.push("...");
  }

  tokens.push(totalPages);
  return tokens;
}

export default function PaginationControls({
  page,
  totalPages,
  hasPrev,
  hasNext,
  onPageChange,
}: PaginationControlsProps) {
  const normalizedTotalPages = Math.max(totalPages, 1);
  const normalizedPage = Math.min(Math.max(page, 1), normalizedTotalPages);
  const pageTokens = buildPageTokens(normalizedPage, normalizedTotalPages);
  const canGoPrev = hasPrev && normalizedPage > 1;
  const canGoNext = hasNext && normalizedPage < normalizedTotalPages;

  function jump(nextPage: number) {
    if (nextPage === normalizedPage) {
      return;
    }
    onPageChange(nextPage);
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">Page {normalizedPage} of {normalizedTotalPages}</p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => jump(1)}
          disabled={!canGoPrev}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          First
        </button>
        <button
          type="button"
          onClick={() => jump(normalizedPage - 1)}
          disabled={!canGoPrev}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Previous
        </button>

        {pageTokens.map((token, index) =>
          token === "..." ? (
            <span key={`ellipsis-${index}`} className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
              ...
            </span>
          ) : (
            <button
              key={`page-${token}`}
              type="button"
              onClick={() => jump(token)}
              aria-current={token === normalizedPage ? "page" : undefined}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                token === normalizedPage
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {token}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => jump(normalizedPage + 1)}
          disabled={!canGoNext}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => jump(normalizedTotalPages)}
          disabled={!canGoNext}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Last
        </button>
      </div>
    </nav>
  );
}
