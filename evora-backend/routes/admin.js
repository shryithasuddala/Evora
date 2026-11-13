const express = require("express");
const router = express.Router();
const {
  getPlatformStats,
  getAllUsers,
  toggleUserStatus,
  toggleVerified,
  deleteUser,
  getVolunteers,
  verifyVolunteer,
  getIdProofFile,
  exportReportData,
} = require("../controllers/adminController");
const { approveEvent } = require("../controllers/eventController");
const { protect, restrictTo } = require("../middleware/auth");

router.use(protect, restrictTo("admin"));

router.get("/stats", getPlatformStats);
router.get("/users", getAllUsers);
router.put("/users/:id/toggle-status", toggleUserStatus);
router.put("/users/:id/toggle-verify", toggleVerified);
router.delete("/users/:id", deleteUser);

// Event Approval
router.put("/events/:id/approve", approveEvent);

// Volunteer management
router.get("/volunteers", getVolunteers);
router.put("/volunteers/:id/verify", verifyVolunteer);
router.get("/idproof/:filename", getIdProofFile);

// Reports export
router.get("/reports/export/:resource", exportReportData);

module.exports = router;
