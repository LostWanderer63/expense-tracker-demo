// Database settings for sequelize-cli (npm run migrate). Same .env values
// and defaults as config/db.js.
require("dotenv").config({ quiet: true });

const connection = {
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "abcd@1234",
  database: process.env.DB_NAME || "expense_tracker",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  dialect: "mysql",
  logging: false,
};

module.exports = {
  development: connection,
  test: connection,
  production: connection,
};
