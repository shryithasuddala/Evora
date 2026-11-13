/**
 * EVORA Isolated WhatsApp Sandbox Test Runner
 *
 * SAFETY INVARIANTS:
 * 1. TWILIO_MODE stays unchanged (demo).
 * 2. .env is NEVER modified.
 * 3. Enforces single authorized recipient: +919059724872.
 * 4. Sandbox sender override: whatsapp:+17372508034.
 * 5. Requires customer whatsappOptIn === true.
 * 6. Uses authenticated Twilio API Key & Secret credentials.
 * 7. ZERO messages sent unless explicitly invoked with: --confirm-send
 * 8. Never marks "Delivered" at dispatch (records actual Twilio initial status: Queued/Sent).
 * 9. Does not modify existing production bookings, events, or customer records.
 * 10. Automatically cleans up temporary records on failure.
 * 11. Supports Content Template API (contentSid + contentVariables) to satisfy Twilio Error 21654.
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const { cleanPhoneNumber, formatDisplayPhone } = require("../services/whatsappService");

// Strict Security Boundaries
const AUTHORIZED_CLEAN_RECIPIENT = "919059724872";
const AUTHORIZED_E164_RECIPIENT = "+919059724872";
const SANDBOX_SENDER = "whatsapp:+17372508034";

async function runSandboxTest() {
  const isConfirmed = process.argv.includes("--confirm-send");
  const shouldCleanup = process.argv.includes("--cleanup");

  // Parse optional --content-sid argument
  const contentSidArg = process.argv.find((a) => a.startsWith("--content-sid="));
  const contentSid = contentSidArg
    ? contentSidArg.split("=")[1].trim()
    : (process.env.TWILIO_WHATSAPP_CONTENT_SID || null);

  console.log("================================================================================");
  console.log("📱 EVORA ISOLATED TWILIO WHATSAPP SANDBOX TEST RUNNER");
  console.log("================================================================================");
  console.log(`Execution Mode     : ${isConfirmed ? "🔴 LIVE SANDBOX DISPATCH (--confirm-send)" : "🟡 SAFE DRY-RUN (Preview & Verification only)"}`);
  console.log(`Environment Config : TWILIO_MODE = ${process.env.TWILIO_MODE || "demo"} (Untouched)`);
  console.log(`Target Sandbox     : ${SANDBOX_SENDER}`);
  console.log(`Authorized Target  : ${AUTHORIZED_E164_RECIPIENT}`);
  console.log(`Content Template   : ${contentSid ? `Configured (${contentSid})` : "None specified (Body fallback)"}`);
  console.log("================================================================================\n");

  // Step 1: Verify Twilio API credentials exist in environment
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const callbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL;

  if (!accountSid) {
    throw new Error("Missing TWILIO_ACCOUNT_SID in environment variables.");
  }
  if (!authToken && (!apiKeySid || !apiKeySecret)) {
    throw new Error("Missing Twilio credentials (TWILIO_AUTH_TOKEN or TWILIO_API_KEY_SID/TWILIO_API_KEY_SECRET).");
  }

  console.log("🔒 [CREDENTIAL INTEGRITY]");
  console.log(`   Account SID       : ${accountSid.slice(0, 4)}...${accountSid.slice(-4)} (Present)`);
  console.log(`   API Key SID       : ${apiKeySid ? `${apiKeySid.slice(0, 4)}...${apiKeySid.slice(-4)} (Present)` : "None (Using AuthToken)"}`);
  console.log(`   Auth / Key Secret : Verified loaded from environment`);
  console.log(`   Status Callback   : ${callbackUrl || "Not configured (will use direct response)"}\n`);

  // Step 2: Connect to MongoDB
  console.log("🔗 [DATABASE CONNECTION]");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("   Connected to MongoDB Atlas.\n");

  // Step 3: Locate and verify opted-in customer
  console.log("👤 [CUSTOMER VERIFICATION]");
  const customer = await User.findOne({
    phone: { $regex: "90597.*24872" },
    whatsappOptIn: true,
    role: "user",
  });

  if (!customer) {
    throw new Error(`No customer record found matching authorized phone number ending in 24872.`);
  }

  const customerDigits = cleanPhoneNumber(customer.phone);

  // Security Invariant Check 1: Recipient Phone
  if (customerDigits !== AUTHORIZED_CLEAN_RECIPIENT) {
    throw new Error(`SECURITY HALT: Customer phone "${customerDigits}" does not match authorized test number "${AUTHORIZED_CLEAN_RECIPIENT}".`);
  }

  // Security Invariant Check 2: Customer Explicit WhatsApp Opt-In
  if (customer.whatsappOptIn !== true) {
    throw new Error(`SECURITY HALT: Customer "${customer.fullName}" does not have whatsappOptIn === true.`);
  }

  console.log(`   Customer Name     : ${customer.fullName}`);
  console.log(`   Customer Email    : ${customer.email}`);
  console.log(`   Customer Phone    : ${customer.phone} -> Clean: ${customerDigits}`);
  console.log(`   WhatsApp Consent  : ✅ Explicitly Opted-In (whatsappOptIn = true)\n`);

  // Step 4: Resolve valid vendor relationship (Booking.vendorId is required)
  console.log("🏢 [VENDOR IDENTIFICATION]");
  let vendor = await User.findOne({ role: "vendor" });
  if (!vendor) {
    const existingBooking = await Booking.findOne({ vendorId: { $exists: true } });
    if (existingBooking?.vendorId) {
      vendor = await User.findById(existingBooking.vendorId);
    }
  }

  if (!vendor) {
    throw new Error("No vendor found in database. Required for Booking.vendorId relationship.");
  }

  console.log(`   Vendor Name       : ${vendor.fullName || vendor.businessName || "Evora Vendor"}`);
  console.log(`   Vendor ID         : ${vendor._id}`);
  console.log(`   Vendor Email      : ${vendor.email}\n`);

  // Step 5: Retrieve actual event or create temporary isolated event
  console.log("🎉 [EVENT DETAILS IDENTIFICATION]");
  let eventSource = await Event.findOne({
    organizerId: customer._id,
    title: { $not: /SANDBOX TEST/i },
  }).sort({ createdAt: -1 });

  let eventTitle = (eventSource?.title || "Evora Royal Celebration Gala").replace(/^\[SANDBOX TEST\]\s*/i, "");
  let eventDate = eventSource?.date || "2026-11-20";
  let eventTime = eventSource?.time || "07:30 PM";
  let eventVenue = eventSource?.venue || eventSource?.location || "The Grand Ballroom, Evora Palace";

  console.log(`   Event Source      : ${eventSource ? `Existing Customer Event (${eventSource._id})` : "Standard Celebration Template"}`);
  console.log(`   Title             : ${eventTitle}`);
  console.log(`   Date              : ${eventDate}`);
  console.log(`   Time              : ${eventTime}`);
  console.log(`   Venue             : ${eventVenue}\n`);

  // Step 6: Validate Booking schema in-memory (Check all required fields: organizerId, vendorId, eventId)
  console.log("📋 [SCHEMA INTEGRITY VALIDATION]");
  const mockBooking = new Booking({
    organizerId: customer._id,
    organizer: customer.fullName,
    vendorId: vendor._id,
    eventId: eventSource?._id || new mongoose.Types.ObjectId(),
    eventName: eventTitle,
    serviceName: "Celebration Venue & Decor",
    eventDate: eventDate,
    eventVenue: eventVenue,
    status: "Confirmed",
    whatsappConfirmationStatus: "in_progress",
  });
  await mockBooking.validate();
  console.log("   Booking Schema Validation: ✅ PASSED (organizerId, vendorId, eventId, and all required fields valid)\n");

  // Step 7: Format dynamic confirmation message & template variables
  const mockBookingRef = "EVR-" + customer._id.toString().slice(-6).toUpperCase();

  // Dynamic EVORA database mapping for WhatsApp templates
  // Matches standard Appointment / Order Notification Sandbox placeholders
  const templateVariables = {
    "1": `${eventTitle} on ${eventDate}`,
    "2": `${eventTime} at ${eventVenue} (Booking ID: ${mockBookingRef})`,
  };

  const dynamicFallbackBody =
`Hello ${customer.fullName}! 🎉

Your event booking at Evora has been confirmed successfully!

Booking Details:

Event: ${eventTitle}
Date: ${eventDate}
Time: ${eventTime}
Venue: ${eventVenue}
Booking ID: ${mockBookingRef}

Thank you for choosing Evora! ❤️`;

  const toWhatsAppAddress = `whatsapp:+${customerDigits}`;

  // Security Invariant Check 3: Final Destination Address
  if (toWhatsAppAddress !== `whatsapp:${AUTHORIZED_E164_RECIPIENT}`) {
    throw new Error(`SECURITY HALT: Target address "${toWhatsAppAddress}" does not match "whatsapp:${AUTHORIZED_E164_RECIPIENT}".`);
  }

  // Step 8: Print Message Body / Template Variables and Recipient
  console.log("================================================================================");
  console.log("📝 OUTBOUND WHATSAPP PACKET PREVIEW:");
  console.log("================================================================================");
  console.log(`FROM (Sandbox Sender)  : ${SANDBOX_SENDER}`);
  console.log(`TO   (Target Recipient): ${toWhatsAppAddress} (${customer.fullName})`);
  console.log(`STATUS CALLBACK        : ${callbackUrl || "None"}`);
  if (contentSid) {
    console.log(`DISPATCH METHOD        : Twilio Content API (Template SID: ${contentSid})`);
    console.log(`TEMPLATE VARIABLES     :`);
    console.log(JSON.stringify(templateVariables, null, 2));
  } else {
    console.log(`DISPATCH METHOD        : Raw Free-form Body (Subject to Twilio Error 21654 on Trial)`);
    console.log(`RAW MESSAGE BODY:\n\n${dynamicFallbackBody}`);
  }
  console.log("================================================================================\n");

  // Step 9: Confirmation Gate Check
  if (!isConfirmed) {
    console.log("🛡️ [CONFIRMATION GATE ACTIVATED]");
    console.log("   The script was executed WITHOUT the explicit '--confirm-send' flag.");
    console.log("   • ZERO messages were sent to Twilio.");
    console.log("   • ZERO database records were created or modified.");
    console.log("   • All security and credential checks PASSED.");
    console.log("   • Booking schema validation with vendorId PASSED.\n");
    console.log("To execute the live test once approved:");
    if (contentSid) {
      console.log(`   node scripts/testLiveWhatsAppSandbox.js --confirm-send --content-sid=${contentSid}\n`);
    } else {
      console.log(`   node scripts/testLiveWhatsAppSandbox.js --confirm-send --content-sid=<YOUR_HX_SID>\n`);
    }
    await mongoose.disconnect();
    return { success: true, mode: "dry-run", message: "Dry-run completed successfully." };
  }

  // Step 10: LIVE DISPATCH (Only reached when --confirm-send is passed)
  console.log("🚀 [LIVE DISPATCH COMMENCING]");

  let tempTestEvent = null;
  let tempTestBooking = null;

  try {
    // 10a. Create dedicated temporary test records with full validation
    tempTestEvent = await Event.create({
      organizerId: customer._id,
      title: `[SANDBOX TEST] ${eventTitle}`,
      category: "Sandbox Test",
      date: eventDate,
      time: eventTime,
      venue: eventVenue,
      isSandboxTest: true,
    });

    tempTestBooking = await Booking.create({
      organizerId: customer._id,
      organizer: customer.fullName,
      vendorId: vendor._id,
      eventId: tempTestEvent._id,
      eventName: tempTestEvent.title,
      serviceName: "Celebration Venue & Decor",
      eventDate: tempTestEvent.date,
      eventVenue: tempTestEvent.venue,
      status: "Confirmed",
      whatsappConfirmationStatus: "in_progress",
      whatsappConfirmationLockedAt: new Date(),
      isSandboxTest: true,
    });

    const liveBookingRef = "EVR-" + tempTestBooking._id.toString().slice(-6).toUpperCase();

    // Re-bind template variables with liveBookingRef
    const liveTemplateVariables = {
      "1": `${eventTitle} on ${eventDate}`,
      "2": `${eventTime} at ${eventVenue} (Booking ID: ${liveBookingRef})`,
    };

    const liveMessageBody =
`Hello ${customer.fullName}! 🎉

Your event booking at Evora has been confirmed successfully!

Booking Details:

Event: ${eventTitle}
Date: ${eventDate}
Time: ${eventTime}
Venue: ${eventVenue}
Booking ID: ${liveBookingRef}

Thank you for choosing Evora! ❤️`;

    console.log(`   Temporary Event Created   : ${tempTestEvent._id} [isSandboxTest: true]`);
    console.log(`   Temporary Booking Created : ${tempTestBooking._id} (${liveBookingRef}) [vendorId: ${vendor._id}]`);

    // 10b. Initialize Twilio Client
    const twilio = require("twilio");
    const client = (apiKeySid && apiKeySecret)
      ? twilio(apiKeySid, apiKeySecret, { accountSid })
      : twilio(accountSid, authToken);

    console.log(`   Connecting to Twilio Programmable Messaging API...`);

    const twilioPayload = {
      from: SANDBOX_SENDER,
      to: toWhatsAppAddress,
      statusCallback: callbackUrl || undefined,
    };

    if (contentSid) {
      twilioPayload.contentSid = contentSid;
      twilioPayload.contentVariables = JSON.stringify(liveTemplateVariables);
      console.log(`   Dispatched via Content API (SID: ${contentSid})`);
    } else {
      twilioPayload.body = liveMessageBody;
      console.log(`   Dispatched via raw body (Note: Subject to 21654 on Trial accounts)`);
    }

    let twilioRes;
    try {
      twilioRes = await client.messages.create(twilioPayload);
    } catch (apiErr) {
      console.error(`❌ [TWILIO DISPATCH ERROR] Code: ${apiErr.code} - ${apiErr.message}`);
      await Booking.findByIdAndUpdate(tempTestBooking._id, {
        $set: { whatsappConfirmationStatus: "failed" },
      });
      throw apiErr;
    }

    // 10c. Evaluate Initial Status (Queued / Sent - NEVER report Delivered on initial submit)
    const initialStatus = twilioRes.status === "queued" ? "Queued" : (twilioRes.status === "sent" ? "Sent" : twilioRes.status);

    console.log("\n================================================================================");
    console.log("✅ TWILIO API DISPATCH SUCCESSFUL");
    console.log("================================================================================");
    console.log(`   Message SID    : ${twilioRes.sid}`);
    console.log(`   Initial Status : ${initialStatus} (Twilio raw: "${twilioRes.status}")`);
    console.log(`   Target Number  : ${toWhatsAppAddress}`);
    console.log(`   From Number    : ${SANDBOX_SENDER}`);
    console.log(`   Date Created   : ${twilioRes.dateCreated || new Date()}`);
    console.log(`   Note           : "Delivered" state is confirmed asynchronously via webhook callback.`);
    console.log("================================================================================\n");

    // 10d. Persist Notification Record for audit trail
    const notifDoc = await Notification.create({
      userId: customer._id,
      bookingId: tempTestBooking._id,
      type: "whatsapp",
      channel: "whatsapp",
      customerName: customer.fullName,
      customerPhone: customer.phone,
      phone: customer.phone,
      eventName: eventTitle,
      bookingRef: liveBookingRef,
      mode: "sandbox_live",
      title: `Booking Confirmed – ${liveBookingRef}`,
      message: contentSid ? `[Template ${contentSid}] ${JSON.stringify(liveTemplateVariables)}` : liveMessageBody,
      deliveryStatus: initialStatus,
      twilioSid: twilioRes.sid,
      twilioStatus: twilioRes.status,
      isSandboxTest: true,
      link: "/user/bookings",
    });

    // 10e. Update Booking state
    await Booking.findByIdAndUpdate(tempTestBooking._id, {
      $set: {
        whatsappConfirmationStatus: "sent",
        whatsappConfirmationSentAt: new Date(),
        whatsappNotificationId: notifDoc._id,
      },
    });

    console.log(`   Notification Document Logged : ${notifDoc._id}`);

    // 10f. Optional Cleanup
    if (shouldCleanup) {
      console.log("🧹 [CLEANUP] Removing temporary test Event and Booking records...");
      await Booking.findByIdAndDelete(tempTestBooking._id);
      await Event.findByIdAndDelete(tempTestEvent._id);
      console.log("   Temporary test records removed. Notification audit log retained.");
    } else {
      console.log(`ℹ️ [RECORDS RETAINED] Temporary records kept with isSandboxTest: true. Run with --cleanup to purge.`);
    }

    await mongoose.disconnect();
    return {
      success: true,
      mode: "live_sandbox",
      twilioSid: twilioRes.sid,
      status: initialStatus,
      bookingRef: liveBookingRef,
    };
  } catch (err) {
    // Failure Cleanup: Clean up any temporary records created before failure
    console.error(`\n❌ [FAILURE CLEANUP INITIATED] Reason: ${err.message}`);
    if (tempTestBooking?._id) {
      await Booking.findByIdAndDelete(tempTestBooking._id).catch(() => {});
      console.log(`   🧹 Cleaned up temporary test booking: ${tempTestBooking._id}`);
    }
    if (tempTestEvent?._id) {
      await Event.findByIdAndDelete(tempTestEvent._id).catch(() => {});
      console.log(`   🧹 Cleaned up temporary test event: ${tempTestEvent._id}`);
    }
    await mongoose.disconnect().catch(() => {});
    throw err;
  }
}

if (require.main === module) {
  runSandboxTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\n❌ Fatal Execution Error:", err.message);
      process.exit(1);
    });
}

module.exports = { runSandboxTest };
