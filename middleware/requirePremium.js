const { getPool } = require("../config/db");

async function requirePremium(req, res, next) {
  try {
    const [rows] = await getPool().query("SELECT is_premium FROM users WHERE id = ?", [req.user.id]);
    if (!rows[0] || !rows[0].is_premium) {
      return res.status(403).json({ message: "This feature is for premium members only" });
    }
    next();
  } catch (err) {
    console.error("Premium check error:", err);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

module.exports = requirePremium;
