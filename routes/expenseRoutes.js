const express = require("express");
const authenticate = require("../middleware/auth");
const { premiumOnly } = require("../middleware/requirePremium");
const {
  getExpenses,
  addExpense,
  deleteExpense,
  suggestCategory,
  downloadExpenses,
} = require("../controllers/expenseController");

const router = express.Router();

router.use(authenticate);

router.get("/", getExpenses);
// Premium only; everyone else gets 401 Unauthorized.
router.get("/download", premiumOnly(401), downloadExpenses);
router.post("/", addExpense);
router.post("/suggest-category", suggestCategory);
router.delete("/:id", deleteExpense);

module.exports = router;
