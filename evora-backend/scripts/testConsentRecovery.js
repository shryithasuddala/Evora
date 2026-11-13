const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const { sendEventBookingWhatsApp } = require("../services/whatsappService");

async function runRecoveryTests() {
  console.log("================================================================================");
  console.log("🔍 EVORA CONSENT RECOVERY & DUPLICATE PREVENTION TEST SUITE");
  console.log("   Mode: " + (process.env.TWILIO_MODE || "demo").toUpperCase());
  console.log("   Database: Connected to Atlas Cluster");
  console.log("================================================================================\n");

  await mongoose.connect(process.env.MONGO_URI);

  const timestamp = Date.now();
  const testEmail1 = `recovery_test1_${timestamp}@evoratest.com`;
  const testEmail2 = `recovery_test2_${timestamp}@evoratest.com`;

  const results = [];

  // =========================================================================
  // CASE 1: Customer opts out (whatsappOptIn = false) -> Booking skipped
  // =========================================================================
  console.log("▶ CASE 1: Customer Opted Out -> Dispatch Skipped");
  const user1 = await User.create({
    fullName: "Rohan OptOut",
    email: testEmail1,
    password: "Password123!",
    role: "user",
    phone: "+91 91111 22222",
    whatsappOptIn: false,
  });

  const event1 = await Event.create({
    organizerId: user1._id,
    title: "Rohan Anniversary Soiree",
    category: "Anniversary",
    date: "2027-04-10",
    venue: "Taj West End",
  });

  const booking1 = await Booking.create({
    organizerId: user1._id,
    vendorId: user1._id,
    eventId: event1._id,
    eventName: event1.title,
    eventDate: event1.date,
    eventVenue: event1.venue,
    status: "Confirmed",
    whatsappConfirmationStatus: "not_sent",
  });

  const dispatch1 = await sendEventBookingWhatsApp(booking1._id);
  const postBooking1 = await Booking.findById(booking1._id);
  const notifCount1 = await Notification.countDocuments({ bookingId: booking1._id });

  const case1Passed =
    dispatch1.skipped === true &&
    postBooking1.whatsappConfirmationStatus === "skipped_no_opt_in" &&
    notifCount1 === 0;

  console.log(`   Dispatch Skipped        : ${dispatch1.skipped === true}`);
  console.log(`   Booking Status          : ${postBooking1.whatsappConfirmationStatus}`);
  console.log(`   Notifications Generated : ${notifCount1} (Expected: 0)`);
  console.log(`   Case 1 Result           : ${case1Passed ? "✅ PASSED" : "❌ FAILED"}\n`);
  results.push({ test: "Case 1: Customer Opted Out -> Skipped with skipped_no_opt_in", passed: case1Passed });

  // =========================================================================
  // CASE 2: Customer remains opted out -> Subsequent dispatch still skipped
  // =========================================================================
  console.log("▶ CASE 2: Customer Remains Opted Out -> Re-dispatch Skipped");
  const dispatch2 = await sendEventBookingWhatsApp(booking1._id);
  const postBooking2 = await Booking.findById(booking1._id);
  const notifCount2 = await Notification.countDocuments({ bookingId: booking1._id });

  const case2Passed =
    dispatch2.skipped === true &&
    postBooking2.whatsappConfirmationStatus === "skipped_no_opt_in" &&
    notifCount2 === 0;

  console.log(`   Dispatch Skipped        : ${dispatch2.skipped === true}`);
  console.log(`   Booking Status          : ${postBooking2.whatsappConfirmationStatus}`);
  console.log(`   Notifications Generated : ${notifCount2} (Expected: 0)`);
  console.log(`   Case 2 Result           : ${case2Passed ? "✅ PASSED" : "❌ FAILED"}\n`);
  results.push({ test: "Case 2: Customer Remains Opted Out -> Zero Messages Sent", passed: case2Passed });

  // =========================================================================
  // CASE 3: Customer later explicitly opts in -> Confirmation safely dispatched
  // =========================================================================
  console.log("▶ CASE 3: Customer Later Opts In -> Confirmation Dispatched");
  // Customer explicitly enables WhatsApp opt-in
  await User.findByIdAndUpdate(user1._id, { $set: { whatsappOptIn: true } });

  const dispatch3 = await sendEventBookingWhatsApp(booking1._id);
  const postBooking3 = await Booking.findById(booking1._id);
  const notif3 = await Notification.findOne({ bookingId: booking1._id });

  const case3Passed =
    dispatch3.success === true &&
    postBooking3.whatsappConfirmationStatus === "simulated" &&
    notif3 !== null &&
    notif3.customerName === "Rohan OptOut" &&
    notif3.deliveryStatus === "Simulated (Demo)" &&
    notif3.message.includes("Hello Rohan OptOut! 🎉");

  console.log(`   Recovery Succeeded      : ${dispatch3.success === true}`);
  console.log(`   Updated Booking Status  : ${postBooking3.whatsappConfirmationStatus}`);
  console.log(`   Notification Saved      : ${notif3 !== null} (ID: ${notif3?._id})`);
  console.log(`   Case 3 Result           : ${case3Passed ? "✅ PASSED" : "❌ FAILED"}\n`);
  results.push({ test: "Case 3: Customer Later Opts In -> Dispatched Safely", passed: case3Passed });

  // =========================================================================
  // CASE 4: Two simultaneous recovery requests -> Exactly one notification
  // =========================================================================
  console.log("▶ CASE 4: Two Simultaneous Recovery Requests (Concurrency)");
  const user2 = await User.create({
    fullName: "Sneha Concurrency",
    email: testEmail2,
    password: "Password123!",
    role: "user",
    phone: "+91 93333 44444",
    whatsappOptIn: false,
  });

  const event2 = await Event.create({
    organizerId: user2._id,
    title: "Sneha Startup Launch",
    category: "Corporate",
    date: "2027-05-20",
    venue: "WeWork Galaxy",
  });

  const booking2 = await Booking.create({
    organizerId: user2._id,
    vendorId: user2._id,
    eventId: event2._id,
    eventName: event2.title,
    eventDate: event2.date,
    eventVenue: event2.venue,
    status: "Confirmed",
    whatsappConfirmationStatus: "skipped_no_opt_in",
  });

  // Customer opts in
  await User.findByIdAndUpdate(user2._id, { $set: { whatsappOptIn: true } });

  // Fire two simultaneous recovery calls
  const [resA, resB] = await Promise.all([
    sendEventBookingWhatsApp(booking2._id),
    sendEventBookingWhatsApp(booking2._id),
  ]);

  const oneSucceeded = (resA.success && !resB.success) || (!resA.success && resB.success);
  const oneDuplicateBlocked = resA.duplicatePrevented || resB.duplicatePrevented;
  const notifCountBooking2 = await Notification.countDocuments({ bookingId: booking2._id });

  const case4Passed = oneSucceeded && oneDuplicateBlocked && notifCountBooking2 === 1;

  console.log(`   Request A Success / Blocked : ${Boolean(resA.success)} / ${Boolean(resA.duplicatePrevented)}`);
  console.log(`   Request B Success / Blocked : ${Boolean(resB.success)} / ${Boolean(resB.duplicatePrevented)}`);
  console.log(`   Total Notifications Stored  : ${notifCountBooking2} (Must be exactly 1)`);
  console.log(`   Case 4 Result               : ${case4Passed ? "✅ PASSED" : "❌ FAILED"}\n`);
  results.push({ test: "Case 4: Simultaneous Recovery Calls -> Exactly 1 Notification", passed: case4Passed });

  // =========================================================================
  // CASE 5: Already sent / simulated bookings cannot be resent
  // =========================================================================
  console.log("▶ CASE 5: Already Dispatched Bookings Cannot Be Resent");
  const repeatStandard = await sendEventBookingWhatsApp(booking1._id);
  const repeatForce = await sendEventBookingWhatsApp(booking1._id, { forceRetry: true });
  const finalNotifCountBooking1 = await Notification.countDocuments({ bookingId: booking1._id });

  const case5Passed =
    repeatStandard.duplicatePrevented === true &&
    repeatForce.duplicatePrevented === true &&
    finalNotifCountBooking1 === 1;

  console.log(`   Standard Repeat Attempt Blocked : ${repeatStandard.duplicatePrevented === true}`);
  console.log(`   Force Retry Attempt Blocked     : ${repeatForce.duplicatePrevented === true}`);
  console.log(`   Final Stored Notifications      : ${finalNotifCountBooking1} (Must be exactly 1)`);
  console.log(`   Case 5 Result                   : ${case5Passed ? "✅ PASSED" : "❌ FAILED"}\n`);
  results.push({ test: "Case 5: Already Dispatched Bookings Cannot Be Resent", passed: case5Passed });

  // Clean up temporary test fixtures
  await User.deleteMany({ email: { $in: [testEmail1, testEmail2] } });
  await Booking.deleteMany({ _id: { $in: [booking1._id, booking2._id] } });
  await Event.deleteMany({ _id: { $in: [event1._id, event2._id] } });
  await Notification.deleteMany({ bookingId: { $in: [booking1._id, booking2._id] } });

  console.log("================================================================================");
  console.log("📊 TEST RESULTS SUMMARY:");
  results.forEach((r, idx) => {
    console.log(`   ${idx + 1}. [${r.passed ? "PASS" : "FAIL"}] ${r.test}`);
  });
  const allPassed = results.every((r) => r.passed);
  console.log(`\nOVERALL: ${allPassed ? "🎉 ALL 5/5 RECOVERY TESTS PASSED PERFECTLY!" : "⚠️ SOME TESTS FAILED"}`);
  console.log("================================================================================\n");

  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

runRecoveryTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
