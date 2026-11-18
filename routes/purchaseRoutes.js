const express = require("express");
const authenticate = require("../middleware/auth");
const { createPremiumOrder, getOrderStatus } = require("../controllers/purchaseController");

const router = express.Router();

router.use(authenticate);

router.post("/premium", createPremiumOrder);
router.get("/status/:orderId", getOrderStatus);

module.exports = router;
