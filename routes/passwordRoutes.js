const express = require("express");
const {
  forgotPassword,
  showResetForm,
  updatePassword,
} = require("../controllers/passwordController");

const router = express.Router();

router.post("/forgotpassword", forgotPassword);
router.get("/resetpassword/:id", showResetForm);
router.post("/updatepassword/:id", updatePassword);

module.exports = router;
