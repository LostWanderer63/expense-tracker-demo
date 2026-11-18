const express = require("express");
const authenticate = require("../middleware/auth");
const { getExpenses, addExpense, deleteExpense } = require("../controllers/expenseController");

const router = express.Router();

router.use(authenticate);

router.get("/", getExpenses);
router.post("/", addExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
