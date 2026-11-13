const express = require("express");
const router = express.Router();
const {
  createPayment,
  getPayments,
  getPaymentByBooking,
  payBalance,
  getAdminPayments,
} = require("../controllers/paymentController");
const { protect, restrictTo } = require("../middleware/auth");

router.use(protect);

router.post("/", createPayment);
router.get("/", getPayments);
router.get("/booking/:bookingId", getPaymentByBooking);
router.post("/:id/pay-balance", payBalance);
router.get("/admin", restrictTo("admin"), getAdminPayments);

module.exports = router;
