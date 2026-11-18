const { getPool } = require("../config/db");

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

async function getExpenses(req, res) {
  try {
    const [rows] = await getPool().query(
      "SELECT id, amount, description, category, createdAt FROM expenses WHERE user_id = ? ORDER BY createdAt DESC, id DESC",
      [req.user.id]
    );
    const expenses = rows.map((r) => ({ ...r, amount: Number(r.amount) }));
    return res.status(200).json({ expenses });
  } catch (err) {
    console.error("Get expenses error:", err);
    return res.status(500).json({ message: "Could not load expenses" });
  }
}

async function addExpense(req, res) {
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
    const [result] = await getPool().query(
      "INSERT INTO expenses (user_id, amount, description, category) VALUES (?, ?, ?, ?)",
      [req.user.id, rounded, description, category]
    );

    const [rows] = await getPool().query(
      "SELECT id, amount, description, category, createdAt FROM expenses WHERE id = ?",
      [result.insertId]
    );

    return res.status(201).json({
      message: "Expense added",
      expense: { ...rows[0], amount: Number(rows[0].amount) },
    });
  } catch (err) {
    console.error("Add expense error:", err);
    return res.status(500).json({ message: "Could not add expense" });
  }
}

async function deleteExpense(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid expense id" });
    }

    const [result] = await getPool().query(
      "DELETE FROM expenses WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.status(200).json({ message: "Expense deleted" });
  } catch (err) {
    console.error("Delete expense error:", err);
    return res.status(500).json({ message: "Could not delete expense" });
  }
}

module.exports = { getExpenses, addExpense, deleteExpense, CATEGORIES };
