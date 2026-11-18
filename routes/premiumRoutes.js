const express = require("express");
const authenticate = require("../middleware/auth");
const requirePremium = require("../middleware/requirePremium");
const { getLeaderboard } = require("../controllers/premiumController");

const router = express.Router();

router.use(authenticate, requirePremium);

router.get("/showleaderboard", getLeaderboard);

module.exports = router;
