const crypto = require("crypto");
const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  enqueueWhatsAppNotification,
  isUserWhatsAppEligible,
  getWhatsAppMode,
  maskPhoneNumber,
} = require("./whatsappService");

/**
 * Centralized Notification Dispatcher
 * - Creates a single unified Notification record per recipient/event
 * - Respects inAppEnabled and explicit whatsappOptIn + whatsappEnabled consent
 * - Uses database-level idempotencyKey to prevent duplicates under concurrency
 * - Enqueues WhatsApp jobs onto the persistent NotificationJob queue
 */
async function emitNotification({
  userId,
  type = "info",
  title,
  message = "",
  link = "",
  sendWhatsApp = true,
  whatsappTitle = "",
  whatsappMessage = "",
  idempotencyKey = "",
  templateKey = "",
  templateVars = {},
  bookingId = null,
  eventId = null,
  eventName = "",
  bookingRef = "",
  awaitDispatch = false,
}) {
  try {
    if (!userId || !title) return null;

    const user = await User.findById(userId).select(
      "fullName role phone whatsappNumber whatsappOptIn whatsappEnabled inAppEnabled"
    );
    if (!user) return null;

    const inAppAllowed = user.inAppEnabled !== false;
    const hasWhatsAppConsent =
      sendWhatsApp === true &&
      user.whatsappOptIn === true &&
      user.whatsappEnabled === true;

    if (!inAppAllowed && !hasWhatsAppConsent) {
      return null;
    }

    const effectiveKey = idempotencyKey || `notif:${userId}:${crypto.randomUUID()}`;
    const rawPhone = user.whatsappNumber || user.phone || "";
    const eligibility = isUserWhatsAppEligible(user);
    const masked = eligibility.eligible ? eligibility.maskedPhone : (rawPhone ? maskPhoneNumber(rawPhone) : "");
    const mode = getWhatsAppMode();

    const channel = hasWhatsAppConsent
      ? (inAppAllowed ? "both" : "whatsapp")
      : "in-app";

    let notifDoc = null;
    try {
      notifDoc = await Notification.create({
        userId,
        type: hasWhatsAppConsent && !inAppAllowed ? "whatsapp" : type,
        channel,
        phone: hasWhatsAppConsent ? masked : "",
        maskedPhone: hasWhatsAppConsent ? masked : "",
        customerName: hasWhatsAppConsent ? user.fullName : "",
        customerPhone: hasWhatsAppConsent ? masked : "",
        eventName,
        bookingRef,
        bookingId,
        eventId,
        idempotencyKey: effectiveKey,
        title,
        message,
        link,
        isRead: false,
        mode,
        deliveryStatus: hasWhatsAppConsent ? "Queued" : "Not Applicable",
      });
    } catch (err) {
      if (err.code === 11000) {
        return { duplicatePrevented: true };
      }
      throw err;
    }

    if (hasWhatsAppConsent) {
      await enqueueWhatsAppNotification({
        userId,
        phone: rawPhone,
        recipientName: user.fullName,
        title: whatsappTitle || title,
        message: whatsappMessage || message,
        link,
        idempotencyKey: effectiveKey,
        templateKey,
        templateVars,
        bookingId,
        eventId,
        eventName,
        bookingRef,
        existingNotificationId: notifDoc._id,
        awaitDispatch,
        bypassConsentForInvalidNumberTest: true,
      }).catch((err) => console.warn(`[WhatsApp enqueue skipped]: ${err.message}`));
    }

    return notifDoc;
  } catch (err) {
    console.error("emitNotification error:", err.message);
    return null;
  }
}

/**
 * Notifies all active Admin users with per-admin idempotency keys.
 */
async function notifyAdmins({
  type = "alert",
  title,
  message = "",
  link = "/admin/events",
  idempotencyPrefix = "",
  eventId = null,
  eventName = "",
  bookingId = null,
  sendWhatsApp = true,
  templateKey = "ADMIN_ALERT",
}) {
  try {
    const admins = await User.find({ role: "admin", isActive: true }).select("_id");
    const results = [];
    for (const adm of admins) {
      const key = idempotencyPrefix ? `${idempotencyPrefix}:admin:${adm._id}` : "";
      const res = await emitNotification({
        userId: adm._id,
        type,
        title,
        message,
        link,
        idempotencyKey: key,
        eventId,
        eventName,
        bookingId,
        sendWhatsApp,
        templateKey,
      });
      results.push(res);
    }
    return results;
  } catch (err) {
    console.error("notifyAdmins error:", err.message);
    return [];
  }
}

module.exports = {
  emitNotification,
  notifyAdmins,
};
