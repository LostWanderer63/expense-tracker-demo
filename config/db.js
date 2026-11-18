const mysql = require("mysql2/promise");

const DB_NAME = process.env.DB_NAME || "expense_tracker";

let pool;

async function initDB() {
  const baseConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return pool;
}

function getPool() {
  if (!pool) throw new Error("DB not initialized");
  return pool;
}

module.exports = { initDB, getPool };
