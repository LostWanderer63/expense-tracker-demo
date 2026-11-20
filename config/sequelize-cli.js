// Database settings for sequelize-cli (npm run migrate). Reads the same
// .env values as config/db.js through config/env.js.
const { db } = require("./env");

const connection = {
  username: db.user,
  password: db.password,
  database: db.name,
  host: db.host,
  port: db.port,
  dialect: "mysql",
  logging: false,
};

module.exports = {
  development: connection,
  test: connection,
  production: connection,
};
