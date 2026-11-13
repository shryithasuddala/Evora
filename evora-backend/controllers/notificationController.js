const crypto = require("crypto");
const Notification = require("../models/Notification");
const NotificationJob = require("../models/NotificationJob");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const User = require("../models/User");
const {
  enqueueWhatsAppNotification,
  sendEventBookingWhatsApp,
  formatDisplayPhone,
  isValidWhatsAppPhone,
  maskPhoneNumber,
  getWhatsAppMode,
} = require("../services/whatsappService");
const { sendEventReminderForEvent } = require("../services/reminderService");

// @desc    Get notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const raw = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const notifications = raw.map((n) => {
      const masked = n.maskedPhone || (n.phone ? maskPhoneNumber(n.phone) : "");
      return {
        ...n,
        phone: masked,
        maskedPhone: masked,
        customerPhone: masked || (n.customerPhone ? maskPhoneNumber(n.customerPhone) : ""),
      };
    });

    res.status(200).json({
      success: true,
      mode: getWhatsAppMode(),
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markRead = async (req, res, next) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: "Notification not found." });
    if (String(notif.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    notif.isRead = true;
    await notif.save();
    res.status(200).json({ success: true, notification: notif });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user's notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
exports.getPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "phone whatsappNumber whatsappOptIn whatsappOptInAt whatsappEnabled inAppEnabled"
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const effectiveNumber = user.whatsappNumber || user.phone || "";
    res.status(200).json({
      success: true,
      mode: getWhatsAppMode(),
      preferences: {
        whatsappOptIn: Boolean(user.whatsappOptIn),
        whatsappOptInAt: user.whatsappOptInAt || null,
        whatsappEnabled: Boolean(user.whatsappEnabled),
        whatsappNumber: effectiveNumber,
        maskedWhatsappNumber: effectiveNumber ? maskPhoneNumber(effectiveNumber) : "Not set",
        inAppEnabled: user.inAppEnabled !== false,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update current user's notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
exports.updatePreferences = async (req, res, next) => {
  try {
    const { whatsappOptIn, whatsappEnabled, whatsappNumber, inAppEnabled } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (whatsappNumber !== undefined) {
      const trimmed = String(whatsappNumber).trim();
      if (trimmed && !isValidWhatsAppPhone(trimmed)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid WhatsApp phone number (10 to 15 digits with country code).",
        });
      }
      user.whatsappNumber = trimmed ? formatDisplayPhone(trimmed) : "";
    }

    if (typeof whatsappOptIn === "boolean") {
      if (whatsappOptIn && !user.whatsappOptIn) {
        user.whatsappOptInAt = new Date();
      }
      user.whatsappOptIn = whatsappOptIn;
      if (!whatsappOptIn) {
        user.whatsappEnabled = false;
      }
    }

    if (typeof whatsappEnabled === "boolean") {
      if (whatsappEnabled && user.whatsappOptIn !== true) {
        return res.status(400).json({
          success: false,
          message: "Explicit WhatsApp opt-in consent is required before enabling WhatsApp notifications.",
        });
      }
      user.whatsappEnabled = whatsappEnabled;
    }

    if (typeof inAppEnabled === "boolean") {
      user.inAppEnabled = inAppEnabled;
    }

    await user.save();

    const effectiveNumber = user.whatsappNumber || user.phone || "";
    res.status(200).json({
      success: true,
      mode: getWhatsAppMode(),
      message: "Notification preferences updated.",
      user,
      preferences: {
        whatsappOptIn: Boolean(user.whatsappOptIn),
        whatsappOptInAt: user.whatsappOptInAt || null,
        whatsappEnabled: Boolean(user.whatsappEnabled),
        whatsappNumber: effectiveNumber,
        maskedWhatsappNumber: effectiveNumber ? maskPhoneNumber(effectiveNumber) : "Not set",
        inAppEnabled: user.inAppEnabled !== false,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Send real backend test WhatsApp notification (only when explicitly triggered)
// @route   POST /api/notifications/test-whatsapp
// @access  Private
exports.sendTestWhatsApp = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "fullName role phone whatsappNumber whatsappOptIn whatsappEnabled"
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (user.whatsappOptIn !== true || user.whatsappEnabled !== true) {
      return res.status(400).json({
        success: false,
        message: "Please grant WhatsApp opt-in consent and enable WhatsApp notifications in your Profile before testing.",
      });
    }

    const targetPhone = req.body.phone || user.whatsappNumber || user.phone || "";
    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        message: "Please register a valid WhatsApp phone number in your Profile first.",
      });
    }

    const title = req.body.title || "EVORA Live Test Notification 🔔";
    const message =
      req.body.message ||
      `Hello ${user.fullName || "Member"}, this is an automated backend WhatsApp alert test from EVORA – Made to Celebrate.`;
    const link = req.body.link || `/${user.role}/notifications`;

    const result = await enqueueWhatsAppNotification({
      userId: user._id,
      phone: targetPhone,
      recipientName: user.fullName,
      title,
      message,
      link,
      templateKey: "TEST_ALERT",
      awaitDispatch: true,
      bypassConsentForInvalidNumberTest: true,
    });

    const statusCode = result.success === false && !result.notification ? 400 : 200;
    res.status(statusCode).json({
      success: Boolean(result.success),
      mode: result.mode || getWhatsAppMode(),
      deliveryStatus: result.deliveryStatus || result.notification?.deliveryStatus || "Failed",
      providerMessageId: result.providerMessageId || result.notification?.providerMessageId || "",
      maskedPhone: result.maskedPhone || maskPhoneNumber(targetPhone),
      failureReason: result.failureReason || result.notification?.failureReason || "",
      errorCode: result.errorCode || result.notification?.errorCode || "",
      notification: result.notification || null,
      message: result.success
        ? (result.mode === "demo"
            ? "Simulated WhatsApp test recorded (TWILIO_MODE=demo). Switch TWILIO_MODE=live to send real messages."
            : `WhatsApp test message submitted (${result.deliveryStatus}).`)
        : (result.failureReason || result.error || "WhatsApp test dispatch failed."),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Controlled manual dispatch / retry for event booking WhatsApp confirmation
// @route   POST /api/notifications/booking/:bookingId/send-whatsapp
// @access  Private (Owner / Admin)
exports.retryBookingWhatsApp = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const isOwner = String(booking.organizerId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only trigger notifications for your own bookings.",
      });
    }

    const forceRetry = req.body.forceRetry === true;
    const result = await sendEventBookingWhatsApp(booking._id, { forceRetry, awaitDispatch: true });

    if (!result.success && result.duplicatePrevented) {
      return res.status(409).json(result);
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// @desc    Manually trigger upcoming event reminder notifications
// @route   POST /api/notifications/events/:eventId/send-reminder
// @access  Private (Owner / Admin)
exports.triggerEventReminder = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    const isOwner = String(event.organizerId) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const windowLabel = req.body.windowLabel || `manual-${new Date().toISOString().split("T")[0]}`;
    const dispatchedCount = await sendEventReminderForEvent(event, windowLabel);

    res.status(200).json({
      success: true,
      dispatchedCount,
      message: `Dispatched ${dispatchedCount} event reminder notification(s).`,
    });
  } catch (err) {
    next(err);
  }
};

const TWILIO_STATUS_RANK = {
  "Not Applicable": 0,
  Queued: 1,
  Sent: 2,
  Delivered: 3,
  Read: 4,
};

// @desc    Secure Twilio status callback webhook
// @route   POST /api/notifications/twilio-status
// @access  Public (Signature validated via X-Twilio-Signature using TWILIO_AUTH_TOKEN)
exports.handleTwilioWebhook = async (req, res) => {
  try {
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioSignature = req.headers["x-twilio-signature"] || "";
    const isLive = getWhatsAppMode() === "live";

    if (isLive) {
      if (!twilioAuthToken) {
        console.error("⚠️ [TWILIO WEBHOOK REJECTED] TWILIO_AUTH_TOKEN is missing for X-Twilio-Signature validation.");
        return res.status(403).send("Forbidden: Webhook signature token not configured");
      }
      const twilio = require("twilio");
      const proto = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const requestUrl = `${proto}://${host}${req.originalUrl}`;
      const configuredUrl = String(process.env.TWILIO_STATUS_CALLBACK_URL || "").trim();
      const candidateUrls = configuredUrl
        ? Array.from(new Set([configuredUrl, requestUrl]))
        : [requestUrl];

      const isValid = candidateUrls.some((url) =>
        twilio.validateRequest(twilioAuthToken, twilioSignature, url, req.body || {})
      );
      if (!isValid) {
        console.warn(`⚠️ [TWILIO WEBHOOK REJECTED] Invalid X-Twilio-Signature for URL: ${configuredUrl || requestUrl}`);
        return res.status(403).send("Forbidden: Invalid Signature");
      }
    }

    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body || {};
    if (MessageSid && MessageStatus) {
      const normalized = String(MessageStatus).trim().toLowerCase();
      let mappedStatus = "";
      if (normalized === "queued" || normalized === "accepted") {
        mappedStatus = "Queued";
      } else if (normalized === "sending" || normalized === "sent") {
        mappedStatus = "Sent";
      } else if (normalized === "delivered") {
        mappedStatus = "Delivered";
      } else if (normalized === "read") {
        mappedStatus = "Read";
      } else if (normalized === "failed" || normalized === "undelivered") {
        mappedStatus = "Failed";
      } else {
        // Unknown status — acknowledge idempotently without mutating status
        return res.status(200).send("<Response></Response>");
      }

      const existingNotif = await Notification.findOne({
        $or: [{ providerMessageId: MessageSid }, { twilioSid: MessageSid }],
      });

      const currentStatus = existingNotif?.deliveryStatus || "Not Applicable";
      const currentRank = TWILIO_STATUS_RANK[currentStatus] ?? 0;
      const nextRank = TWILIO_STATUS_RANK[mappedStatus] ?? 0;

      // Idempotent duplicate or out-of-order regression check
      const isDuplicate =
        existingNotif &&
        existingNotif.deliveryStatus === mappedStatus &&
        existingNotif.twilioStatus === normalized;
      const isOutOfOrderRegression =
        existingNotif &&
        mappedStatus !== "Failed" &&
        (currentStatus === "Failed" || nextRank < currentRank);

      if (isDuplicate || isOutOfOrderRegression) {
        console.log(`📡 [TWILIO STATUS CALLBACK IDEMPOTENT] ${MessageSid} -> ${normalized} (kept ${currentStatus})`);
        return res.status(200).send("<Response></Response>");
      }

      const now = new Date();
      const notifUpdate = {
        twilioStatus: normalized,
        deliveryStatus: mappedStatus,
      };
      const jobUpdate = {
        twilioStatus: normalized,
        deliveryStatus: mappedStatus,
      };

      if (mappedStatus === "Sent" && !existingNotif?.sentAt) {
        notifUpdate.sentAt = now;
      } else if (mappedStatus === "Delivered") {
        if (!existingNotif?.sentAt) notifUpdate.sentAt = now;
        if (!existingNotif?.deliveredAt) {
          notifUpdate.deliveredAt = now;
          jobUpdate.deliveredAt = now;
        }
        notifUpdate.failureReason = "";
        notifUpdate.errorCode = "";
        jobUpdate.lastError = "";
        jobUpdate.lastErrorCode = "";
      } else if (mappedStatus === "Read") {
        if (!existingNotif?.sentAt) notifUpdate.sentAt = now;
        if (!existingNotif?.deliveredAt) {
          notifUpdate.deliveredAt = now;
          jobUpdate.deliveredAt = now;
        }
        if (!existingNotif?.readAt) {
          notifUpdate.readAt = now;
          jobUpdate.readAt = now;
        }
      } else if (mappedStatus === "Failed") {
        const errCode = ErrorCode ? String(ErrorCode) : "TWILIO_FAILED";
        const errReason =
          ErrorMessage ||
          (ErrorCode ? `Twilio delivery error ${ErrorCode}` : `Provider reported status: ${normalized}`);
        notifUpdate.errorCode = errCode;
        notifUpdate.failureReason = errReason;
        jobUpdate.status = "failed";
        jobUpdate.lastErrorCode = errCode;
        jobUpdate.lastError = errReason;
      }

      const notif = existingNotif
        ? await Notification.findByIdAndUpdate(existingNotif._id, { $set: notifUpdate }, { new: true })
        : null;

      await NotificationJob.updateMany(
        { providerMessageId: MessageSid },
        { $set: jobUpdate }
      );

      if (notif?.bookingId) {
        const bookingStatus = mappedStatus === "Failed" ? "failed" : "sent";
        await Booking.findByIdAndUpdate(notif.bookingId, {
          $set: { whatsappConfirmationStatus: bookingStatus },
        }).catch(() => {});
      }

      if (notif?.eventId && mappedStatus === "Failed") {
        await Event.findByIdAndUpdate(notif.eventId, {
          $set: { whatsappNotificationStatus: "failed" },
        }).catch(() => {});
      }

      console.log(`📡 [TWILIO STATUS CALLBACK] ${MessageSid} -> ${normalized} (${mappedStatus})`);
    }

    res.status(200).send("<Response></Response>");
  } catch (err) {
    console.error("Twilio status webhook error:", err.message);
    res.status(500).send("Internal Server Error");
  }
};

// @desc    Meta WhatsApp Cloud API webhook verification
// @route   GET /api/notifications/meta-webhook
// @access  Public
exports.verifyMetaWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send("Forbidden");
};

// @desc    Meta WhatsApp Cloud API delivery status webhook
// @route   POST /api/notifications/meta-webhook
// @access  Public (Validated via X-Hub-Signature-256 when META_APP_SECRET is set)
exports.handleMetaWebhook = async (req, res) => {
  try {
    const appSecret = process.env.META_APP_SECRET;
    if (appSecret) {
      const signature = req.headers["x-hub-signature-256"] || "";
      const rawBody = req.rawBody || JSON.stringify(req.body || {});
      const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
      if (signature !== expected) {
        return res.status(403).send("Forbidden: Invalid Meta signature");
      }
    }

    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        for (const st of change.value?.statuses || []) {
          const msgId = st.id;
          const raw = String(st.status || "").toLowerCase();
          if (!msgId || !raw) continue;

          const updateSet = { twilioStatus: raw };
          if (raw === "sent") {
            updateSet.deliveryStatus = "Sent";
            updateSet.sentAt = new Date();
          } else if (raw === "delivered") {
            updateSet.deliveryStatus = "Delivered";
            updateSet.deliveredAt = new Date();
          } else if (raw === "read") {
            updateSet.deliveryStatus = "Read";
            updateSet.readAt = new Date();
          } else if (raw === "failed") {
            updateSet.deliveryStatus = "Failed";
            const errObj = st.errors?.[0];
            updateSet.errorCode = errObj?.code ? String(errObj.code) : "META_FAILED";
            updateSet.failureReason = errObj?.title || errObj?.message || "Meta WhatsApp delivery failed";
          }

          await Notification.findOneAndUpdate(
            { providerMessageId: msgId },
            { $set: updateSet }
          );
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Meta webhook error:", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
