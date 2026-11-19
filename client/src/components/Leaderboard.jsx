import { useEffect, useState } from "react";
import { fetchJSON, errorMessage } from "../api.js";
import { currency } from "../format.js";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ currentUserId, refreshKey }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [manualKey, setManualKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchJSON("/premium/showleaderboard")
      .then(({ leaderboard }) => {
        if (cancelled) return;
        setRows(leaderboard);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setRows(null);
        setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, manualKey]);

  return (
    <section className="card leaderboard-card" id="leaderboardCard">
      <div className="list-header">
        <h2 className="card-title">🏆 Leaderboard</h2>
        <button className="btn-ghost btn-sm" onClick={() => setManualKey((k) => k + 1)}>
          Refresh
        </button>
      </div>
      {error ? (
        <div className="state">{error}</div>
      ) : !rows ? (
        <div className="state">Loading leaderboard...</div>
      ) : rows.length === 0 ? (
        <div className="state">No users yet</div>
      ) : (
        <ol className="leaderboard-list">
          {rows.map((row, i) => {
            const me = row.id === currentUserId;
            return (
              <li key={row.id} className={`leader-item${me ? " me" : ""}`}>
                <span className={`leader-rank${i < 3 ? " medal" : ""}`} aria-label={`Rank ${i + 1}`}>
                  {i < 3 ? MEDALS[i] : i + 1}
                </span>
                <span className="leader-name" title={row.name}>
                  {row.name}
                  {me && <span className="leader-you">You</span>}
                </span>
                <span className="leader-total">{currency.format(row.totalExpense)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
