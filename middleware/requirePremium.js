const { User } = require("../models");

async function requirePremium(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ["isPremium"] });
    if (!user || !user.isPremium) {
      return res.status(403).json({ message: "This feature is for premium members only" });
    }
    next();
  } catch (err) {
    console.error("Premium check error:", err);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

module.exports = requirePremium;
