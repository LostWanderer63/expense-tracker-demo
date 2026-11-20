const { sequelize } = require("../config/db");
const { User, Expense } = require("../models");
const geminiCategorizer = require("../services/geminiCategorizer");
const { logError } = require("../utils/logger");

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

const EXPENSE_FIELDS = ["id", "amount", "description", "category", "note", "createdAt"];

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getSummary(userId) {
  const [row] = await Expense.findAll({
    where: { userId },
    attributes: [
      [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("amount")), 0), "total"],
      [
        sequelize.fn(
          "COALESCE",
          sequelize.fn(
            "SUM",
            sequelize.literal(`CASE WHEN createdAt >= ${sequelize.escape(startOfMonth())} THEN amount ELSE 0 END`)
          ),
          0
        ),
        "thisMonth",
      ],
    ],
    raw: true,
  });
  return {
    count: Number(row.count),
    total: Number(row.total),
    thisMonth: Number(row.thisMonth),
  };
}

// GET /expense                 -> all expenses (used by the reports page)
// GET /expense?page=2&limit=10 -> one page, plus pagination info and summary
// Optional &category=Food filters the page.
async function getExpenses(req, res) {
  try {
    const order = [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ];

    if (req.query.page === undefined) {
      const expenses = await Expense.findAll({
        where: { userId: req.user.id },
        attributes: EXPENSE_FIELDS,
        order,
      });
      return res.status(200).json({ expenses });
    }

    const page = Number(req.query.page);
    const limit = req.query.limit === undefined ? DEFAULT_PAGE_SIZE : Number(req.query.limit);
    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({ message: "page must be a positive whole number" });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      return res.status(400).json({ message: `limit must be between 1 and ${MAX_PAGE_SIZE}` });
    }

    const category = req.query.category;
    if (category !== undefined && category !== "" && !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const where = { userId: req.user.id };
    if (category) where.category = category;

    const [{ count: total, rows }, summary] = await Promise.all([
      Expense.findAndCountAll({
        where,
        attributes: EXPENSE_FIELDS,
        order,
        limit,
        offset: (page - 1) * limit,
      }),
      getSummary(req.user.id),
    ]);

    return res.status(200).json({
      expenses: rows,
      pagination: {
        page,
        limit,
        total,
        lastPage: Math.max(1, Math.ceil(total / limit)),
      },
      summary,
    });
  } catch (err) {
    logError(err, req, "Get expenses error");
    return res.status(500).json({ message: "Could not load expenses" });
  }
}

async function addExpense(req, res) {
  let transaction;
  try {
    const amount = Number(req.body.amount);
    const description = (req.body.description || "").trim();
    const category = req.body.category;
    const note = typeof req.body.note === "string" ? req.body.note.trim() : "";

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
    if (note.length > 255) {
      return res.status(400).json({ message: "Note must be under 255 characters" });
    }

    const rounded = Math.round(amount * 100) / 100;

    transaction = await sequelize.transaction();
    await User.increment(
      { totalExpense: rounded },
      { where: { id: req.user.id }, transaction }
    );
    const created = await Expense.create(
      { userId: req.user.id, amount: rounded, description, category, note: note || null },
      { transaction }
    );
    await transaction.commit();

    const expense = await Expense.findByPk(created.id, { attributes: EXPENSE_FIELDS });

    return res.status(201).json({ message: "Expense added", expense });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    logError(err, req, "Add expense error");
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
    logError(err, req, "Delete expense error");
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
    logError(err, req, "Suggest category error");
    return res.status(502).json({ message: "Could not suggest a category" });
  }
}

module.exports = { getExpenses, addExpense, deleteExpense, suggestCategory, CATEGORIES };
