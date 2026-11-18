const express = require("express");
const authenticate = require("../middleware/auth");
const { signup, login, getMe } = require("../controllers/userController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authenticate, getMe);

module.exports = router;
