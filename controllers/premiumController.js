const { fn, col, literal } = require("sequelize");
const { User, Expense } = require("../models");

async function getLeaderboard(req, res) {
  try {
    const rows = await User.findAll({
      attributes: [
        "id",
        "name",
        [fn("COALESCE", fn("SUM", col("expenses.amount")), 0), "totalExpense"],
      ],
      include: [{ model: Expense, as: "expenses", attributes: [] }],
      group: ["User.id", "User.name"],
      order: [
        [literal("totalExpense"), "DESC"],
        ["name", "ASC"],
      ],
      raw: true,
    });

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
