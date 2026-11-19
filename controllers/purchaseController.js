const crypto = require("crypto");
const { sequelize } = require("../config/db");
const { User, Order } = require("../models");
const { cashfree, environment, CFEnvironment } = require("../config/cashfree");

const PREMIUM_PRICE = 499;

function cashfreeError(err) {
  return err.response?.data?.message || err.message;
}

async function createPremiumOrder(req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "isPremium"],
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isPremium) return res.status(400).json({ message: "You are already a premium member" });

    const orderId = `order_${user.id}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

    const { data } = await cashfree.PGCreateOrder({
      order_id: orderId,
      order_amount: PREMIUM_PRICE,
      order_currency: "INR",
      customer_details: {
        customer_id: `user_${user.id}`,
        customer_name: user.name,
        customer_email: user.email,
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `${appUrl}/dashboard/expense.html?order_id=${orderId}`,
      },
      order_note: "Premium membership",
    });

    await user.createOrder({
      orderId,
      amount: PREMIUM_PRICE,
      status: "PENDING",
      paymentSessionId: data.payment_session_id,
    });

    return res.status(201).json({
      orderId,
      paymentSessionId: data.payment_session_id,
      amount: PREMIUM_PRICE,
      mode: environment === CFEnvironment.PRODUCTION ? "production" : "sandbox",
    });
  } catch (err) {
    console.error("Create order error:", cashfreeError(err));
    return res.status(500).json({ message: "Could not start payment. Please try again." });
  }
}

async function getOrderStatus(req, res) {
  const orderId = req.params.orderId;

  try {
    const order = await Order.findOne({ where: { orderId, userId: req.user.id } });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "PENDING") {
      return res.status(200).json({ orderId, status: order.status });
    }

    const { data: payments } = await cashfree.PGOrderFetchPayments(orderId);

    let status;
    if (payments.some((p) => p.payment_status === "SUCCESS")) status = "SUCCESSFUL";
    else if (payments.some((p) => p.payment_status === "PENDING")) status = "PENDING";
    else status = "FAILED";

    if (status === "SUCCESSFUL") {
      await sequelize.transaction(async (transaction) => {
        await order.update({ status: "SUCCESSFUL" }, { transaction });
        await User.update({ isPremium: true }, { where: { id: req.user.id }, transaction });
      });
    } else if (status === "FAILED") {
      await order.update({ status: "FAILED" });
    }

    return res.status(200).json({ orderId, status });
  } catch (err) {
    console.error("Order status error:", cashfreeError(err));
    return res.status(500).json({ message: "Could not verify payment" });
  }
}

module.exports = { createPremiumOrder, getOrderStatus };
