import { useCallback, useEffect, useState } from "react";
import { fetchJSON, errorMessage, isAbort, logout } from "./api.js";
import { currency } from "./format.js";
import useToast from "./useToast.js";
import ExpenseForm from "./components/ExpenseForm.jsx";
import ExpenseList from "./components/ExpenseList.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import ResultModal from "./components/ResultModal.jsx";

const PAGE_SIZE = 10;

export default function App() {
  const [user, setUser] = useState(null);
  const [userFailed, setUserFailed] = useState(false);

  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState({ expenses: [], pagination: null, summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [buying, setBuying] = useState(false);
  const [resultStatus, setResultStatus] = useState(null);
  const [toast, showToast] = useToast();

  const isPremium = Boolean(user?.isPremium);
  const reload = () => setReloadKey((k) => k + 1);

  // ----- expenses (one page at a time) -----
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (category) params.set("category", category);

    fetchJSON(`/expense?${params}`, { signal: controller.signal })
      .then((body) => {
        // Page no longer exists (e.g. last item on the last page was deleted).
        if (body.pagination.page > body.pagination.lastPage) {
          setPage(body.pagination.lastPage);
          return;
        }
        setData(body);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        if (isAbort(err)) return;
        setError(errorMessage(err));
        setLoading(false);
      });

    return () => controller.abort();
  }, [page, category, reloadKey]);

  function changePage(next) {
    setPage(next);
    document.querySelector(".list-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changeCategory(next) {
    setCategory(next);
    setPage(1);
  }

  function handleAdded() {
    showToast("Expense added");
    setPage(1);
    reload();
    setLeaderboardKey((k) => k + 1);
  }

  async function handleDelete(id) {
    try {
      await fetchJSON(`/expense/${id}`, { method: "DELETE" });
      showToast("Expense deleted");
      reload();
      setLeaderboardKey((k) => k + 1);
      return true;
    } catch (err) {
      showToast(errorMessage(err), "error");
      return false;
    }
  }

  // ----- user + premium -----
  const verifyOrder = useCallback(async (orderId) => {
    const { status } = await fetchJSON(`/purchase/status/${encodeURIComponent(orderId)}`);
    if (status === "SUCCESSFUL") setUser((u) => (u ? { ...u, isPremium: true } : u));
    setResultStatus(status);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { user: me } = await fetchJSON("/user/me");
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUserFailed(true);
      }

      // Returning from a Cashfree redirect: ?order_id=...
      const orderId = new URLSearchParams(window.location.search).get("order_id");
      if (!orderId || cancelled) return;
      window.history.replaceState(null, "", window.location.pathname);
      try {
        await verifyOrder(orderId);
      } catch (err) {
        showToast(errorMessage(err), "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [verifyOrder, showToast]);

  useEffect(() => {
    if (!isPremium) setLeaderboardOpen(false);
  }, [isPremium]);

  async function buyPremium() {
    if (typeof window.Cashfree !== "function") {
      showToast("Payment service failed to load. Check your connection.", "error");
      return;
    }
    setBuying(true);
    try {
      const order = await fetchJSON("/purchase/premium", { method: "POST" });
      const checkout = window.Cashfree({ mode: order.mode });
      const result = await checkout.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: "_modal",
      });
      if (result && result.redirect) return;
      await verifyOrder(order.orderId);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBuying(false);
    }
  }

  const closeResult = useCallback(() => setResultStatus(null), []);

  const summary = data.summary || { total: 0, thisMonth: 0, count: 0 };
  const showBuyButton = (user && !isPremium) || userFailed;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-logo">₹</span>
            <span className="brand-name">Expense Tracker</span>
          </div>
          <div className="topbar-right">
            <span className="greeting">Hi, {localStorage.getItem("userName") || "there"}</span>
            {showBuyButton && (
              <button className="btn-premium" onClick={buyPremium} disabled={buying}>
                ⭐ <span className="premium-label">Buy Premium Membership</span>
              </button>
            )}
            {isPremium && <span className="premium-badge">⭐ Premium</span>}
            <a href="../report/report.html" className="btn-ghost">
              📊 <span className="reports-label">Reports</span>
            </a>
            <button className="btn-ghost" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="stats">
          <div className="stat-card stat-primary">
            <span className="stat-label">Total spent</span>
            <span className="stat-value">{currency.format(summary.total)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">This month</span>
            <span className="stat-value">{currency.format(summary.thisMonth)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Entries</span>
            <span className="stat-value">{summary.count}</span>
          </div>
        </section>

        {isPremium && (
          <section className="premium-banner">
            <div className="premium-banner-text">
              <span className="premium-banner-icon">⭐</span>
              <div>
                <strong>You are a premium user</strong>
                <small>See how your spending compares with others.</small>
              </div>
            </div>
            <button
              className="btn-leaderboard"
              aria-expanded={leaderboardOpen}
              aria-controls="leaderboardCard"
              onClick={() => setLeaderboardOpen((o) => !o)}
            >
              {leaderboardOpen ? "Hide Leaderboard" : "Show Leaderboard"}
            </button>
          </section>
        )}

        <div className="layout">
          <ExpenseForm onAdded={handleAdded} />

          <div className="right-col">
            {leaderboardOpen && (
              <Leaderboard currentUserId={user?.id} refreshKey={leaderboardKey} />
            )}
            <ExpenseList
              expenses={data.expenses}
              pagination={data.pagination}
              loading={loading}
              error={error}
              category={category}
              onCategoryChange={changeCategory}
              onPageChange={changePage}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </main>

      <div className={`toast${toast.show ? " show" : ""}${toast.type === "error" ? " error" : ""}`} role="status" aria-live="polite">
        {toast.text}
      </div>

      <ResultModal status={resultStatus} onClose={closeResult} />
    </>
  );
}
