const express = require("express");
const router = express.Router();
const {
  getVendorAvailability,
  updateMyAvailability,
} = require("../controllers/availabilityController");
const { protect, restrictTo } = require("../middleware/auth");

router.get("/:vendorId", getVendorAvailability);
router.put("/", protect, restrictTo("vendor", "admin"), updateMyAvailability);

module.exports = router;
