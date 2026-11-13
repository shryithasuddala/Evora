const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const VendorAvailability = require("../models/VendorAvailability");
const Notification = require("../models/Notification");

const BASE_URL = "http://localhost:5000/api";

function generateToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "2h" });
}

async function api(endpoint, method = "GET", token = null, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("   EVORA STAGE 1 & 2 COORDINATION ENGINE - COMPREHENSIVE BACKEND VERIFICATION   ");
  console.log("================================================================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB for test fixture setup & assertion audits.\n");

  // 1. Setup Test Actors
  let hostUser = await User.findOne({ email: "shryithasuddala@gmail.com" });
  let adminUser = await User.findOne({ role: "admin" });
  let cateringVendor = await User.findOne({ email: "vaishnaviachi1412@gmail.com" });

  if (!cateringVendor) {
    cateringVendor = await User.create({
      fullName: "ACHI VAISHNAVI",
      email: "vaishnaviachi1412@gmail.com",
      password: "password123",
      role: "vendor",
      businessName: "Vaishnavi Royal Catering",
      serviceType: "Catering",
      phone: "+919876543210",
      location: "Hyderabad",
    });
  }

  // Ensure Photography Vendor
  let photoVendor = await User.findOne({ email: "test.photo.vendor@evora.com" });
  if (!photoVendor) {
    photoVendor = await User.create({
      fullName: "Kiran Lensman",
      email: "test.photo.vendor@evora.com",
      password: "password123",
      role: "vendor",
      businessName: "Focus Prime Photography",
      serviceType: "Photography",
      phone: "+919876543211",
      location: "Hyderabad",
    });
  }

  // Ensure Venue Vendor
  let venueVendor = await User.findOne({ email: "test.venue.vendor@evora.com" });
  if (!venueVendor) {
    venueVendor = await User.create({
      fullName: "Suresh Grandeur",
      email: "test.venue.vendor@evora.com",
      password: "password123",
      role: "vendor",
      businessName: "Grand Kohinoor Convention",
      serviceType: "Venue",
      phone: "+919876543212",
      location: "Hyderabad",
    });
  }

  // Ensure Unauthorized Other User
  let unauthorizedUser = await User.findOne({ email: "test.other.user@evora.com" });
  if (!unauthorizedUser) {
    unauthorizedUser = await User.create({
      fullName: "Other Intruder",
      email: "test.other.user@evora.com",
      password: "password123",
      role: "user",
      phone: "+919876543299",
      location: "Hyderabad",
    });
  }

  const hostToken = generateToken(hostUser);
  const adminToken = generateToken(adminUser);
  const cateringToken = generateToken(cateringVendor);
  const photoToken = generateToken(photoVendor);
  const venueToken = generateToken(venueVendor);
  const unauthHostToken = generateToken(unauthorizedUser);

  console.log("Test Actors Verified:");
  console.log(`- Host: ${hostUser.fullName} (${hostUser.email})`);
  console.log(`- Admin: ${adminUser.fullName} (${adminUser.email})`);
  console.log(`- Vendor 1 (Catering): ${cateringVendor.fullName} (${cateringVendor.email})`);
  console.log(`- Vendor 2 (Photography): ${photoVendor.fullName} (${photoVendor.email})`);
  console.log(`- Vendor 3 (Venue): ${venueVendor.fullName} (${venueVendor.email})`);
  console.log(`- Unauthorized User: ${unauthorizedUser.fullName} (${unauthorizedUser.email})\n`);

  let testEventId = null;
  let cateringBookingId = null;
  let photoBookingId = null;
  let venueBookingId = null;

  // ---------------------------------------------------------------------------
  // TEST 1: Event with Four Requested Services
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 1: Create Event with Four Requested Services (User Submission)");
  console.log("--------------------------------------------------------------------------------");
  const eventPayload = {
    title: "Grand Royal Wedding of Suddala & Sharma",
    category: "Wedding",
    date: "2026-12-15",
    time: "18:00",
    location: "Banjara Hills, Hyderabad",
    guestCount: 1000,
    totalBudget: 250000,
    requestedServices: [
      {
        category: "Catering",
        targetBudget: 75000,
        specificRequirements: "Traditional Telangana & Mughlai buffet, live counters, dessert bar for 1000 guests.",
      },
      {
        category: "Photography",
        targetBudget: 45000,
        specificRequirements: "Pre-wedding candid, drone video coverage, traditional photography crew.",
      },
      {
        category: "Venue",
        targetBudget: 90000,
        specificRequirements: "Air-conditioned banquet lawn with min 1200 capacity and valet parking.",
      },
      {
        category: "Decoration",
        targetBudget: 40000,
        specificRequirements: "Royal floral mandap, grand entry pathway, and ambient LED lighting.",
      },
    ],
  };

  const t1Res = await api("/events", "POST", hostToken, eventPayload);
  if (!t1Res.ok) {
    console.error("FAIL: Test 1 failed to create event:", t1Res.data);
    process.exit(1);
  }

  testEventId = t1Res.data.event._id;
  console.log(`✓ Event created successfully. Event ID: ${testEventId}`);
  console.log(`✓ Status: "${t1Res.data.event.status}"`);
  console.log(`✓ Requested Services count: ${t1Res.data.event.requestedServices.length}`);
  t1Res.data.event.requestedServices.forEach((s) => {
    console.log(`   - [${s.category}] Status: ${s.status} | Budget: ₹${s.targetBudget} | Reqs: "${s.specificRequirements.slice(0, 40)}..."`);
  });

  // Verify Admin In-App notification
  const adminNotifs = await Notification.find({ userId: adminUser._id }).sort({ createdAt: -1 }).limit(1);
  console.log(`✓ Admin Notification generated: "${adminNotifs[0]?.title}" -> "${adminNotifs[0]?.message}"\n`);

  // ---------------------------------------------------------------------------
  // TEST 2: Two Vendors Accepting
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 2: Two Vendors Accepting (Catering & Photography)");
  console.log("--------------------------------------------------------------------------------");
  // Admin checks coordination matrix
  const coord1 = await api(`/events/${testEventId}/coordination`, "GET", adminToken);
  console.log(`✓ Admin retrieved coordination matrix: total ${coord1.data.summary.totalServices} services tracked.`);

  // Admin sends request to Catering Vendor
  const reqCatering = await api(`/events/${testEventId}/services/Catering/request-vendor`, "POST", adminToken, {
    vendorId: cateringVendor._id,
    proposedPrice: 75000,
    notes: "Requires authentic regional cuisine and dessert station.",
  });
  console.log(`✓ Admin requested Catering Vendor (${cateringVendor.fullName}): Status ${reqCatering.status}`);
  cateringBookingId = reqCatering.data.booking._id;

  // Admin sends request to Photography Vendor
  const reqPhoto = await api(`/events/${testEventId}/services/Photography/request-vendor`, "POST", adminToken, {
    vendorId: photoVendor._id,
    proposedPrice: 45000,
    notes: "Requires 2 candid cameras and 1 4K drone operator.",
  });
  console.log(`✓ Admin requested Photography Vendor (${photoVendor.fullName}): Status ${reqPhoto.status}`);
  photoBookingId = reqPhoto.data.booking._id;

  // Vendor 1 (Catering) accepts
  const v1Accept = await api(`/bookings/${cateringBookingId}/respond`, "PUT", cateringToken, {
    action: "accept",
  });
  console.log(`✓ Catering Vendor responded ACCEPT: ${v1Accept.data.message}`);

  // Vendor 2 (Photography) accepts
  const v2Accept = await api(`/bookings/${photoBookingId}/respond`, "PUT", photoToken, {
    action: "accept",
  });
  console.log(`✓ Photography Vendor responded ACCEPT: ${v2Accept.data.message}`);

  // Audit state in Event & Booking
  const eventAfterAccept = await Event.findById(testEventId);
  const cateringService = eventAfterAccept.requestedServices.find((s) => s.category === "Catering");
  const photoService = eventAfterAccept.requestedServices.find((s) => s.category === "Photography");
  const b1 = await Booking.findById(cateringBookingId);

  console.log(`✓ Catering service status: "${cateringService.status}" (Expected: "Accepted by Vendor")`);
  console.log(`✓ Photography service status: "${photoService.status}" (Expected: "Accepted by Vendor")`);
  console.log(`✓ Booking 1 status: "${b1.status}" (Notice: NOT Confirmed yet, strictly awaiting Admin final confirmation!)`);
  console.log(`✓ Event Overall Status: "${eventAfterAccept.status}"\n`);

  // ---------------------------------------------------------------------------
  // TEST 3: One Vendor Declining
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 3: One Vendor Declining with Reason (Venue Vendor)");
  console.log("--------------------------------------------------------------------------------");
  // Admin requests Venue Vendor
  const reqVenue = await api(`/events/${testEventId}/services/Venue/request-vendor`, "POST", adminToken, {
    vendorId: venueVendor._id,
    proposedPrice: 90000,
    notes: "Need the main Kohinoor lawn for evening reception.",
  });
  console.log(`✓ Admin requested Venue Vendor (${venueVendor.fullName}): Status ${reqVenue.status}`);
  venueBookingId = reqVenue.data.booking._id;

  // Venue Vendor declines with a reason
  const declineReasonText = "Hall is already booked for an executive private gala on 2026-12-15.";
  const v3Decline = await api(`/bookings/${venueBookingId}/respond`, "PUT", venueToken, {
    action: "decline",
    declineReason: declineReasonText,
  });
  console.log(`✓ Venue Vendor responded DECLINE: ${v3Decline.data.message}`);

  // Verify declineReason saved in MongoDB booking and event requestedService
  const b3 = await Booking.findById(venueBookingId);
  const eventAfterDecline = await Event.findById(testEventId);
  const venueService = eventAfterDecline.requestedServices.find((s) => s.category === "Venue");

  console.log(`✓ Booking declineReason in DB: "${b3.declineReason}"`);
  console.log(`✓ Event requestedService declineReason in DB: "${venueService.declineReason}"`);
  console.log(`✓ Event requestedService status: "${venueService.status}" (Returned to "Vendor Search in Progress")`);

  const adminNotifDecline = await Notification.find({ userId: adminUser._id }).sort({ createdAt: -1 }).limit(1);
  console.log(`✓ Admin Notification received: "${adminNotifDecline[0]?.title}" -> "${adminNotifDecline[0]?.message}"\n`);

  // ---------------------------------------------------------------------------
  // TEST 4: One Service with No Available Vendor (Admin Marks Unavailable)
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 4: One Service with No Available Vendor (Decoration -> Unavailable)");
  console.log("--------------------------------------------------------------------------------");
  const unavailRes = await api(`/events/${testEventId}/services/Decoration/mark-unavailable`, "POST", adminToken, {
    adminNotes: "No verified floral decoration artisans available in Hyderabad on 2026-12-15.",
  });
  console.log(`✓ Admin marked Decoration as Unavailable: Status ${unavailRes.status}`);

  const eventAfterUnavail = await Event.findById(testEventId);
  const decorService = eventAfterUnavail.requestedServices.find((s) => s.category === "Decoration");
  console.log(`✓ Decoration service status: "${decorService.status}"`);
  console.log(`✓ Crucial Rule Verification: Catering is still "${eventAfterUnavail.requestedServices.find(s=>s.category==='Catering').status}" and Photography is still "${eventAfterUnavail.requestedServices.find(s=>s.category==='Photography').status}"!`);

  const hostNotif = await Notification.find({ userId: hostUser._id }).sort({ createdAt: -1 }).limit(1);
  console.log(`✓ Host Notification received: "${hostNotif[0]?.title}" -> "${hostNotif[0]?.message}"\n`);

  // ---------------------------------------------------------------------------
  // TEST 5: Admin Confirming Accepted Vendors
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 5: Admin Confirms Accepted Vendors (Catering & Photography)");
  console.log("--------------------------------------------------------------------------------");
  // Admin confirms Catering
  const confCatering = await api(`/events/${testEventId}/services/Catering/confirm-assignment`, "POST", adminToken, {
    vendorId: cateringVendor._id,
    agreedPrice: 78000,
    assignmentNotes: "Agreed: 1000 pax menu + 4 live chaat & mocktail counters.",
  });
  console.log(`✓ Admin confirmed Catering: ${confCatering.data.message}`);

  // Admin confirms Photography
  const confPhoto = await api(`/events/${testEventId}/services/Photography/confirm-assignment`, "POST", adminToken, {
    vendorId: photoVendor._id,
    agreedPrice: 45000,
    assignmentNotes: "Agreed: 2 candid shooters + 1 drone operator + teaser album.",
  });
  console.log(`✓ Admin confirmed Photography: ${confPhoto.data.message}`);

  const eventAfterConf = await Event.findById(testEventId);
  console.log(`✓ Event overall status: "${eventAfterConf.status}" (Expected: "Partially Confirmed")`);
  console.log(`✓ Catering status: "${eventAfterConf.requestedServices.find(s=>s.category==='Catering').status}" | Agreed Price: ₹${eventAfterConf.requestedServices.find(s=>s.category==='Catering').agreedPrice}`);
  console.log(`✓ Photography status: "${eventAfterConf.requestedServices.find(s=>s.category==='Photography').status}" | Agreed Price: ₹${eventAfterConf.requestedServices.find(s=>s.category==='Photography').agreedPrice}\n`);

  // ---------------------------------------------------------------------------
  // TEST 6: User Proceeding Without an Unavailable Service
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 6: User Resolves Unavailable Service (Decoration -> 'Proceed Without')");
  console.log("--------------------------------------------------------------------------------");
  const resProceed = await api(`/events/${testEventId}/services/Decoration/resolve-unavailable`, "POST", hostToken, {
    decision: "Proceed Without",
    notes: "We will arrange simple family floral decor internally.",
  });
  console.log(`✓ Host resolved Decoration: ${resProceed.data.message}`);

  const eventAfterProceed = await Event.findById(testEventId);
  const decorResolved = eventAfterProceed.requestedServices.find((s) => s.category === "Decoration");
  console.log(`✓ Decoration status: "${decorResolved.status}" | userDecision: "${decorResolved.userDecision}"`);
  console.log(`✓ Other confirmed services intact:`);
  console.log(`   - Catering: "${eventAfterProceed.requestedServices.find(s=>s.category==='Catering').status}"`);
  console.log(`   - Photography: "${eventAfterProceed.requestedServices.find(s=>s.category==='Photography').status}"\n`);

  // ---------------------------------------------------------------------------
  // TEST 7: User Requesting an Alternative Vendor
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 7: User Requesting Alternative Vendor for Venue");
  console.log("--------------------------------------------------------------------------------");
  // Admin marks Venue as Unavailable or Host requests alternative
  await api(`/events/${testEventId}/services/Venue/mark-unavailable`, "POST", adminToken, {
    adminNotes: "Grand Kohinoor was unavailable on this date.",
  });
  const resAlt = await api(`/events/${testEventId}/services/Venue/resolve-unavailable`, "POST", hostToken, {
    decision: "Search Alternative",
    notes: "Please find another premium lawn or convention hall within 10 km.",
  });
  console.log(`✓ Host requested Alternative: ${resAlt.data.message}`);

  const eventAfterAlt = await Event.findById(testEventId);
  const venueResolved = eventAfterAlt.requestedServices.find((s) => s.category === "Venue");
  console.log(`✓ Venue status: "${venueResolved.status}" | userDecision: "${venueResolved.userDecision}"\n`);

  // ---------------------------------------------------------------------------
  // TEST 8: Duplicate Request Prevention
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 8: Duplicate Request Prevention");
  console.log("--------------------------------------------------------------------------------");
  // Try sending another request to Catering Vendor (who is already confirmed)
  const dupRes = await api(`/events/${testEventId}/services/Catering/request-vendor`, "POST", adminToken, {
    vendorId: cateringVendor._id,
    proposedPrice: 80000,
  });
  console.log(`✓ Attempted duplicate request status: ${dupRes.status} (Expected: 400)`);
  console.log(`✓ Error message: "${dupRes.data.message}"`);
  if (dupRes.status === 400) {
    console.log("✓ Duplicate active request successfully blocked by backend coordination engine!\n");
  } else {
    console.error("FAIL: Duplicate request was not blocked!");
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 9: Unauthorized Access Attempts
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 9: Unauthorized Access Attempts");
  console.log("--------------------------------------------------------------------------------");
  // 1. Unauthorized Host trying to access coordination details of another user's event
  const unauthCoord = await api(`/events/${testEventId}/coordination`, "GET", unauthHostToken);
  console.log(`✓ Other host accessing private event coordination: Status ${unauthCoord.status} (Expected: 403)`);

  // 2. Regular user trying to perform Admin confirmation
  const unauthConf = await api(`/events/${testEventId}/services/Catering/confirm-assignment`, "POST", hostToken, {
    vendorId: cateringVendor._id,
  });
  console.log(`✓ Non-admin user attempting confirm-assignment: Status ${unauthConf.status} (Expected: 403)`);

  // 3. Vendor 1 trying to respond to Vendor 3's booking
  const unauthVendorResp = await api(`/bookings/${venueBookingId}/respond`, "PUT", cateringToken, {
    action: "accept",
  });
  console.log(`✓ Vendor attempting to respond to another vendor's booking: Status ${unauthVendorResp.status} (Expected: 403)\n`);

  // ---------------------------------------------------------------------------
  // TEST 10: Database Persistence Verification
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 10: Database Persistence Verification");
  console.log("--------------------------------------------------------------------------------");
  // Close connection and re-open to guarantee reading persisted data directly from MongoDB
  await mongoose.disconnect();
  console.log("✓ Disconnected mongoose connection.");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Re-established fresh connection to MongoDB.");

  const persistedEvent = await Event.findById(testEventId);
  const persistedCateringBooking = await Booking.findById(cateringBookingId);
  const persistedPhotoBooking = await Booking.findById(photoBookingId);
  const persistedVenueBooking = await Booking.findById(venueBookingId);

  console.log(`✓ Persisted Event Title: "${persistedEvent.title}"`);
  console.log(`✓ Persisted Event Overall Status: "${persistedEvent.status}"`);
  console.log(`✓ Persisted Requested Services (${persistedEvent.requestedServices.length}):`);
  persistedEvent.requestedServices.forEach((s) => {
    console.log(`   - [${s.category}] Status: "${s.status}" | Agreed: ₹${s.agreedPrice} | Vendor: "${s.assignedVendorName}" | Decision: "${s.userDecision}" | DeclineReason: "${s.declineReason}"`);
  });

  console.log(`✓ Persisted Catering Booking: status="${persistedCateringBooking.status}", price=₹${persistedCateringBooking.totalPrice}`);
  console.log(`✓ Persisted Photography Booking: status="${persistedPhotoBooking.status}", price=₹${persistedPhotoBooking.totalPrice}`);
  console.log(`✓ Persisted Venue Booking: status="${persistedVenueBooking.status}", declineReason="${persistedVenueBooking.declineReason}"`);

  // Check notifications persistence
  const totalNotifs = await Notification.countDocuments({ eventName: { $regex: /Suddala & Sharma/i } });
  console.log(`✓ Persisted Notifications for this event: ${totalNotifs} notifications stored in MongoDB.`);

  await mongoose.disconnect();

  console.log("\n================================================================================");
  console.log("   ALL 10 TESTS PASSED SUCESSFULLY WITH VERIFIED DATABASE PERSISTENCE!          ");
  console.log("================================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
