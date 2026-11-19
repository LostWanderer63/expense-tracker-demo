const User = require("./User");
const Expense = require("./Expense");
const Order = require("./Order");

const userForeignKey = { name: "userId", field: "user_id", allowNull: false };

User.hasMany(Expense, { foreignKey: userForeignKey, as: "expenses", onDelete: "CASCADE" });
Expense.belongsTo(User, { foreignKey: userForeignKey, as: "user" });

User.hasMany(Order, { foreignKey: userForeignKey, as: "orders", onDelete: "CASCADE" });
Order.belongsTo(User, { foreignKey: userForeignKey, as: "user" });

module.exports = { User, Expense, Order };
