const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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

async function login(req, res) {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const [rows] = await getPool().query(
      "SELECT id, name, email, password FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "User not authorized" });
    }

    const token = jwt.sign({ userId: user.id, name: user.name }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(200).json({
      message: "User login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

async function getMe(req, res) {
  try {
    const [rows] = await getPool().query(
      "SELECT id, name, email, is_premium FROM users WHERE id = ?",
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });
    const { id, name, email, is_premium } = rows[0];
    return res.status(200).json({ user: { id, name, email, isPremium: Boolean(is_premium) } });
  } catch (err) {
    console.error("Get me error:", err);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

module.exports = { signup, login, getMe };
