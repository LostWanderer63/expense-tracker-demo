const { getPool } = require("../config/db");

async function getLeaderboard(req, res) {
  try {
    const [rows] = await getPool().query(`
      SELECT u.id, u.name, COALESCE(SUM(e.amount), 0) AS totalExpense
      FROM users u
      LEFT JOIN expenses e ON e.user_id = u.id
      GROUP BY u.id, u.name
      ORDER BY totalExpense DESC, u.name ASC
    `);

    const leaderboard = rows.map((r) => ({
      id: r.id,
      name: r.name,
      totalExpense: Number(r.totalExpense),
    }));

    return res.status(200).json({ leaderboard });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return res.status(500).json({ message: "Could not load leaderboard" });
  }
}

module.exports = { getLeaderboard };
