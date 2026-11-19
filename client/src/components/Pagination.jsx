// Page numbers to show: always the first and last page, plus a window
// around the current page, with "…" for the gaps.
function pageItems(page, lastPage) {
  const pages = new Set([1, lastPage, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= lastPage).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(`gap-${p}`);
    items.push(p);
  });
  return items;
}

export default function Pagination({ page, lastPage, total, limit, onChange, disabled }) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="pagination" aria-label="Expense pages">
      <p className="pagination-info">
        Showing <strong>{from}–{to}</strong> of <strong>{total}</strong>
        <span className="pagination-sep">·</span>
        Page {page} of {lastPage}
      </p>

      {lastPage > 1 && (
        <div className="pagination-controls">
          <button
            type="button"
            className="page-btn"
            onClick={() => onChange(page - 1)}
            disabled={disabled || page === 1}
            aria-label="Previous page"
          >
            ‹ Prev
          </button>

          {pageItems(page, lastPage).map((item) =>
            typeof item === "string" ? (
              <span key={item} className="page-gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`page-btn page-num${item === page ? " active" : ""}`}
                onClick={() => onChange(item)}
                disabled={disabled}
                aria-label={item === lastPage ? `Page ${item}, last page` : `Page ${item}`}
                aria-current={item === page ? "page" : undefined}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            className="page-btn"
            onClick={() => onChange(page + 1)}
            disabled={disabled || page === lastPage}
            aria-label="Next page"
          >
            Next ›
          </button>
        </div>
      )}
    </nav>
  );
}
