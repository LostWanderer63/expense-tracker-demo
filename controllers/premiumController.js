const { User } = require("../models");

async function getLeaderboard(req, res) {
  try {
    const leaderboard = await User.findAll({
      attributes: ["id", "name", "totalExpense"],
      order: [
        ["totalExpense", "DESC"],
        ["name", "ASC"],
      ],
    });

    return res.status(200).json({ leaderboard });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return res.status(500).json({ message: "Could not load leaderboard" });
  }
}

module.exports = { getLeaderboard };
