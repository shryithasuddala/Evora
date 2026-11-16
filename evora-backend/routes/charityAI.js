const express = require("express");
const router = express.Router();
const {
  createSurplusRecord,
  getNearbyCharities,
  recommendCharities,
  sendDonationRequest,
  updateRequestStatus,
  getDonationHistory,
  getIncomingRequests,
  getRequestById,
  listCharities,
  createCharity,
  updateCharity,
} = require("../controllers/charityAIController");
const { protect, authorize } = require("../middleware/auth");

// All Charity AI routes require valid JWT authentication
router.use(protect);

// 1. Surplus food assessment & geocoding
router.post("/surplus", createSurplusRecord);

// 2. Geospatial search for nearby charities
router.get("/nearby", getNearbyCharities);

// 3. AI ranking and rationale generation
router.post("/recommend", recommendCharities);

// 4. Send donation request to charity
router.post("/request", sendDonationRequest);

// 5. Update donation request status (accepted / declined / delivered)
router.patch("/request/:id/status", updateRequestStatus);

// 6. Donation request details & history
router.get("/request/:id", getRequestById);
router.get("/history/:eventId", getDonationHistory);

// 7. Incoming requests (for volunteers, charity coordinators, admin)
router.get("/incoming", getIncomingRequests);

// 8. Charity Directory management
router.get("/charities", listCharities);
router.post("/charities", authorize("admin"), createCharity);
router.patch("/charities/:id", authorize("admin"), updateCharity);

module.exports = router;
