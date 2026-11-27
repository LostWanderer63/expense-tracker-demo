const crypto = require("crypto");
const { sequelize } = require("../config/db");
const { User, Order } = require("../models");
const env = require("../config/env");
const { cashfree, environment, CFEnvironment } = require("../config/cashfree");
const { logError } = require("../utils/logger");

const PREMIUM_PRICE = env.premiumPrice;

function cashfreeError(err) {
  return err.response?.data?.message || err.message;
}

async function createPremiumOrder(req, res) {
  let transaction;
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "isPremium"],
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isPremium || (await reconcilePendingOrders(user.id))) {
      return res.status(400).json({ message: "You are already a premium member" });
    }

    const orderId = `order_${user.id}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const appUrl = env.appUrl;

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

    transaction = await sequelize.transaction();
    await user.createOrder(
      {
        orderId,
        amount: PREMIUM_PRICE,
        status: "PENDING",
        paymentSessionId: data.payment_session_id,
      },
      { transaction }
    );
    await transaction.commit();

    return res.status(201).json({
      orderId,
      paymentSessionId: data.payment_session_id,
      amount: PREMIUM_PRICE,
      mode: environment === CFEnvironment.PRODUCTION ? "production" : "sandbox",
    });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    logError(err, req, `Create order error: ${cashfreeError(err)}`);
    return res.status(500).json({ message: "Could not start payment. Please try again." });
  }
}

// Asks Cashfree how a PENDING order went and saves the result.
// With an empty payment list the order counts as FAILED, unless `graceMs` says
// the customer may still be on the checkout page.
async function syncOrder(order, { graceMs = 0 } = {}) {
  const { data: payments } = await cashfree.PGOrderFetchPayments(order.orderId);

  let status;
  if (payments.some((p) => p.payment_status === "SUCCESS")) status = "SUCCESSFUL";
  else if (payments.some((p) => p.payment_status === "PENDING")) status = "PENDING";
  else if (Date.now() - new Date(order.createdAt).getTime() < graceMs) status = "PENDING";
  else status = "FAILED";

  if (status !== "PENDING") {
    const transaction = await sequelize.transaction();
    try {
      await order.update({ status }, { transaction });
      if (status === "SUCCESSFUL") {
        await User.update({ isPremium: true }, { where: { id: order.userId }, transaction });
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
  return status;
}

const RECONCILE_GRACE_MS = 30 * 60 * 1000;
const RECONCILE_LIMIT = 5;

// Settles a user's open orders, e.g. someone who paid but closed the tab before
// Cashfree redirected back. Returns true if one of them turned out to be paid.
async function reconcilePendingOrders(userId) {
  const orders = await Order.findAll({
    where: { userId, status: "PENDING" },
    order: [["createdAt", "DESC"]],
    limit: RECONCILE_LIMIT,
  });
  let paid = false;
  for (const order of orders) {
    try {
      if ((await syncOrder(order, { graceMs: RECONCILE_GRACE_MS })) === "SUCCESSFUL") paid = true;
    } catch (err) {
      logError(err, null, `Reconcile order ${order.orderId} error: ${cashfreeError(err)}`, "warn");
    }
  }
  return paid;
}

async function getOrderStatus(req, res) {
  const orderId = req.params.orderId;

  try {
    const order = await Order.findOne({ where: { orderId, userId: req.user.id } });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "PENDING") {
      return res.status(200).json({ orderId, status: order.status });
    }

    const status = await syncOrder(order);
    return res.status(200).json({ orderId, status });
  } catch (err) {
    logError(err, req, `Order status error: ${cashfreeError(err)}`);
    return res.status(500).json({ message: "Could not verify payment" });
  }
}

module.exports = { createPremiumOrder, getOrderStatus, reconcilePendingOrders };
