import { useState } from "react";
import { styleFor, currency, dateFmt, CATEGORIES, CATEGORY_STYLES } from "../format.js";
import Pagination from "./Pagination.jsx";

function ExpenseItem({ expense, onDelete }) {
  const [busy, setBusy] = useState(false);
  const style = styleFor(expense.category);

  async function handleDelete() {
    setBusy(true);
    const ok = await onDelete(expense.id);
    if (!ok) setBusy(false);
  }

  return (
    <li className={`expense-item${busy ? " removing" : ""}`}>
      <div className="expense-icon" style={{ background: style.bg }}>
        {style.icon}
      </div>
      <div className="expense-info">
        <div className="expense-desc" title={expense.description}>
          {expense.description}
        </div>
        <div className="expense-meta">
          <span className="badge" style={{ background: style.bg, color: style.color }}>
            {style.name}
          </span>
          <span>{dateFmt.format(new Date(expense.createdAt))}</span>
        </div>
      </div>
      <div className="expense-amount">{currency.format(expense.amount)}</div>
      <button
        className="delete-btn"
        aria-label={`Delete ${expense.description}`}
        title="Delete"
        onClick={handleDelete}
        disabled={busy}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
      </button>
    </li>
  );
}

export default function ExpenseList({
  expenses,
  pagination,
  loading,
  error,
  category,
  onCategoryChange,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  onDelete,
}) {
  const firstLoad = loading && !pagination;

  return (
    <section className="card list-card">
      <div className="list-header">
        <h2 className="card-title">Your expenses</h2>
        <select
          className="filter"
          aria-label="Filter by category"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_STYLES[cat].icon} {cat}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="state">{error}</div>
      ) : firstLoad ? (
        <div className="state">Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <div className="state empty">
          <span className="empty-icon">🧾</span>
          <p>{category ? `No ${category} expenses` : "No expenses yet"}</p>
          <small>{category ? "Try another category." : "Add your first expense to get started."}</small>
        </div>
      ) : (
        <>
          <ul className={`expense-list${loading ? " is-loading" : ""}`} aria-busy={loading}>
            {expenses.map((e) => (
              <ExpenseItem key={e.id} expense={e} onDelete={onDelete} />
            ))}
          </ul>
          {pagination && (
            <Pagination
              page={pagination.page}
              lastPage={pagination.lastPage}
              total={pagination.total}
              limit={pagination.limit}
              onChange={onPageChange}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              onPageSizeChange={onPageSizeChange}
              disabled={loading}
            />
          )}
        </>
      )}
    </section>
  );
}
