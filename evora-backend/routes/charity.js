const express = require("express");
const router = express.Router();
const {
  createDonation,
  getDonations,
  updateDonationStatus,
} = require("../controllers/charityController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.post("/donations", createDonation);
router.get("/donations", getDonations);
router.put("/donations/:id/status", updateDonationStatus);

module.exports = router;
