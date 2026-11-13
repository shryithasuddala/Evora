/**
 * EVORA Automatic WhatsApp Notification Service
 * - Persistent MongoDB-backed job queue (NotificationJob) with retries & backoff
 * - Database-level concurrency-safe idempotency via unique idempotencyKey
 * - Explicit consent & preference enforcement (whatsappOptIn && whatsappEnabled)
 * - Strict separation of Demo vs Live modes (never marks Delivered without webhook)
 * - Masked phone numbers in persisted notifications & responses
 */

const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Notification = require("../models/Notification");
const NotificationJob = require("../models/NotificationJob");
const Booking = require("../models/Booking");
const Event = require("../models/Event");

const PERMANENT_TWILIO_CODES = new Set([
  20003, 20404, 21211, 21214, 21408, 21608, 21610, 21612, 21614, 21654,
  63007, 63015, 63016, 63018, 63024, 63032,
]);

let workerInterval = null;
let isDraining = false;

/**
 * Normalizes phone numbers into E.164 international digits (without '+').
 * Returns "" if invalid (<10 or >15 digits).
 */
function cleanPhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== "string") return "";
  let digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    digits = "91" + digits;
  }
  if (digits.length < 10 || digits.length > 15) return "";
  return digits;
}

/**
 * Checks whether raw phone can normalize to a valid E.164 WhatsApp number.
 */
function isValidWhatsAppPhone(rawPhone) {
  return Boolean(cleanPhoneNumber(rawPhone));
}

/**
 * Formats normalized E.164 number for user profile storage (e.g. "+91 98765 43210").
 */
function formatDisplayPhone(rawPhone) {
  const clean = cleanPhoneNumber(rawPhone);
  if (!clean) return "";
  if (clean.length === 12 && clean.startsWith("91")) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  return `+${clean}`;
}

/**
 * Masks phone number for notification UI and logs (e.g. "+91 ******3210").
 */
function maskPhoneNumber(rawPhone) {
  const clean = cleanPhoneNumber(rawPhone);
  if (!clean) return "Unlisted";
  const last4 = clean.slice(-4);
  if (clean.length === 12 && clean.startsWith("91")) {
    return `+91 ******${last4}`;
  }
  const hiddenLen = Math.max(clean.length - 4, 2);
  return `+${"*".repeat(hiddenLen)}${last4}`;
}

/**
 * Legacy helper retained only for guest RSVP share invitations in guestController.js.
 */
function buildWhatsAppLink(cleanPhone, messageText) {
  if (!cleanPhone) return "";
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
}

/**
 * Returns active WhatsApp dispatch mode ("demo" | "live").
 */
function getWhatsAppMode() {
  return String(process.env.TWILIO_MODE || "demo").trim().toLowerCase() === "live" ? "live" : "demo";
}

/**
 * Checks if user has explicitly granted WhatsApp consent and enabled WhatsApp alerts.
 */
function isUserWhatsAppEligible(user) {
  if (!user) return { eligible: false, reason: "Recipient account not found." };
  if (user.whatsappOptIn !== true) {
    return { eligible: false, reason: "User has not granted WhatsApp opt-in consent." };
  }
  if (user.whatsappEnabled !== true) {
    return { eligible: false, reason: "User has disabled WhatsApp notifications in preferences." };
  }
  const rawPhone = user.whatsappNumber || user.phone || "";
  const cleanPhone = cleanPhoneNumber(rawPhone);
  if (!cleanPhone) {
    return { eligible: false, reason: "No valid WhatsApp E.164 phone number registered." };
  }
  return {
    eligible: true,
    cleanPhone,
    maskedPhone: maskPhoneNumber(rawPhone),
  };
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_PHONE_NUMBER;
  const statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL || "";

  const configured = Boolean(
    accountSid &&
    (authToken || (apiKeySid && apiKeySecret)) &&
    fromRaw
  );

  return {
    configured,
    accountSid,
    authToken,
    apiKeySid,
    apiKeySecret,
    fromRaw,
    statusCallback,
  };
}

function getMetaConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  return {
    configured: Boolean(token && phoneId),
    token,
    phoneId,
  };
}

function resolveLiveProvider() {
  const preferred = (process.env.WHATSAPP_PROVIDER || "").toLowerCase();
  const twilioCfg = getTwilioConfig();
  const metaCfg = getMetaConfig();

  if (preferred === "meta" && metaCfg.configured) return "meta";
  if (preferred === "twilio" && twilioCfg.configured) return "twilio";
  if (twilioCfg.configured) return "twilio";
  if (metaCfg.configured) return "meta";
  return "unconfigured";
}

function formatMessageBody(recipientName, title, message) {
  const cleanMsg = (message || "").trim();
  if (cleanMsg.startsWith("Hello ") || cleanMsg.startsWith("🎉")) {
    return cleanMsg;
  }
  return `Hello ${recipientName || "Valued Member"}! 🎉\n\n${title}\n\n${cleanMsg}\n\nThank you for choosing Evora! ❤️`;
}

function isPermanentProviderError(err) {
  const code = Number(err?.code || err?.errorCode || 0);
  const status = Number(err?.status || err?.statusCode || 0);
  if (PERMANENT_TWILIO_CODES.has(code)) return true;
  if (status >= 400 && status < 500 && status !== 429) return true;
  return false;
}

function sanitizeTemplateVar(value, fallback = "EVORA Update") {
  const cleaned = String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const finalVal = cleaned || fallback;
  return finalVal.length > 240 ? `${finalVal.slice(0, 237)}...` : finalVal;
}

function buildContentVariables(job) {
  if (job.templateVars && typeof job.templateVars === "object" && Object.keys(job.templateVars).length > 0) {
    const sanitized = {};
    for (const [k, v] of Object.entries(job.templateVars)) {
      sanitized[String(k)] = sanitizeTemplateVar(v);
    }
    return sanitized;
  }

  const singleLineBody = sanitizeTemplateVar(
    job.body || job.title || "EVORA Celebration Update",
    "EVORA Celebration Update"
  );
  return {
    "1": sanitizeTemplateVar(job.title || "EVORA Notification", "EVORA Notification"),
    "2": singleLineBody,
    "3": sanitizeTemplateVar(job.recipientName ? `EVORA Alert (${job.recipientName})` : "EVORA – Made to Celebrate"),
  };
}

function mapTwilioInitialStatus(rawStatus) {
  const s = String(rawStatus || "").toLowerCase();
  if (s === "queued" || s === "accepted") return "Queued";
  if (s === "sending" || s === "sent") return "Sent";
  if (s === "failed" || s === "undelivered") return "Failed";
  // Never map submission response directly to Delivered; await webhook
  return "Sent";
}

function withTimeout(promise, ms, label = "Provider request") {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.code = "ETIMEDOUT";
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function sendViaTwilio(job) {
  const cfg = getTwilioConfig();
  if (!cfg.configured) {
    const err = new Error("Twilio live credentials are incomplete in backend environment.");
    err.status = 400;
    throw err;
  }

  const twilio = require("twilio");
  const client = cfg.authToken
    ? twilio(cfg.accountSid, cfg.authToken)
    : twilio(cfg.apiKeySid, cfg.apiKeySecret, { accountSid: cfg.accountSid });

  const fromNumber = cfg.fromRaw.startsWith("whatsapp:") ? cfg.fromRaw : `whatsapp:${cfg.fromRaw}`;
  const toNumber = `whatsapp:+${job.toPhone}`;
  const timeoutMs = Number(process.env.WHATSAPP_HTTP_TIMEOUT_MS) || 10000;

  // Use approved WhatsApp template ContentSid if configured for production business-initiated messages
  const envKey = job.templateKey ? `TWILIO_CONTENT_SID_${String(job.templateKey).toUpperCase()}` : "";
  const contentSid =
    (envKey && process.env[envKey]) ||
    process.env.TWILIO_CONTENT_SID_DEFAULT ||
    process.env.TWILIO_WHATSAPP_CONTENT_SID ||
    "";

  const payload = {
    from: fromNumber,
    to: toNumber,
  };
  if (cfg.statusCallback) {
    payload.statusCallback = cfg.statusCallback;
  }
  if (contentSid) {
    payload.contentSid = contentSid;
    payload.contentVariables = JSON.stringify(buildContentVariables(job));
  } else {
    payload.body = job.body;
  }

  const res = await withTimeout(client.messages.create(payload), timeoutMs, "Twilio WhatsApp API");
  return {
    provider: "twilio",
    providerMessageId: res.sid,
    rawStatus: res.status || "queued",
    deliveryStatus: mapTwilioInitialStatus(res.status),
  };
}

async function sendViaMeta(job) {
  const cfg = getMetaConfig();
  if (!cfg.configured) {
    const err = new Error("Meta WhatsApp Cloud API credentials are incomplete in backend environment.");
    err.status = 400;
    throw err;
  }

  const timeoutMs = Number(process.env.WHATSAPP_HTTP_TIMEOUT_MS) || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const templateEnvKey = job.templateKey ? `META_TEMPLATE_${String(job.templateKey).toUpperCase()}` : "";
    const templateName = (templateEnvKey && process.env[templateEnvKey]) || "";

    const bodyPayload = templateName
      ? {
          messaging_product: "whatsapp",
          to: job.toPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: process.env.META_TEMPLATE_LANG || "en" },
          },
        }
      : {
          messaging_product: "whatsapp",
          to: job.toPhone,
          type: "text",
          text: { body: job.body },
        };

    const response = await fetch(`https://graph.facebook.com/v20.0/${cfg.phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data?.error?.message || `Meta Cloud API HTTP ${response.status}`);
      err.status = response.status;
      err.code = data?.error?.code || response.status;
      throw err;
    }

    const msgId = data?.messages?.[0]?.id || "";
    return {
      provider: "meta",
      providerMessageId: msgId,
      rawStatus: "accepted",
      deliveryStatus: "Sent",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function syncLinkedEntities(job, statusValue) {
  if (job.bookingId) {
    await Booking.findByIdAndUpdate(job.bookingId, {
      $set: {
        whatsappConfirmationStatus: statusValue,
        whatsappConfirmationSentAt: new Date(),
        whatsappNotificationId: job.notificationId,
      },
    }).catch(() => {});
  }
  if (job.eventId) {
    const mappedEventStatus = statusValue === "simulated" ? "simulated" : statusValue === "failed" ? "failed" : "sent";
    await Event.findByIdAndUpdate(job.eventId, {
      $set: { whatsappNotificationStatus: mappedEventStatus },
    }).catch(() => {});
  }
}

/**
 * Executes a single NotificationJob (demo simulation or live provider dispatch with retries).
 */
async function executeJob(job) {
  if (!job) return null;

  const mode = getWhatsAppMode();
  const attemptNum = (job.attempts || 0) + 1;

  // DEMO MODE: Strictly separated, no live API calls, never marked "Delivered"
  if (mode === "demo") {
    console.log(`\n================================================================`);
    console.log(`📱 [EVORA WHATSAPP DISPATCH – DEMO MODE]`);
    console.log(`   👤 Recipient     : ${job.recipientName || "Member"}`);
    console.log(`   📞 Masked Number : ${job.maskedPhone}`);
    console.log(`   🔔 Subject       : ${job.title}`);
    console.log(`   💬 Body          :\n${job.body}`);
    console.log(`   ⚡ Status        : Simulated (Demo) – TWILIO_MODE=demo`);
    console.log(`================================================================\n`);

    const now = new Date();
    const updatedNotif = await Notification.findByIdAndUpdate(
      job.notificationId,
      {
        $set: {
          mode: "demo",
          provider: "demo",
          deliveryStatus: "Simulated (Demo)",
          twilioStatus: "simulated",
          attempts: attemptNum,
          sentAt: now,
          failureReason: "",
          errorCode: "",
        },
      },
      { new: true }
    );

    await NotificationJob.findByIdAndUpdate(job._id, {
      $set: {
        status: "completed",
        provider: "demo",
        attempts: attemptNum,
        lockedAt: null,
        lastError: "",
      },
    });

    await syncLinkedEntities(job, "simulated");
    return { success: true, mode: "demo", deliveryStatus: "Simulated (Demo)", notification: updatedNotif };
  }

  // LIVE MODE
  const provider = resolveLiveProvider();
  if (provider === "unconfigured") {
    const reason = "TWILIO_MODE=live but no WhatsApp provider credentials are configured.";
    const updatedNotif = await Notification.findByIdAndUpdate(
      job.notificationId,
      {
        $set: {
          mode: "live",
          provider: "none",
          deliveryStatus: "Failed",
          failureReason: reason,
          errorCode: "CONFIG_MISSING",
          attempts: attemptNum,
        },
      },
      { new: true }
    );
    await NotificationJob.findByIdAndUpdate(job._id, {
      $set: { status: "failed", attempts: attemptNum, lockedAt: null, lastError: reason, lastErrorCode: "CONFIG_MISSING" },
    });
    await syncLinkedEntities(job, "failed");
    return { success: false, mode: "live", deliveryStatus: "Failed", failureReason: reason, notification: updatedNotif };
  }

  try {
    const dispatchRes = provider === "meta"
      ? await sendViaMeta(job)
      : await sendViaTwilio(job);

    const now = new Date();
    const updatedNotif = await Notification.findByIdAndUpdate(
      job.notificationId,
      {
        $set: {
          mode: "live",
          provider: dispatchRes.provider,
          providerMessageId: dispatchRes.providerMessageId,
          twilioSid: dispatchRes.provider === "twilio" ? dispatchRes.providerMessageId : "",
          twilioStatus: dispatchRes.rawStatus,
          deliveryStatus: dispatchRes.deliveryStatus,
          attempts: attemptNum,
          sentAt: now,
          failureReason: "",
          errorCode: "",
        },
      },
      { new: true }
    );

    await NotificationJob.findByIdAndUpdate(job._id, {
      $set: {
        status: "completed",
        provider: dispatchRes.provider,
        providerMessageId: dispatchRes.providerMessageId,
        attempts: attemptNum,
        lockedAt: null,
        lastError: "",
      },
    });

    await syncLinkedEntities(job, "sent");

    return {
      success: true,
      mode: "live",
      provider: dispatchRes.provider,
      providerMessageId: dispatchRes.providerMessageId,
      deliveryStatus: dispatchRes.deliveryStatus,
      notification: updatedNotif,
    };
  } catch (err) {
    const errCode = String(err.code || err.status || "PROVIDER_ERROR");
    const errMsg = err.message || "WhatsApp provider dispatch failed.";
    const permanent = isPermanentProviderError(err);
    const maxAttempts = job.maxAttempts || 3;

    if (!permanent && attemptNum < maxAttempts) {
      const backoffMs = 5000 * Math.pow(3, attemptNum - 1); // 5s, 15s
      const nextRetry = new Date(Date.now() + backoffMs);

      await NotificationJob.findByIdAndUpdate(job._id, {
        $set: {
          status: "pending",
          attempts: attemptNum,
          nextAttemptAt: nextRetry,
          lockedAt: null,
          lastError: errMsg,
          lastErrorCode: errCode,
        },
      });

      const updatedNotif = await Notification.findByIdAndUpdate(
        job.notificationId,
        {
          $set: {
            mode: "live",
            provider,
            deliveryStatus: "Queued",
            attempts: attemptNum,
            failureReason: `Retrying (${attemptNum}/${maxAttempts}): ${errMsg}`,
            errorCode: errCode,
          },
        },
        { new: true }
      );

      console.warn(`⚠️ [WHATSAPP RETRY SCHEDULED] Job ${job._id} attempt ${attemptNum}/${maxAttempts} in ${backoffMs}ms: ${errMsg}`);
      return {
        success: false,
        retrying: true,
        mode: "live",
        deliveryStatus: "Queued",
        failureReason: errMsg,
        notification: updatedNotif,
      };
    }

    // Permanent failure or retries exhausted
    await NotificationJob.findByIdAndUpdate(job._id, {
      $set: {
        status: "failed",
        attempts: attemptNum,
        lockedAt: null,
        lastError: errMsg,
        lastErrorCode: errCode,
      },
    });

    const updatedNotif = await Notification.findByIdAndUpdate(
      job.notificationId,
      {
        $set: {
          mode: "live",
          provider,
          deliveryStatus: "Failed",
          attempts: attemptNum,
          failureReason: errMsg,
          errorCode: errCode,
        },
      },
      { new: true }
    );

    await syncLinkedEntities(job, "failed");
    console.error(`❌ [WHATSAPP DISPATCH FAILED] Job ${job._id} (${errCode}): ${errMsg}`);

    return {
      success: false,
      mode: "live",
      deliveryStatus: "Failed",
      failureReason: errMsg,
      errorCode: errCode,
      notification: updatedNotif,
    };
  }
}

/**
 * Drains ready jobs from the persistent MongoDB NotificationJob queue.
 */
async function processPendingJobs(limit = 10) {
  if (isDraining) return 0;
  if (mongoose.connection.readyState !== 1) return 0;

  isDraining = true;
  let processed = 0;

  try {
    // Recover stale processing locks older than 2 minutes
    const staleCutoff = new Date(Date.now() - 2 * 60 * 1000);
    await NotificationJob.updateMany(
      { status: "processing", lockedAt: { $lt: staleCutoff } },
      { $set: { status: "pending", lockedAt: null } }
    );

    for (let i = 0; i < limit; i++) {
      const now = new Date();
      const job = await NotificationJob.findOneAndUpdate(
        { status: "pending", nextAttemptAt: { $lte: now } },
        { $set: { status: "processing", lockedAt: now } },
        { sort: { nextAttemptAt: 1, createdAt: 1 }, new: true }
      );
      if (!job) break;
      await executeJob(job);
      processed++;
    }
  } catch (err) {
    console.error("WhatsApp queue drain error:", err.message);
  } finally {
    isDraining = false;
  }
  return processed;
}

/**
 * Starts the background persistent-queue polling worker.
 */
function startWhatsAppQueueWorker(intervalMs = 5000) {
  if (workerInterval) return;
  workerInterval = setInterval(() => {
    processPendingJobs().catch(() => {});
  }, intervalMs);
  if (typeof workerInterval.unref === "function") {
    workerInterval.unref();
  }
}

function stopWhatsAppQueueWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}

/**
 * Enqueues a WhatsApp message into the persistent NotificationJob queue with
 * database-level idempotency and explicit consent checking.
 */
async function enqueueWhatsAppNotification({
  userId,
  phone = "",
  title = "EVORA Celebration Update",
  message = "",
  link = "",
  recipientName = "",
  idempotencyKey = "",
  templateKey = "",
  templateVars = {},
  bookingId = null,
  eventId = null,
  eventName = "",
  bookingRef = "",
  existingNotificationId = null,
  awaitDispatch = false,
  bypassConsentForInvalidNumberTest = false,
}) {
  try {
    if (!userId && !phone) {
      return { success: false, message: "Recipient userId or phone is required." };
    }

    let user = null;
    let resolvedName = recipientName || "Valued Member";
    let targetRawPhone = phone;

    if (userId) {
      user = await User.findById(userId).select("fullName phone whatsappNumber whatsappOptIn whatsappEnabled inAppEnabled");
      if (!user) {
        return { success: false, skipped: true, reason: "Recipient user not found." };
      }
      resolvedName = recipientName || user.fullName || resolvedName;
      if (!targetRawPhone) {
        targetRawPhone = user.whatsappNumber || user.phone || "";
      }

      if (!bypassConsentForInvalidNumberTest) {
        if (user.whatsappOptIn !== true || user.whatsappEnabled !== true) {
          return {
            success: true,
            skipped: true,
            reason: user.whatsappOptIn !== true
              ? "User has not granted WhatsApp opt-in consent."
              : "User has disabled WhatsApp notifications.",
          };
        }
      } else if (user.whatsappOptIn !== true) {
        return {
          success: true,
          skipped: true,
          reason: "User has not granted WhatsApp opt-in consent.",
        };
      }
    }

    const cleanPhone = cleanPhoneNumber(targetRawPhone);
    const maskedPhone = maskPhoneNumber(targetRawPhone);
    const mode = getWhatsAppMode();

    const effectiveKey = idempotencyKey || `wa:${userId || cleanPhone}:${crypto.randomUUID()}`;
    const formattedBody = formatMessageBody(resolvedName, title, message);

    // If phone is invalid, record a real Failed notification (never Delivered!) when user opted in
    if (!cleanPhone) {
      const failReason = "Invalid or missing WhatsApp E.164 phone number.";
      let notifDoc = existingNotificationId
        ? await Notification.findByIdAndUpdate(
            existingNotificationId,
            {
              $set: {
                deliveryStatus: "Failed",
                failureReason: failReason,
                errorCode: "INVALID_PHONE",
                maskedPhone: "Invalid",
                phone: "Invalid",
                customerPhone: "Invalid",
                mode,
              },
            },
            { new: true }
          )
        : await Notification.create({
            userId,
            type: "whatsapp",
            channel: "whatsapp",
            phone: "Invalid",
            maskedPhone: "Invalid",
            customerName: resolvedName,
            customerPhone: "Invalid",
            eventName,
            bookingRef,
            bookingId,
            eventId,
            idempotencyKey: effectiveKey,
            title: title.startsWith("WhatsApp:") ? title : `WhatsApp: ${title}`,
            message,
            link: link || "/user/notifications",
            deliveryStatus: "Failed",
            failureReason: failReason,
            errorCode: "INVALID_PHONE",
            mode,
          }).catch((err) => {
            if (err.code === 11000) return null;
            throw err;
          });

      if (!notifDoc && idempotencyKey) {
        return { success: true, duplicatePrevented: true };
      }

      return {
        success: false,
        mode,
        deliveryStatus: "Failed",
        failureReason: failReason,
        errorCode: "INVALID_PHONE",
        maskedPhone: "Invalid",
        notification: notifDoc,
      };
    }

    // Create Notification record first if not already created by notificationService
    let notifDoc = null;
    if (existingNotificationId) {
      notifDoc = await Notification.findById(existingNotificationId);
    } else {
      try {
        notifDoc = await Notification.create({
          userId,
          type: "whatsapp",
          channel: "whatsapp",
          phone: maskedPhone,
          maskedPhone,
          customerName: resolvedName,
          customerPhone: maskedPhone,
          eventName,
          bookingRef,
          bookingId,
          eventId,
          idempotencyKey: effectiveKey,
          title: title.startsWith("WhatsApp:") ? title : `WhatsApp: ${title}`,
          message,
          link: link || "/user/notifications",
          deliveryStatus: "Queued",
          mode,
        });
      } catch (err) {
        if (err.code === 11000) {
          return { success: true, duplicatePrevented: true, message: "Duplicate WhatsApp notification prevented." };
        }
        throw err;
      }
    }

    // Create persistent job with unique idempotencyKey (concurrency-safe at DB index level)
    let job = null;
    try {
      job = await NotificationJob.create({
        idempotencyKey: effectiveKey,
        notificationId: notifDoc._id,
        userId,
        toPhone: cleanPhone,
        maskedPhone,
        recipientName: resolvedName,
        title,
        body: formattedBody,
        templateKey,
        templateVars,
        bookingId,
        eventId,
        status: "pending",
        provider: mode === "demo" ? "demo" : resolveLiveProvider(),
      });
    } catch (err) {
      if (err.code === 11000) {
        return { success: true, duplicatePrevented: true, message: "Duplicate WhatsApp dispatch prevented." };
      }
      throw err;
    }

    if (awaitDispatch) {
      const lockedJob = await NotificationJob.findOneAndUpdate(
        { _id: job._id, status: "pending" },
        { $set: { status: "processing", lockedAt: new Date() } },
        { new: true }
      );
      if (lockedJob) {
        const execRes = await executeJob(lockedJob);
        return {
          ...execRes,
          maskedPhone,
          jobId: job._id,
        };
      }
    } else {
      setImmediate(() => {
        processPendingJobs().catch(() => {});
      });
    }

    return {
      success: true,
      queued: true,
      mode,
      maskedPhone,
      deliveryStatus: "Queued",
      notification: notifDoc,
      jobId: job._id,
    };
  } catch (err) {
    console.error("WhatsApp enqueue error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Backward-compatible wrapper around enqueueWhatsAppNotification.
 */
async function sendWhatsAppNotification(params) {
  return enqueueWhatsAppNotification(params);
}

/**
 * Dynamic Booking Confirmation WhatsApp Dispatch (with DB-level idempotency & consent check).
 */
async function sendEventBookingWhatsApp(bookingId, options = {}) {
  try {
    if (!bookingId) return { success: false, message: "bookingId is required." };
    const { forceRetry = false, awaitDispatch = false } = options;

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.status !== "Confirmed") {
      return { success: false, message: "Booking not found or not Confirmed." };
    }

    const customer = await User.findById(booking.organizerId).select(
      "fullName phone whatsappNumber whatsappOptIn whatsappEnabled"
    );
    const eligibility = isUserWhatsAppEligible(customer);
    if (!eligibility.eligible) {
      const skippedStatus = customer?.whatsappOptIn !== true || customer?.whatsappEnabled !== true
        ? "skipped_no_opt_in"
        : "skipped_no_phone";
      await Booking.findByIdAndUpdate(bookingId, {
        $set: { whatsappConfirmationStatus: skippedStatus, whatsappConfirmationSentAt: new Date() },
      });
      return { success: true, skipped: true, reason: eligibility.reason };
    }

    const event = await Event.findById(booking.eventId).select("title date time venue location");
    const eventName = event?.title || booking.eventName || "Not specified";
    const eventDate = event?.date || booking.eventDate || "Not specified";
    const eventTime = event?.time || "Not specified";
    const venue = event?.venue || event?.location || booking.eventVenue || "Not specified";
    const bookingRef = "EVR-" + booking._id.toString().slice(-6).toUpperCase();
    const customerName = customer.fullName || booking.organizer || "Valued Customer";

    const dynamicMessage =
`Hello ${customerName}! 🎉

Your event booking at Evora has been confirmed successfully!

Booking Details:
Event: ${eventName}
Date: ${eventDate}
Time: ${eventTime}
Venue: ${venue}
Booking ID: ${bookingRef}

Thank you for choosing Evora! ❤️`;

    const idempotencyKey = forceRetry
      ? `booking-confirmed:${booking._id}:retry:${Date.now()}`
      : `booking-confirmed:${booking._id}`;

    return await enqueueWhatsAppNotification({
      userId: booking.organizerId,
      recipientName: customerName,
      title: `Booking Confirmed – ${bookingRef}`,
      message: dynamicMessage,
      link: "/user/bookings",
      idempotencyKey,
      templateKey: "BOOKING_CONFIRMED",
      templateVars: { 1: customerName, 2: eventName, 3: eventDate, 4: venue, 5: bookingRef },
      bookingId: booking._id,
      eventId: booking.eventId,
      eventName,
      bookingRef,
      awaitDispatch,
    });
  } catch (err) {
    console.error(`❌ [sendEventBookingWhatsApp Error] ${err.message}`);
    await Booking.findByIdAndUpdate(bookingId, {
      $set: { whatsappConfirmationStatus: "failed" },
    }).catch(() => {});
    return { success: false, error: err.message };
  }
}

/**
 * Dynamic Event Approval WhatsApp Dispatch (respects explicit opt-in & idempotency).
 */
async function sendEventApprovalWhatsApp(eventId, options = {}) {
  try {
    if (!eventId) return { success: false, message: "eventId is required." };

    const event = await Event.findById(eventId).populate(
      "organizerId",
      "fullName phone whatsappNumber whatsappOptIn whatsappEnabled"
    );
    if (!event || !event.organizerId) {
      return { success: false, message: "Event or organizer not found." };
    }

    const organizer = event.organizerId;
    const eligibility = isUserWhatsAppEligible(organizer);
    if (!eligibility.eligible) {
      return { success: true, skipped: true, reason: eligibility.reason };
    }

    const organizerName = organizer.fullName || "Valued Host";
    const eventName = event.title || "Celebration";
    const eventDate = event.date || "Upcoming";
    const eventTime = event.time || "To be announced";
    const venue = event.venue || event.location || "Venue details inside EVORA portal";

    const dynamicMessage =
`Hello ${organizerName}! 🎉

Your celebration "${eventName}" has been APPROVED by EVORA Concierge!

• Date: ${eventDate}
• Time: ${eventTime}
• Venue: ${venue}

Manage your confirmed services and checklist in the EVORA portal.

Thank you for celebrating with EVORA! ❤️`;

    return await enqueueWhatsAppNotification({
      userId: organizer._id,
      recipientName: organizerName,
      title: `Event Approved – ${eventName} 🎉`,
      message: dynamicMessage,
      link: `/user/events/${event._id}`,
      idempotencyKey: `event-approved:${event._id}`,
      templateKey: "EVENT_APPROVED",
      templateVars: { 1: organizerName, 2: eventName, 3: eventDate, 4: venue },
      eventId: event._id,
      eventName,
      awaitDispatch: Boolean(options.awaitDispatch),
    });
  } catch (err) {
    console.error(`❌ [sendEventApprovalWhatsApp Error] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = {
  cleanPhoneNumber,
  isValidWhatsAppPhone,
  formatDisplayPhone,
  maskPhoneNumber,
  buildWhatsAppLink,
  getWhatsAppMode,
  isUserWhatsAppEligible,
  enqueueWhatsAppNotification,
  sendWhatsAppNotification,
  sendEventBookingWhatsApp,
  sendEventApprovalWhatsApp,
  processPendingJobs,
  startWhatsAppQueueWorker,
  stopWhatsAppQueueWorker,
  executeJob,
};
