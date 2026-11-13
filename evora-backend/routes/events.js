const express = require("express");
const router = express.Router();
const {
  createEvent,
  getMyEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  savePlan,
  suggestAlternatives,
  updateSchedule,
  updateChecklist,
  approveEvent,
  cancelEvent,
  getEventVendorReadiness,
  assignVendorToEvent,
  sendVendorRequest,
  updateFeatureExclusion,
  // Coordination Engine Controllers
  getEventCoordination,
  requestVendorForService,
  confirmVendorAssignment,
  markServiceUnavailable,
  resolveUnavailableService,
} = require("../controllers/eventController");
const {
  getEventGuests,
  addGuest,
  importGuests,
  deleteGuest,
  sendInvite,
} = require("../controllers/guestController");
const { protect, restrictTo } = require("../middleware/auth");

router.use(protect);

router.route("/").get(getMyEvents).post(createEvent);

// Real-World Service Coordination Engine Routes
router.get("/:id/coordination", getEventCoordination);
router.post("/:id/services/:category/request-vendor", restrictTo("admin"), requestVendorForService);
router.post("/:id/services/:category/confirm-assignment", restrictTo("admin"), confirmVendorAssignment);
router.post("/:id/services/:category/mark-unavailable", restrictTo("admin"), markServiceUnavailable);
router.post("/:id/services/:category/resolve-unavailable", resolveUnavailableService);

// Legacy Admin Coordination Endpoints (preserved for backward compatibility)
router.get("/:id/vendor-availability", restrictTo("admin"), getEventVendorReadiness);
router.post("/:id/send-vendor-request", restrictTo("admin"), sendVendorRequest);
router.post("/:id/partial-feature-update", restrictTo("admin"), updateFeatureExclusion);
router.post("/:id/assign-vendor", restrictTo("admin"), assignVendorToEvent);
router.put("/:id/approve", restrictTo("admin"), approveEvent);
router.put("/:id/cancel", cancelEvent);
router.route("/:id").get(getEvent).put(updateEvent).delete(deleteEvent);

router.put("/:id/plan", savePlan);
router.get("/:id/alternatives/:category", suggestAlternatives);
router.put("/:id/schedule", updateSchedule);
router.put("/:id/checklist", updateChecklist);

// Guest subroutes
router.get("/:id/guests", getEventGuests);
router.post("/:id/guests", addGuest);
router.post("/:id/guests/import", importGuests);
router.delete("/:id/guests/:guestId", deleteGuest);
router.post("/:id/guests/:guestId/send-invite", sendInvite);

module.exports = router;
