const express = require("express");
const router = express.Router();
const {
  getEventGuests,
  addGuest,
  importGuests,
  deleteGuest,
  sendInvite,
  getPublicRsvp,
  submitPublicRsvp,
} = require("../controllers/guestController");
const { protect } = require("../middleware/auth");

// Public RSVP endpoints
router.get("/rsvp/:token", getPublicRsvp);
router.post("/rsvp/:token", submitPublicRsvp);

// Protected Event Guest Management endpoints
router.get("/event/:id", protect, getEventGuests);
router.post("/event/:id", protect, addGuest);
router.post("/event/:id/import", protect, importGuests);
router.delete("/event/:id/:guestId", protect, deleteGuest);
router.post("/event/:id/:guestId/send-invite", protect, sendInvite);

module.exports = router;
