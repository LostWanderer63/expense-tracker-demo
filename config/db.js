const mysql = require("mysql2/promise");
const { Sequelize } = require("sequelize");

const DB_NAME = process.env.DB_NAME || "expense_tracker";
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "abcd@1234";

function localOffset() {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "mysql",
  timezone: process.env.DB_TIMEZONE || localOffset(),
  logging: false,
  dialectOptions: { decimalNumbers: true },
  pool: { max: 10, min: 0, idle: 10000 },
});

async function initDB() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await conn.end();

  await sequelize.authenticate();

  require("../models");
  await sequelize.sync();

  const queryInterface = sequelize.getQueryInterface();
  const userColumns = await queryInterface.describeTable("users");
  if (!userColumns.is_premium) {
    await queryInterface.addColumn("users", "is_premium", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }
  if (!userColumns.total_expense) {
    await queryInterface.addColumn("users", "total_expense", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await sequelize.query(`
      UPDATE users u
      SET total_expense = (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.user_id = u.id)
    `);
  }

  return sequelize;
}

module.exports = { sequelize, initDB };
