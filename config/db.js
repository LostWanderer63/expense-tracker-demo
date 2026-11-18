const mysql = require("mysql2/promise");

const DB_NAME = process.env.DB_NAME || "expense_tracker";

let pool;

async function initDB() {
  const baseConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "abcd@1234",
  };

  const conn = await mysql.createConnection(baseConfig);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await conn.end();

  pool = mysql.createPool({ ...baseConfig, database: DB_NAME, connectionLimit: 10 });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      is_premium BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [premiumCol] = await pool.query(
    "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_premium'",
    [DB_NAME]
  );
  if (premiumCol.length === 0) {
    await pool.query("ALTER TABLE users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE AFTER password");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      description VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      status ENUM('PENDING', 'SUCCESSFUL', 'FAILED') NOT NULL DEFAULT 'PENDING',
      payment_session_id VARCHAR(255),
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_order_user (user_id),
      CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  return pool;
}

function getPool() {
  if (!pool) throw new Error("DB not initialized");
  return pool;
}

module.exports = { initDB, getPool };
