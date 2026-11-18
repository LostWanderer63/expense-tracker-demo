const bcrypt = require("bcrypt");
const { getPool } = require("../config/db");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function signup(req, res) {
  try {
    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const pool = getPool();

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed]
    );

    return res.status(201).json({
      message: "User created successfully",
      user: { id: result.insertId, name, email },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "User already exists" });
    }
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

module.exports = { signup };
