const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markRead,
  markAllRead,
  getPreferences,
  updatePreferences,
  sendTestWhatsApp,
  retryBookingWhatsApp,
  triggerEventReminder,
  handleTwilioWebhook,
  verifyMetaWebhook,
  handleMetaWebhook,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

// ── Public Webhook Routes (No JWT required, signature-verified in live mode) ──
router.route("/twilio-status")
  .post(handleTwilioWebhook)
  .get((req, res) => {
    res.status(200).json({
      success: true,
      service: "EVORA Twilio WhatsApp Webhook",
      endpoint: "/api/notifications/twilio-status",
      status: "Active",
      method: "Accepts POST callbacks from Twilio",
    });
  });

router.route("/meta-webhook")
  .get(verifyMetaWebhook)
  .post(handleMetaWebhook);

// ── Protected Routes (JWT required for user / vendor / volunteer / admin operations) ──
router.use(protect);

router.get("/", getNotifications);
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);
router.post("/test-whatsapp", sendTestWhatsApp);
router.post("/booking/:bookingId/send-whatsapp", retryBookingWhatsApp);
router.post("/events/:eventId/send-reminder", triggerEventReminder);
router.put("/read-all", markAllRead);
router.put("/:id/read", markRead);

module.exports = router;
