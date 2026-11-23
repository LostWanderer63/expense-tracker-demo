const { User } = require("../models");
const { logError } = require("../utils/logger");

/**
 * Only let premium members through. `status` is the code sent to everyone else
 * (403 by default; the download route uses 401 as its spec asks). The reply
 * carries code PREMIUM_REQUIRED so the frontend can tell it apart from an
 * expired login, which is also a 401.
 */
function premiumOnly(status = 403) {
  return async function requirePremium(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, { attributes: ["isPremium"] });
      if (!user || !user.isPremium) {
        return res.status(status).json({
          message: "This feature is for premium members only",
          code: "PREMIUM_REQUIRED",
        });
      }
      next();
    } catch (err) {
      logError(err, req, "Premium check error");
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  };
}

module.exports = premiumOnly();
module.exports.premiumOnly = premiumOnly;
