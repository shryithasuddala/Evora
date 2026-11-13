const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const { sendEventBookingWhatsApp } = require("../services/whatsappService");

async function testConsent() {
  console.log("================================================================================");
  console.log("🔍 TESTING EXPLICIT WHATSAPP CONSENT SYSTEM");
  console.log("   Mode: " + (process.env.TWILIO_MODE || "demo").toUpperCase());
  console.log("================================================================================\n");

  await mongoose.connect(process.env.MONGO_URI);

  const timestamp = Date.now();
  const emailOptOut = `optout_test_${timestamp}@testevora.com`;
  const emailOptIn = `optin_test_${timestamp}@testevora.com`;

  // 1. Register customer WITHOUT WhatsApp consent (default unchecked)
  console.log("▶ TEST 1: Customer Registration WITHOUT WhatsApp consent (Unchecked)");
  const res1 = await fetch("http://localhost:5000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Kavya WithoutConsent",
      email: emailOptOut,
      password: "password123",
      role: "user",
      phone: "+91 91234 56789",
      // whatsappOptIn omitted or false
    }),
  });
  const json1 = await res1.json();
  const user1 = await User.findOne({ email: emailOptOut });

  console.log("   Registration Success :", json1.success);
  console.log("   User whatsappOptIn   :", user1?.whatsappOptIn, "(Must be false)");

  // Attempt booking confirmation for user1
  const event1 = await Event.create({
    organizerId: user1._id,
    title: "Kavya Graduation Day",
    category: "Academic",
    date: "2027-06-10",
  });
  const booking1 = await Booking.create({
    organizerId: user1._id,
    vendorId: user1._id,
    eventId: event1._id,
    eventName: event1.title,
    status: "Confirmed",
    whatsappConfirmationStatus: "not_sent",
  });

  const dispatch1 = await sendEventBookingWhatsApp(booking1._id);
  const updatedB1 = await Booking.findById(booking1._id);

  const test1Passed =
    user1?.whatsappOptIn === false &&
    dispatch1.skipped === true &&
    updatedB1.whatsappConfirmationStatus === "skipped_no_opt_in";

  console.log("   Dispatch Skipped     :", dispatch1.skipped);
  console.log("   Booking Status       :", updatedB1.whatsappConfirmationStatus);
  console.log("   Test 1 Result        :", test1Passed ? "✅ PASSED" : "❌ FAILED", "\n");

  // 2. Register customer WITH WhatsApp consent (Checked)
  console.log("▶ TEST 2: Customer Registration WITH WhatsApp consent (Checked)");
  const res2 = await fetch("http://localhost:5000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Anand WithConsent",
      email: emailOptIn,
      password: "password123",
      role: "user",
      phone: "+91 98765 12345",
      whatsappOptIn: true,
    }),
  });
  const json2 = await res2.json();
  const user2 = await User.findOne({ email: emailOptIn });

  console.log("   Registration Success :", json2.success);
  console.log("   User whatsappOptIn   :", user2?.whatsappOptIn, "(Must be true)");

  // Attempt booking confirmation for user2
  const event2 = await Event.create({
    organizerId: user2._id,
    title: "Anand Tech Meetup",
    category: "Technology",
    date: "2027-06-15",
    venue: "T-Hub Hyderabad",
  });
  const booking2 = await Booking.create({
    organizerId: user2._id,
    vendorId: user2._id,
    eventId: event2._id,
    eventName: event2.title,
    status: "Confirmed",
    whatsappConfirmationStatus: "not_sent",
  });

  const dispatch2 = await sendEventBookingWhatsApp(booking2._id);
  const updatedB2 = await Booking.findById(booking2._id);

  const test2Passed =
    user2?.whatsappOptIn === true &&
    dispatch2.success === true &&
    updatedB2.whatsappConfirmationStatus === "simulated";

  console.log("   Dispatch Succeeded   :", dispatch2.success);
  console.log("   Booking Status       :", updatedB2.whatsappConfirmationStatus);
  console.log("   Test 2 Result        :", test2Passed ? "✅ PASSED" : "❌ FAILED", "\n");

  // Clean up temporary test users and test entities
  await User.deleteMany({ email: { $in: [emailOptOut, emailOptIn] } });
  await Booking.deleteMany({ _id: { $in: [booking1._id, booking2._id] } });
  await Event.deleteMany({ _id: { $in: [event1._id, event2._id] } });

  console.log("================================================================================");
  const allPassed = test1Passed && test2Passed;
  console.log(`SUMMARY: ${allPassed ? "🎉 ALL CONSENT TESTS PASSED PERFECTLY!" : "❌ TESTS FAILED"}`);
  console.log("================================================================================\n");

  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

testConsent().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
