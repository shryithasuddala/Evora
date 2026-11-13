const express = require("express");
const router = express.Router();
const {
  register,
  requestRegisterOtp,
  verifyRegisterOtp,
  login,
  resetPassword,
  sendOtp,
  verifyOtp,
  getMe,
  updateMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/register", register);
router.post("/register-otp", requestRegisterOtp);
router.post("/verify-register-otp", verifyRegisterOtp);
router.post("/login", login);
router.post("/reset-password", resetPassword);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

module.exports = router;
