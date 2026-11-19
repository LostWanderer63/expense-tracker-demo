const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      field: "order_id",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "SUCCESSFUL", "FAILED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    paymentSessionId: {
      type: DataTypes.STRING(255),
      field: "payment_session_id",
    },
  },
  {
    tableName: "orders",
    timestamps: true,
  }
);

module.exports = Order;
