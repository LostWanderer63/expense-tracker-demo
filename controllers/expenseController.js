const { sequelize } = require("../config/db");
const { User, Expense } = require("../models");
const geminiCategorizer = require("../services/geminiCategorizer");

const CATEGORIES = [
  "Food",
  "Petrol",
  "Salary",
  "Shopping",
  "Bills",
  "Travel",
  "Entertainment",
  "Health",
  "Other",
];

const EXPENSE_FIELDS = ["id", "amount", "description", "category", "createdAt"];

async function getExpenses(req, res) {
  try {
    const expenses = await Expense.findAll({
      where: { userId: req.user.id },
      attributes: EXPENSE_FIELDS,
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
    });
    return res.status(200).json({ expenses });
  } catch (err) {
    console.error("Get expenses error:", err);
    return res.status(500).json({ message: "Could not load expenses" });
  }
}

async function addExpense(req, res) {
  let transaction;
  try {
    const amount = Number(req.body.amount);
    const description = (req.body.description || "").trim();
    const category = req.body.category;

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }
    if (amount > 99999999.99) {
      return res.status(400).json({ message: "Amount is too large" });
    }
    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }
    if (description.length > 255) {
      return res.status(400).json({ message: "Description must be under 255 characters" });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const rounded = Math.round(amount * 100) / 100;

    transaction = await sequelize.transaction();
    await User.increment(
      { totalExpense: rounded },
      { where: { id: req.user.id }, transaction }
    );
    const created = await Expense.create(
      { userId: req.user.id, amount: rounded, description, category },
      { transaction }
    );
    await transaction.commit();

    const expense = await Expense.findByPk(created.id, { attributes: EXPENSE_FIELDS });

    return res.status(201).json({ message: "Expense added", expense });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Add expense error:", err);
    return res.status(500).json({ message: "Could not add expense" });
  }
}

async function deleteExpense(req, res) {
  let transaction;
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid expense id" });
    }

    transaction = await sequelize.transaction();
    const expense = await Expense.findOne({
      where: { id, userId: req.user.id },
      attributes: ["id", "amount"],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({ message: "Expense not found" });
    }

    await User.decrement(
      { totalExpense: expense.amount },
      { where: { id: req.user.id }, transaction }
    );
    await expense.destroy({ transaction });
    await transaction.commit();

    return res.status(200).json({ message: "Expense deleted" });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Delete expense error:", err);
    return res.status(500).json({ message: "Could not delete expense" });
  }
}

async function suggestCategory(req, res) {
  const description = (req.body.description || "").trim();

  if (!description) {
    return res.status(400).json({ message: "Description is required" });
  }
  if (description.length > 255) {
    return res.status(400).json({ message: "Description must be under 255 characters" });
  }
  if (!geminiCategorizer.isConfigured()) {
    return res.status(503).json({ message: "AI suggestions are not configured" });
  }

  try {
    const category = await geminiCategorizer.suggestCategory(description, CATEGORIES);
    if (!category) {
      return res.status(502).json({ message: "Could not suggest a category" });
    }
    return res.status(200).json({ category });
  } catch (err) {
    console.error("Suggest category error:", err.message || err);
    return res.status(502).json({ message: "Could not suggest a category" });
  }
}

module.exports = { getExpenses, addExpense, deleteExpense, suggestCategory, CATEGORIES };
