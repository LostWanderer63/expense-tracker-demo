const User = require("./User");
const Expense = require("./Expense");
const Order = require("./Order");
const ForgotPasswordRequest = require("./ForgotPasswordRequest");
const Note = require("./Note");

const userForeignKey = { name: "userId", field: "user_id", allowNull: false };

User.hasMany(Expense, { foreignKey: userForeignKey, as: "expenses", onDelete: "CASCADE" });
Expense.belongsTo(User, { foreignKey: userForeignKey, as: "user" });

User.hasMany(Order, { foreignKey: userForeignKey, as: "orders", onDelete: "CASCADE" });
Order.belongsTo(User, { foreignKey: userForeignKey, as: "user" });

User.hasMany(ForgotPasswordRequest, {
  foreignKey: userForeignKey,
  as: "forgotPasswordRequests",
  onDelete: "CASCADE",
});
ForgotPasswordRequest.belongsTo(User, { foreignKey: userForeignKey, as: "user" });

User.hasMany(Note, { foreignKey: userForeignKey, as: "notes", onDelete: "CASCADE" });
Note.belongsTo(User, { foreignKey: userForeignKey, as: "user" });

module.exports = { User, Expense, Order, ForgotPasswordRequest, Note };
