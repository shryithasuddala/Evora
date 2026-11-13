/**
 * EVORA Phase 5 Integration & Unit Test Suite
 * Automatic WhatsApp Notification System Verification (TWILIO_MODE=demo)
 *
 * Tests all 9 required scenarios plus:
 * - Retry backoff & permanent error failure handling
 * - Stale job lock recovery (> 2 minutes)
 * - Persistent MongoDB queue recovery across backend process restarts
 * - Notification preferences save/retrieval & consent coupling
 * - Masked phone & "Simulated (Demo)" payload checks
 *
 * Does NOT modify .env or send live WhatsApp messages.
 * Cleans up all test documents on completion.
 */

const assert = require("assert");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const twilio = require("twilio");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const errorHandler = require("../middleware/errorHandler");
const authRoutes = require("../routes/auth");
const eventRoutes = require("../routes/events");
const bookingRoutes = require("../routes/bookings");
const taskRoutes = require("../routes/tasks");
const volunteerRoutes = require("../routes/volunteers");
const notificationRoutes = require("../routes/notifications");

const User = require("../models/User");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const Task = require("../models/Task");
const Notification = require("../models/Notification");
const NotificationJob = require("../models/NotificationJob");

const {
  enqueueWhatsAppNotification,
  executeJob,
  processPendingJobs,
  stopWhatsAppQueueWorker,
} = require("../services/whatsappService");
const { emitNotification } = require("../services/notificationService");

const RUN_TAG = `p5test_${Date.now()}`;
const createdUserIds = [];
const createdEventIds = [];
const createdBookingIds = [];
const createdTaskIds = [];
const createdNotifIds = [];
const createdJobIds = [];

function makeApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(
    express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );
  app.use(express.urlencoded({ extended: false }));
  app.use("/api/auth", authRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/volunteers", volunteerRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use(errorHandler);
  return app;
}

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

async function apiReq(baseUrl, endpoint, { method = "GET", token = null, body = null, headers = {} } = {}) {
  const reqHeaders = { ...headers };
  let payload;

  if (body instanceof URLSearchParams) {
    reqHeaders["Content-Type"] = "application/x-www-form-urlencoded";
    payload = body.toString();
  } else if (body !== null) {
    reqHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: reqHeaders,
    body: payload,
  });

  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function waitForJobsAndDrain(predicate, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await processPendingJobs(25);
    const val = await predicate();
    if (val) return val;
    await new Promise((r) => setTimeout(r, 100));
  }
  await processPendingJobs(25);
  return predicate();
}

async function runTests() {
  const results = [];
  let server;
  let baseUrl = "";

  async function runCase(id, name, fn) {
    try {
      const detail = await fn();
      results.push({ id, name, status: "PASS", detail: detail || "OK" });
      console.log(`✅ [PASS] ${id}: ${name}${detail ? ` -> ${detail}` : ""}`);
    } catch (err) {
      results.push({ id, name, status: "FAIL", detail: err.message });
      console.error(`❌ [FAIL] ${id}: ${name} -> ${err.message}`);
    }
  }

  try {
    assert.strictEqual(
      (process.env.TWILIO_MODE || "demo").toLowerCase(),
      "demo",
      "Phase 5 suite requires TWILIO_MODE=demo in .env"
    );

    await mongoose.connect(process.env.MONGO_URI);
    await Promise.all([Notification.init(), NotificationJob.init()]);

    const app = makeApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;
    console.log(`\n🧪 EVORA Phase 5 WhatsApp Integration Suite running on ${baseUrl} (TWILIO_MODE=${process.env.TWILIO_MODE})\n`);

    // Provision isolated test users
    const userOptedIn = await User.create({
      fullName: "Phase5 OptIn User",
      email: `${RUN_TAG}_user_optin@evora.test`,
      password: "Password123!",
      role: "user",
      phone: "+919811100001",
      whatsappNumber: "+919811100001",
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
      whatsappEnabled: true,
      inAppEnabled: true,
    });
    createdUserIds.push(userOptedIn._id);

    const userNoConsent = await User.create({
      fullName: "Phase5 NoConsent User",
      email: `${RUN_TAG}_user_noconsent@evora.test`,
      password: "Password123!",
      role: "user",
      phone: "+919811100002",
      whatsappNumber: "+919811100002",
      whatsappOptIn: false,
      whatsappEnabled: false,
      inAppEnabled: true,
    });
    createdUserIds.push(userNoConsent._id);

    const userInvalidPhone = await User.create({
      fullName: "Phase5 InvalidPhone User",
      email: `${RUN_TAG}_user_badphone@evora.test`,
      password: "Password123!",
      role: "user",
      phone: "123",
      whatsappNumber: "invalid-99",
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
      whatsappEnabled: true,
      inAppEnabled: true,
    });
    createdUserIds.push(userInvalidPhone._id);

    const vendorOptedIn = await User.create({
      fullName: "Phase5 Catering Vendor",
      businessName: "Phase5 Royal Kitchen",
      email: `${RUN_TAG}_vendor@evora.test`,
      password: "Password123!",
      role: "vendor",
      serviceType: "Catering",
      phone: "+919811100003",
      whatsappNumber: "+919811100003",
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
      whatsappEnabled: true,
      inAppEnabled: true,
      verificationStatus: "Approved",
    });
    createdUserIds.push(vendorOptedIn._id);

    const volunteerOptedIn = await User.create({
      fullName: "Phase5 OptIn Volunteer",
      email: `${RUN_TAG}_volunteer@evora.test`,
      password: "Password123!",
      role: "volunteer",
      phone: "+919811100004",
      whatsappNumber: "+919811100004",
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
      whatsappEnabled: true,
      inAppEnabled: true,
      verificationStatus: "Approved",
    });
    createdUserIds.push(volunteerOptedIn._id);

    const adminUser = await User.create({
      fullName: "Phase5 Admin",
      email: `${RUN_TAG}_admin@evora.test`,
      password: "Password123!",
      role: "admin",
      phone: "+919811100005",
      whatsappNumber: "+919811100005",
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
      whatsappEnabled: true,
      inAppEnabled: true,
    });
    createdUserIds.push(adminUser._id);

    const tokens = {
      userOptedIn: signToken(userOptedIn),
      userNoConsent: signToken(userNoConsent),
      userInvalidPhone: signToken(userInvalidPhone),
      vendorOptedIn: signToken(vendorOptedIn),
      volunteerOptedIn: signToken(volunteerOptedIn),
      adminUser: signToken(adminUser),
    };

    let sharedEventId = null;

    // ── SCENARIO 1: Event creation automatically creates a WhatsApp notification job ──
    await runCase("Scenario 1", "Event creation creates WhatsApp job & completes as Simulated (Demo)", async () => {
      const res = await apiReq(baseUrl, "/events", {
        method: "POST",
        token: tokens.userOptedIn,
        body: {
          title: `${RUN_TAG} Gala Celebration`,
          category: "Wedding",
          date: "2026-12-20",
          time: "18:00",
          location: "Hyderabad",
          venue: "Grand Hall",
          guestCount: 150,
          totalBudget: 250000,
          requestedServices: ["Catering", "Decoration", "Photography"],
        },
      });
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
      sharedEventId = res.data.event._id;
      createdEventIds.push(sharedEventId);

      const job = await waitForJobsAndDrain(async () =>
        NotificationJob.findOne({
          eventId: sharedEventId,
          userId: userOptedIn._id,
          idempotencyKey: { $regex: /^event-created:/ },
          status: "completed",
        })
      );
      assert.ok(job, "Expected completed NotificationJob for event creation");
      const notif = await Notification.findById(job.notificationId);
      assert.ok(notif, "Expected linked Notification");
      assert.strictEqual(notif.deliveryStatus, "Simulated (Demo)");
      assert.strictEqual(notif.mode, "demo");
      assert.strictEqual(notif.maskedPhone, "+91 ******0001");
      return `job=${job._id}, status=${notif.deliveryStatus}, to=${notif.maskedPhone}`;
    });

    // ── SCENARIO 4: New vendor request creates notification job for vendor ──
    await runCase("Scenario 4", "New vendor request creates WhatsApp job for vendor", async () => {
      assert.ok(sharedEventId, "Requires Scenario 1 event");
      const res = await apiReq(baseUrl, `/events/${sharedEventId}/services/Catering/request-vendor`, {
        method: "POST",
        token: tokens.adminUser,
        body: {
          vendorId: String(vendorOptedIn._id),
          proposedPrice: 55000,
          notes: "Phase 5 catering request",
        },
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
      if (res.data.booking?._id) createdBookingIds.push(res.data.booking._id);

      const job = await waitForJobsAndDrain(async () =>
        NotificationJob.findOne({
          eventId: sharedEventId,
          userId: vendorOptedIn._id,
          status: "completed",
        })
      );
      assert.ok(job, "Expected completed NotificationJob for vendor request");
      const notif = await Notification.findById(job.notificationId);
      assert.strictEqual(notif.deliveryStatus, "Simulated (Demo)");
      assert.strictEqual(notif.maskedPhone, "+91 ******0003");
      return `booking=${res.data.booking?._id}, vendorJob=${job._id}, status=${notif.deliveryStatus}`;
    });

    // ── SCENARIO 2: Vendor assignment confirmation creates notification job for user ──
    await runCase("Scenario 2", "Vendor assignment confirmation creates WhatsApp job for user", async () => {
      assert.ok(sharedEventId, "Requires Scenario 1 event");
      const res = await apiReq(baseUrl, `/events/${sharedEventId}/services/Catering/confirm-assignment`, {
        method: "POST",
        token: tokens.adminUser,
        body: {
          vendorId: String(vendorOptedIn._id),
          agreedPrice: 52000,
          assignmentNotes: "Confirmed for Phase 5 test",
        },
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
      if (res.data.booking?._id) createdBookingIds.push(res.data.booking._id);

      const job = await waitForJobsAndDrain(async () =>
        NotificationJob.findOne({
          eventId: sharedEventId,
          userId: userOptedIn._id,
          idempotencyKey: { $regex: /^confirm-assignment:/ },
          status: "completed",
        })
      );
      assert.ok(job, "Expected completed NotificationJob for vendor assignment confirmation");
      const notif = await Notification.findById(job.notificationId);
      assert.strictEqual(notif.deliveryStatus, "Simulated (Demo)");
      return `job=${job._id}, title="${notif.title}", status=${notif.deliveryStatus}`;
    });

    // ── SCENARIO 3: Marking service unavailable creates notification job for user ──
    await runCase("Scenario 3", "Marking service unavailable creates WhatsApp job for user", async () => {
      assert.ok(sharedEventId, "Requires Scenario 1 event");
      const res = await apiReq(baseUrl, `/events/${sharedEventId}/services/Photography/mark-unavailable`, {
        method: "POST",
        token: tokens.adminUser,
        body: { adminNotes: "No photographer slots available on date" },
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);

      const job = await waitForJobsAndDrain(async () =>
        NotificationJob.findOne({
          eventId: sharedEventId,
          userId: userOptedIn._id,
          idempotencyKey: { $regex: /^service-unavailable:/ },
          status: "completed",
        })
      );
      assert.ok(job, "Expected completed NotificationJob for unavailable service notice");
      const notif = await Notification.findById(job.notificationId);
      assert.strictEqual(notif.deliveryStatus, "Simulated (Demo)");
      return `job=${job._id}, status=${notif.deliveryStatus}`;
    });

    // ── SCENARIO 5: Volunteer duty creation & update create notification jobs ──
    await runCase("Scenario 5", "Volunteer duty assignment & update create WhatsApp jobs for volunteer", async () => {
      const createRes = await apiReq(baseUrl, "/tasks", {
        method: "POST",
        token: tokens.adminUser,
        body: {
          volunteerId: String(volunteerOptedIn._id),
          eventId: sharedEventId,
          eventName: `${RUN_TAG} Gala Celebration`,
          title: "VIP Gate Hospitality",
          date: "2026-12-20",
          time: "17:30",
          location: "North Gate",
          priority: "High",
        },
      });
      assert.strictEqual(createRes.status, 201, `Task create failed: ${createRes.status}`);
      const taskId = createRes.data.task._id;
      createdTaskIds.push(taskId);

      const assignJob = await waitForJobsAndDrain(async () =>
        NotificationJob.findOne({
          userId: volunteerOptedIn._id,
          idempotencyKey: `task-assigned:${taskId}:volunteer:${volunteerOptedIn._id}`,
          status: "completed",
        })
      );
      assert.ok(assignJob, "Expected NotificationJob for volunteer duty assignment");

      const updateRes = await apiReq(baseUrl, `/tasks/${taskId}/status`, {
        method: "PUT",
        token: tokens.adminUser,
        body: {
          time: "18:15",
          location: "Main Pavilion",
        },
      });
      assert.strictEqual(updateRes.status, 200, `Task update failed: ${updateRes.status}`);

      const updateJob = await waitForJobsAndDrain(async () =>
        NotificationJob.findOne({
          userId: volunteerOptedIn._id,
          idempotencyKey: { $regex: new RegExp(`^task-updated:${taskId}:`) },
          status: "completed",
        })
      );
      assert.ok(updateJob, "Expected NotificationJob for volunteer duty schedule update");
      const notif = await Notification.findById(updateJob.notificationId);
      assert.strictEqual(notif.deliveryStatus, "Simulated (Demo)");
      return `assignJob=${assignJob._id}, updateJob=${updateJob._id}, status=${notif.deliveryStatus}`;
    });

    // ── SCENARIO 6: Twilio webhook transitions & X-Twilio-Signature validation ──
    await runCase("Scenario 6", "Twilio webhook signature validation & status transitions (Queued/Sent/Delivered/Read/Failed)", async () => {
      const sid = `SM_${RUN_TAG}`;
      const testNotif = await Notification.create({
        userId: userOptedIn._id,
        type: "whatsapp",
        channel: "whatsapp",
        maskedPhone: "+91 ******0001",
        title: "Webhook Transition Test",
        message: "Testing Twilio status progression",
        provider: "twilio",
        providerMessageId: sid,
        twilioSid: sid,
        deliveryStatus: "Queued",
        mode: "live",
      });
      createdNotifIds.push(testNotif._id);

      const prevMode = process.env.TWILIO_MODE;
      const prevAuth = process.env.TWILIO_AUTH_TOKEN;
      const prevCb = process.env.TWILIO_STATUS_CALLBACK_URL;
      const webhookUrl = `${baseUrl}/notifications/twilio-status`;
      const testAuthToken = "phase5_test_twilio_auth_token_32bytes";

      try {
        // 6a: Missing TWILIO_AUTH_TOKEN in live mode -> 403
        process.env.TWILIO_MODE = "live";
        delete process.env.TWILIO_AUTH_TOKEN;
        process.env.TWILIO_STATUS_CALLBACK_URL = webhookUrl;

        const missingTokRes = await apiReq(baseUrl, "/notifications/twilio-status", {
          method: "POST",
          body: new URLSearchParams({ MessageSid: sid, MessageStatus: "sent" }),
        });
        assert.strictEqual(missingTokRes.status, 403, `Expected 403 when auth token missing, got ${missingTokRes.status}`);

        // 6b: Invalid signature -> 403
        process.env.TWILIO_AUTH_TOKEN = testAuthToken;
        const badSigRes = await apiReq(baseUrl, "/notifications/twilio-status", {
          method: "POST",
          headers: { "x-twilio-signature": "invalid-signature-xyz" },
          body: new URLSearchParams({ MessageSid: sid, MessageStatus: "sent" }),
        });
        assert.strictEqual(badSigRes.status, 403, `Expected 403 on bad signature, got ${badSigRes.status}`);

        // 6c: Valid signed transitions: queued -> sent -> delivered -> read -> failed
        const transitions = [
          { MessageStatus: "queued", expected: "Queued" },
          { MessageStatus: "sent", expected: "Sent", checkField: "sentAt" },
          { MessageStatus: "delivered", expected: "Delivered", checkField: "deliveredAt" },
          { MessageStatus: "read", expected: "Read", checkField: "readAt" },
          {
            MessageStatus: "failed",
            ErrorCode: "63016",
            ErrorMessage: "Outside 24h WhatsApp customer service window",
            expected: "Failed",
          },
        ];

        for (const t of transitions) {
          const params = { MessageSid: sid, MessageStatus: t.MessageStatus };
          if (t.ErrorCode) params.ErrorCode = t.ErrorCode;
          if (t.ErrorMessage) params.ErrorMessage = t.ErrorMessage;

          const sig = twilio.getExpectedTwilioSignature(testAuthToken, webhookUrl, params);
          const whRes = await apiReq(baseUrl, "/notifications/twilio-status", {
            method: "POST",
            headers: { "x-twilio-signature": sig },
            body: new URLSearchParams(params),
          });
          assert.strictEqual(whRes.status, 200, `Webhook failed for ${t.MessageStatus}: ${whRes.status}`);

          const refreshed = await Notification.findById(testNotif._id);
          assert.strictEqual(refreshed.deliveryStatus, t.expected, `Expected ${t.expected}, got ${refreshed.deliveryStatus}`);
          if (t.checkField) {
            assert.ok(refreshed[t.checkField], `Expected ${t.checkField} to be populated`);
          }
          if (t.MessageStatus === "failed") {
            assert.strictEqual(refreshed.errorCode, "63016");
            assert.ok(refreshed.failureReason.includes("63016") || refreshed.failureReason.includes("Outside 24h"));
          }
        }
        return "403 (missing token), 403 (bad sig), 200 (Queued->Sent->Delivered->Read->Failed)";
      } finally {
        process.env.TWILIO_MODE = prevMode;
        if (prevAuth === undefined) delete process.env.TWILIO_AUTH_TOKEN;
        else process.env.TWILIO_AUTH_TOKEN = prevAuth;
        if (prevCb === undefined) delete process.env.TWILIO_STATUS_CALLBACK_URL;
        else process.env.TWILIO_STATUS_CALLBACK_URL = prevCb;
      }
    });

    // ── SCENARIO 7: Invalid recipient numbers produce Failed status with meaningful error ──
    await runCase("Scenario 7", "Invalid recipient number produces Failed status with errorCode & failureReason", async () => {
      const testRes = await apiReq(baseUrl, "/notifications/test-whatsapp", {
        method: "POST",
        token: tokens.userInvalidPhone,
        body: {},
      });
      assert.strictEqual(testRes.data.deliveryStatus, "Failed");
      assert.strictEqual(testRes.data.errorCode, "INVALID_PHONE");
      assert.ok(
        testRes.data.failureReason && testRes.data.failureReason.toLowerCase().includes("invalid"),
        `Expected meaningful failureReason, got "${testRes.data.failureReason}"`
      );
      if (testRes.data.notification?._id) createdNotifIds.push(testRes.data.notification._id);
      return `deliveryStatus=${testRes.data.deliveryStatus}, errorCode=${testRes.data.errorCode}`;
    });

    // ── SCENARIO 8: Concurrent duplicate triggers prevented at DB level ──
    await runCase("Scenario 8", "Concurrent duplicate triggers produce single Notification & NotificationJob", async () => {
      const dupKey = `dup-test:${RUN_TAG}:user:${userOptedIn._id}`;
      const calls = Array.from({ length: 5 }, () =>
        emitNotification({
          userId: userOptedIn._id,
          type: "info",
          title: "Idempotency Concurrency Test",
          message: "Should only be stored and queued once.",
          link: "/user/notifications",
          idempotencyKey: dupKey,
          awaitDispatch: false,
        })
      );
      await Promise.all(calls);
      await processPendingJobs(10);

      const notifCount = await Notification.countDocuments({ idempotencyKey: dupKey });
      const jobCount = await NotificationJob.countDocuments({ idempotencyKey: dupKey });
      assert.strictEqual(notifCount, 1, `Expected 1 Notification, found ${notifCount}`);
      assert.strictEqual(jobCount, 1, `Expected 1 NotificationJob, found ${jobCount}`);

      const nDoc = await Notification.findOne({ idempotencyKey: dupKey });
      const jDoc = await NotificationJob.findOne({ idempotencyKey: dupKey });
      if (nDoc) createdNotifIds.push(nDoc._id);
      if (jDoc) createdJobIds.push(jDoc._id);
      return `5 concurrent calls -> Notifications=${notifCount}, NotificationJobs=${jobCount}`;
    });

    // ── SCENARIO 9: Users without explicit consent receive ZERO WhatsApp dispatches ──
    await runCase("Scenario 9", "No-consent / disabled users receive ZERO WhatsApp dispatches", async () => {
      // 9a: Event creation by user with whatsappOptIn: false
      const evRes = await apiReq(baseUrl, "/events", {
        method: "POST",
        token: tokens.userNoConsent,
        body: {
          title: `${RUN_TAG} Silent Event`,
          category: "Birthday",
          date: "2026-12-25",
          requestedServices: ["Catering"],
        },
      });
      assert.strictEqual(evRes.status, 201);
      createdEventIds.push(evRes.data.event._id);

      await new Promise((r) => setTimeout(r, 300));
      await processPendingJobs(10);

      const jobsForNoConsent = await NotificationJob.countDocuments({ userId: userNoConsent._id });
      assert.strictEqual(jobsForNoConsent, 0, `Expected 0 jobs for non-opted-in user, got ${jobsForNoConsent}`);

      const notifs = await Notification.find({ userId: userNoConsent._id, eventId: evRes.data.event._id });
      assert.ok(notifs.length >= 1, "Expected in-app notification created");
      assert.strictEqual(notifs[0].deliveryStatus, "Not Applicable");

      // 9b: Direct test-whatsapp endpoint blocked
      const testRes = await apiReq(baseUrl, "/notifications/test-whatsapp", {
        method: "POST",
        token: tokens.userNoConsent,
        body: {},
      });
      assert.strictEqual(testRes.status, 400);

      // 9c: Direct enqueue with opted-in=true & enabled=false -> skipped
      const tempDisabled = await User.create({
        fullName: "OptedIn But Disabled",
        email: `${RUN_TAG}_disabled@evora.test`,
        password: "Password123!",
        role: "user",
        whatsappNumber: "+919811100009",
        whatsappOptIn: true,
        whatsappEnabled: false,
      });
      createdUserIds.push(tempDisabled._id);
      const skipRes = await enqueueWhatsAppNotification({
        userId: tempDisabled._id,
        title: "Should Skip",
        message: "Disabled preference check",
        idempotencyKey: `disabled-pref:${RUN_TAG}`,
      });
      assert.strictEqual(skipRes.skipped, true);
      const jobsForDisabled = await NotificationJob.countDocuments({ userId: tempDisabled._id });
      assert.strictEqual(jobsForDisabled, 0);

      return `noConsentJobs=${jobsForNoConsent}, disabledJobs=${jobsForDisabled}, testEndpoint=${testRes.status}`;
    });

    // ── INFRA CHECK A: Retry backoff & permanent error handling (mocked fetch, live code path, zero external calls) ──
    await runCase("Retry & Error Handling", "Transient errors retry with backoff; exhausted/permanent errors mark Failed", async () => {
      const prevMode = process.env.TWILIO_MODE;
      const prevProv = process.env.WHATSAPP_PROVIDER;
      const prevToken = process.env.WHATSAPP_TOKEN;
      const prevPhoneId = process.env.WHATSAPP_PHONE_ID;
      const prevFetch = global.fetch;

      const nRetry = await Notification.create({
        userId: userOptedIn._id,
        type: "whatsapp",
        channel: "whatsapp",
        maskedPhone: "+91 ******0001",
        title: "Retry Test",
        message: "Testing retries",
        deliveryStatus: "Queued",
        mode: "live",
      });
      createdNotifIds.push(nRetry._id);

      const jRetry = await NotificationJob.create({
        idempotencyKey: `retry-test:${RUN_TAG}:${crypto.randomUUID()}`,
        notificationId: nRetry._id,
        userId: userOptedIn._id,
        toPhone: "919811100001",
        maskedPhone: "+91 ******0001",
        recipientName: "Phase5 User",
        title: "Retry Test",
        body: "Testing retries",
        status: "processing",
        attempts: 0,
        maxAttempts: 3,
      });
      createdJobIds.push(jRetry._id);

      const nPerm = await Notification.create({
        userId: userOptedIn._id,
        type: "whatsapp",
        channel: "whatsapp",
        maskedPhone: "+91 ******0001",
        title: "Perm Error Test",
        message: "Testing permanent 400 error",
        deliveryStatus: "Queued",
        mode: "live",
      });
      createdNotifIds.push(nPerm._id);

      const jPerm = await NotificationJob.create({
        idempotencyKey: `perm-test:${RUN_TAG}:${crypto.randomUUID()}`,
        notificationId: nPerm._id,
        userId: userOptedIn._id,
        toPhone: "919811100001",
        maskedPhone: "+91 ******0001",
        recipientName: "Phase5 User",
        title: "Perm Error Test",
        body: "Testing permanent error",
        status: "processing",
        attempts: 0,
        maxAttempts: 3,
      });
      createdJobIds.push(jPerm._id);

      try {
        process.env.TWILIO_MODE = "live";
        process.env.WHATSAPP_PROVIDER = "meta";
        process.env.WHATSAPP_TOKEN = "mock_meta_token";
        process.env.WHATSAPP_PHONE_ID = "99999999";

        let mockStatus = 503;
        let mockErrPayload = { error: { message: "Temporary gateway unavailable", code: 503 } };

        global.fetch = async (url) => {
          if (String(url).includes("graph.facebook.com")) {
            return {
              ok: false,
              status: mockStatus,
              json: async () => mockErrPayload,
            };
          }
          return prevFetch(url);
        };

        // Attempt 1 (503 transient) -> schedules retry 1/3
        const r1 = await executeJob(await NotificationJob.findById(jRetry._id));
        assert.strictEqual(r1.retrying, true);
        assert.strictEqual(r1.deliveryStatus, "Queued");
        let dbJob = await NotificationJob.findById(jRetry._id);
        assert.strictEqual(dbJob.status, "pending");
        assert.strictEqual(dbJob.attempts, 1);
        assert.ok(dbJob.nextAttemptAt > new Date(), "Expected nextAttemptAt in future");

        // Attempt 2 (503 transient) -> schedules retry 2/3
        const r2 = await executeJob(dbJob);
        assert.strictEqual(r2.retrying, true);
        dbJob = await NotificationJob.findById(jRetry._id);
        assert.strictEqual(dbJob.attempts, 2);

        // Attempt 3 (503 exhausted maxAttempts=3) -> Failed
        const r3 = await executeJob(dbJob);
        assert.strictEqual(r3.success, false);
        assert.strictEqual(r3.deliveryStatus, "Failed");
        dbJob = await NotificationJob.findById(jRetry._id);
        assert.strictEqual(dbJob.status, "failed");
        assert.strictEqual(dbJob.attempts, 3);

        // Permanent 400 error -> immediate Failed on attempt 1
        mockStatus = 400;
        mockErrPayload = { error: { message: "Invalid recipient parameter", code: 131026 } };
        const rp = await executeJob(await NotificationJob.findById(jPerm._id));
        assert.strictEqual(rp.success, false);
        assert.strictEqual(rp.deliveryStatus, "Failed");
        const dbPerm = await NotificationJob.findById(jPerm._id);
        assert.strictEqual(dbPerm.status, "failed");
        assert.strictEqual(dbPerm.attempts, 1);

        return "503 retried 3 attempts -> Failed; 400 failed immediately on attempt 1";
      } finally {
        global.fetch = prevFetch;
        process.env.TWILIO_MODE = prevMode;
        if (prevProv === undefined) delete process.env.WHATSAPP_PROVIDER;
        else process.env.WHATSAPP_PROVIDER = prevProv;
        if (prevToken === undefined) delete process.env.WHATSAPP_TOKEN;
        else process.env.WHATSAPP_TOKEN = prevToken;
        if (prevPhoneId === undefined) delete process.env.WHATSAPP_PHONE_ID;
        else process.env.WHATSAPP_PHONE_ID = prevPhoneId;
      }
    });

    // ── INFRA CHECK B: Stale Job Lock Recovery ──
    await runCase("Stale Job Recovery", "Stale processing lock (>2m) recovered and completed by worker", async () => {
      const nStale = await Notification.create({
        userId: userOptedIn._id,
        type: "whatsapp",
        channel: "whatsapp",
        maskedPhone: "+91 ******0001",
        title: "Stale Lock Recovery",
        message: "Should recover from stale processing lock",
        deliveryStatus: "Queued",
        mode: "demo",
      });
      createdNotifIds.push(nStale._id);

      const jStale = await NotificationJob.create({
        idempotencyKey: `stale-test:${RUN_TAG}:${crypto.randomUUID()}`,
        notificationId: nStale._id,
        userId: userOptedIn._id,
        toPhone: "919811100001",
        maskedPhone: "+91 ******0001",
        recipientName: "Phase5 User",
        title: "Stale Lock Recovery",
        body: "Should recover",
        status: "processing",
        lockedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        nextAttemptAt: new Date(Date.now() - 1000),
      });
      createdJobIds.push(jStale._id);

      const processedCount = await processPendingJobs(10);
      assert.ok(processedCount >= 1, "Expected stale job to be processed");
      const refreshedJob = await NotificationJob.findById(jStale._id);
      const refreshedNotif = await Notification.findById(nStale._id);
      assert.strictEqual(refreshedJob.status, "completed");
      assert.strictEqual(refreshedNotif.deliveryStatus, "Simulated (Demo)");
      return `job=${jStale._id} recovered -> ${refreshedNotif.deliveryStatus}`;
    });

    // ── INFRA CHECK C: Queue survives backend restarts (fresh child process drains MongoDB) ──
    await runCase("Restart Persistence", "Pending job persisted in MongoDB survives restart & runs in fresh process", async () => {
      const nPersist = await Notification.create({
        userId: userOptedIn._id,
        type: "whatsapp",
        channel: "whatsapp",
        maskedPhone: "+91 ******0001",
        title: "Restart Persistence Test",
        message: "Queued before restart, drained after restart",
        deliveryStatus: "Queued",
        mode: "demo",
      });
      createdNotifIds.push(nPersist._id);

      const jPersist = await NotificationJob.create({
        idempotencyKey: `restart-test:${RUN_TAG}:${crypto.randomUUID()}`,
        notificationId: nPersist._id,
        userId: userOptedIn._id,
        toPhone: "919811100001",
        maskedPhone: "+91 ******0001",
        recipientName: "Phase5 User",
        title: "Restart Persistence Test",
        body: "Queued before restart",
        status: "pending",
        nextAttemptAt: new Date(Date.now() - 1000),
      });
      createdJobIds.push(jPersist._id);

      // Spawn fresh Node process simulating restarted backend worker
      const childScript = `
        const path = require("path");
        require("dotenv").config({ path: path.join(process.cwd(), ".env") });
        const mongoose = require("mongoose");
        const { processPendingJobs } = require("./services/whatsappService");
        (async () => {
          await mongoose.connect(process.env.MONGO_URI);
          const count = await processPendingJobs(10);
          await mongoose.disconnect();
          console.log("RESTART_DRAINED=" + count);
        })();
      `;
      const childOut = execFileSync(process.execPath, ["-e", childScript], {
        cwd: path.join(__dirname, ".."),
        encoding: "utf8",
      });
      assert.ok(childOut.includes("RESTART_DRAINED="), "Child process did not output drain count");

      const doneJob = await NotificationJob.findById(jPersist._id);
      const doneNotif = await Notification.findById(nPersist._id);
      assert.strictEqual(doneJob.status, "completed");
      assert.strictEqual(doneNotif.deliveryStatus, "Simulated (Demo)");
      return `fresh child process completed job=${jPersist._id} -> ${doneNotif.deliveryStatus}`;
    });

    // ── PREFERENCES & NOTIFICATIONS API CHECKS ──
    await runCase("Preferences & UI API", "Preferences save/retrieval, phone masking & Simulated (Demo) status payload", async () => {
      // Save preferences on userNoConsent via PUT /api/notifications/preferences
      const put1 = await apiReq(baseUrl, "/notifications/preferences", {
        method: "PUT",
        token: tokens.userNoConsent,
        body: {
          whatsappNumber: "9876543210",
          whatsappOptIn: true,
          whatsappEnabled: true,
          inAppEnabled: false,
        },
      });
      assert.strictEqual(put1.status, 200);
      assert.strictEqual(put1.data.preferences.whatsappOptIn, true);
      assert.strictEqual(put1.data.preferences.whatsappEnabled, true);
      assert.strictEqual(put1.data.preferences.inAppEnabled, false);
      assert.strictEqual(put1.data.preferences.maskedWhatsappNumber, "+91 ******3210");

      const getRes = await apiReq(baseUrl, "/notifications/preferences", {
        method: "GET",
        token: tokens.userNoConsent,
      });
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.data.preferences.whatsappOptIn, true);
      assert.strictEqual(getRes.data.preferences.maskedWhatsappNumber, "+91 ******3210");

      // Turning off whatsappOptIn must force whatsappEnabled false
      const put2 = await apiReq(baseUrl, "/notifications/preferences", {
        method: "PUT",
        token: tokens.userNoConsent,
        body: { whatsappOptIn: false },
      });
      assert.strictEqual(put2.status, 200);
      assert.strictEqual(put2.data.preferences.whatsappOptIn, false);
      assert.strictEqual(put2.data.preferences.whatsappEnabled, false);

      // Verify GET /api/notifications for userOptedIn returns mode="demo" and Simulated (Demo), never fake Delivered
      const listRes = await apiReq(baseUrl, "/notifications", {
        method: "GET",
        token: tokens.userOptedIn,
      });
      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listRes.data.mode, "demo");
      const simNotifs = listRes.data.notifications.filter((n) => n.deliveryStatus === "Simulated (Demo)");
      assert.ok(simNotifs.length >= 1, "Expected Simulated (Demo) notifications in UI feed");
      assert.ok(!listRes.data.notifications.some((n) => n.whatsappUrl), "No whatsappUrl expected in notifications");

      return `prefs persisted (+91 ******3210), feed mode=${listRes.data.mode}, simCount=${simNotifs.length}`;
    });

    console.log("\n================================================================================");
    console.log("PHASE 5 BACKEND INTEGRATION SUMMARY");
    console.log("================================================================================");
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    stopWhatsAppQueueWorker();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState === 1) {
      await NotificationJob.deleteMany({
        $or: [
          { _id: { $in: createdJobIds } },
          { userId: { $in: createdUserIds } },
          { eventId: { $in: createdEventIds } },
        ],
      }).catch(() => {});
      await Notification.deleteMany({
        $or: [
          { _id: { $in: createdNotifIds } },
          { userId: { $in: createdUserIds } },
          { eventId: { $in: createdEventIds } },
        ],
      }).catch(() => {});
      await Task.deleteMany({ _id: { $in: createdTaskIds } }).catch(() => {});
      await Booking.deleteMany({
        $or: [
          { _id: { $in: createdBookingIds } },
          { eventId: { $in: createdEventIds } },
        ],
      }).catch(() => {});
      await Event.deleteMany({ _id: { $in: createdEventIds } }).catch(() => {});
      await User.deleteMany({ _id: { $in: createdUserIds } }).catch(() => {});
      await mongoose.disconnect();
    }
  }
}

runTests().catch((err) => {
  console.error("Fatal suite error:", err);
  process.exit(1);
});
