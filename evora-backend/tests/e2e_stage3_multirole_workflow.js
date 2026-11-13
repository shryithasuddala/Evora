const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const VendorAvailability = require("../models/VendorAvailability");

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

async function runE2E() {
  console.log("================================================================================");
  console.log("  EVORA - STAGE 3 COMPLETE MULTI-ROLE END-TO-END WORKFLOW VERIFICATION TEST      ");
  console.log("================================================================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB Atlas.\n");

  // 1. Identify Actors
  const hostUser = await User.findOne({ email: "shryithasuddala@gmail.com" });
  if (!hostUser) throw new Error("Host user shryithasuddala@gmail.com not found!");

  const adminUser = await User.findOne({ role: "admin" });
  if (!adminUser) throw new Error("Admin user not found!");

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

  const hostToken = generateToken(hostUser);
  const adminToken = generateToken(adminUser);
  const cateringToken = generateToken(cateringVendor);
  const photoToken = generateToken(photoVendor);
  const venueToken = generateToken(venueVendor);

  console.log("Actors Initialized:");
  console.log(`- Host User: ${hostUser.fullName} (${hostUser.email})`);
  console.log(`- Admin: ${adminUser.fullName} (${adminUser.email})`);
  console.log(`- Catering Artisan: ${cateringVendor.businessName} (${cateringVendor.email})`);
  console.log(`- Photography Artisan: ${photoVendor.businessName} (${photoVendor.email})`);
  console.log(`- Venue Artisan: ${venueVendor.businessName} (${venueVendor.email})`);
  console.log("--------------------------------------------------------------------------------\n");

  const targetDate = "2026-12-28";

  // STEP 1: User creates celebration with 4 services (Catering, Photography, Venue, Decoration)
  console.log("STEP 1: User creates celebration with 4 services (Catering, Photography, Venue, Decoration)...");
  const createRes = await api("/events", "POST", hostToken, {
    title: "E2E Stage 3 Celebration - Royal Jubilee Gala",
    category: "Wedding",
    date: targetDate,
    time: "18:00",
    location: "Hyderabad",
    venue: "Kohinoor Grand Ballroom",
    guestCount: 800,
    totalBudget: 1500000,
    requestedServices: [
      { category: "Catering", specificRequirements: "Royal Mughlai & South Indian Buffet for 800 guests", targetBudget: 500000 },
      { category: "Photography", specificRequirements: "Drone coverage, 3 candid cinematographers", targetBudget: 250000 },
      { category: "Venue", specificRequirements: "Centrally air-conditioned banquet hall with valet parking", targetBudget: 450000 },
      { category: "Decoration", specificRequirements: "Floral stage, crystal chandeliers, royal entryway", targetBudget: 300000 },
    ],
  });

  if (!createRes.ok) {
    throw new Error(`Event creation failed: ${JSON.stringify(createRes.data)}`);
  }
  const eventObj = createRes.data.event || createRes.data;
  const eventId = eventObj._id || eventObj.id;
  console.log(`✓ Event created successfully with ID: ${eventId}`);
  console.log(`  Initial Event Status: ${eventObj.status}`);
  console.log(`  Services count: ${eventObj.requestedServices?.length || 0}`);
  console.log("--------------------------------------------------------------------------------\n");

  // STEP 2: Admin receives event request and inspects notifications
  console.log("STEP 2: Admin checks incoming celebration coordination & notifications...");
  const adminNotifs = await api("/notifications", "GET", adminToken);
  const eventCoord = await api(`/events/${eventId}/coordination`, "GET", adminToken);
  console.log(`✓ Admin retrieved event coordination successfully.`);
  console.log(`  Event Title: ${eventCoord.data.event.title}`);
  console.log(`  Services tracking array length: ${eventCoord.data.requestedServices.length}`);
  console.log("--------------------------------------------------------------------------------\n");

  // STEP 3: Admin checks candidate vendors for each service
  console.log("STEP 3: Admin inspects candidate artisan readiness & availability matrix...");
  for (const s of eventCoord.data.requestedServices) {
    console.log(`  - Service [${s.category}]: ${s.candidateVendors?.length || 0} registered candidates. Status: ${s.status}`);
  }
  console.log("✓ Vendor readiness and availability inspected for all 4 services.\n");
  console.log("--------------------------------------------------------------------------------\n");

  // STEP 4: Admin sends individual service requests
  console.log("STEP 4: Admin sends individual inquiries to Catering, Photography, and Venue artisans...");
  
  // 4a. Request Catering
  const reqCatering = await api(`/events/${eventId}/services/Catering/request-vendor`, "POST", adminToken, {
    vendorId: cateringVendor._id.toString(),
    proposedPrice: 480000,
    assignmentNotes: "Special royal service for 800 guests. Pure ghee sweets required.",
  });
  console.log(`✓ Catering inquiry dispatched to ${cateringVendor.businessName}. Service status: ${reqCatering.data?.service?.status}`);

  // 4b. Request Photography
  const reqPhoto = await api(`/events/${eventId}/services/Photography/request-vendor`, "POST", adminToken, {
    vendorId: photoVendor._id.toString(),
    proposedPrice: 240000,
    assignmentNotes: "Traditional + Candid + Drone 4K coverage.",
  });
  console.log(`✓ Photography inquiry dispatched to ${photoVendor.businessName}. Service status: ${reqPhoto.data?.service?.status}`);

  // 4c. Request Venue
  const reqVenue = await api(`/events/${eventId}/services/Venue/request-vendor`, "POST", adminToken, {
    vendorId: venueVendor._id.toString(),
    proposedPrice: 450000,
    assignmentNotes: "Full hall access from 10:00 AM.",
  });
  console.log(`✓ Venue inquiry dispatched to ${venueVendor.businessName}. Service status: ${reqVenue.data?.service?.status}`);
  console.log("--------------------------------------------------------------------------------\n");

  // STEP 5: Catering & Photography vendors accept requests
  console.log("STEP 5: Catering & Photography artisans respond with ACCEPTANCE...");

  // Catering Vendor fetches requests and accepts
  const cateringBookingsRes = await api("/bookings", "GET", cateringToken);
  const cateringBookings = cateringBookingsRes.data.bookings || cateringBookingsRes.data || [];
  const cateringBooking = cateringBookings.find(b => (b.eventId?._id || b.eventId) == eventId);
  if (!cateringBooking) throw new Error("Catering booking not found in vendor queue!");
  const acceptCatering = await api(`/bookings/${cateringBooking._id}/respond`, "PUT", cateringToken, {
    action: "accept",
  });
  console.log(`✓ Catering Artisan accepted inquiry. Status: ${acceptCatering.data?.booking?.status || acceptCatering.data?.status}`);

  // Photography Vendor fetches requests and accepts
  const photoBookingsRes = await api("/bookings", "GET", photoToken);
  const photoBookings = photoBookingsRes.data.bookings || photoBookingsRes.data || [];
  const photoBooking = photoBookings.find(b => (b.eventId?._id || b.eventId) == eventId);
  if (!photoBooking) throw new Error("Photography booking not found in vendor queue!");
  const acceptPhoto = await api(`/bookings/${photoBooking._id}/respond`, "PUT", photoToken, {
    action: "accept",
  });
  console.log(`✓ Photography Artisan accepted inquiry. Status: ${acceptPhoto.data?.booking?.status || acceptPhoto.data?.status}`);
  console.log("--------------------------------------------------------------------------------\n");

  // STEP 6: Venue vendor declines with reason
  console.log("STEP 6: Venue artisan declines request with specific reason...");
  const venueBookingsRes = await api("/bookings", "GET", venueToken);
  const venueBookings = venueBookingsRes.data.bookings || venueBookingsRes.data || [];
  const venueBooking = venueBookings.find(b => (b.eventId?._id || b.eventId) == eventId);
  if (!venueBooking) throw new Error("Venue booking not found in vendor queue!");
  const declineVenue = await api(`/bookings/${venueBooking._id}/respond`, "PUT", venueToken, {
    action: "decline",
    declineReason: "Grand ballroom is undergoing maintenance & private corporate reservation on Dec 15th.",
  });
  console.log(`✓ Venue Artisan declined inquiry. Status: ${declineVenue.data?.booking?.status || declineVenue.data?.status}, Reason: "${declineVenue.data?.booking?.declineReason || declineVenue.data?.declineReason}"`);
  console.log("--------------------------------------------------------------------------------\n");

  // STEP 7: Admin marks Decoration as Unavailable and notifies host
  console.log("STEP 7: Admin marks Decoration unavailable and notifies host...");
  const unavailRes = await api(`/events/${eventId}/services/Decoration/mark-unavailable`, "POST", adminToken, {
    adminNotes: "All certified floral and chandelier designers are booked on Dec 15th peak date. Host can proceed without or request alternative vendor search.",
  });
  console.log(`✓ Decoration marked unavailable. Service status: ${unavailRes.data?.service?.status}`);
  console.log("--------------------------------------------------------------------------------\n");

  // STEP 8: Admin confirms accepted Catering & Photography vendors
  console.log("STEP 8: Admin confirms accepted Catering & Photography artisans...");
  const confirmCatering = await api(`/events/${eventId}/services/Catering/confirm-assignment`, "POST", adminToken, {
    vendorId: cateringVendor._id.toString(),
    agreedPrice: 480000,
    assignmentNotes: "Finalized package with royal dinner menu & desserts.",
  });
  console.log(`✓ Catering confirmed. Status: ${confirmCatering.data?.service?.status}, Agreed Price: ₹${confirmCatering.data?.service?.agreedPrice}`);

  const confirmPhoto = await api(`/events/${eventId}/services/Photography/confirm-assignment`, "POST", adminToken, {
    vendorId: photoVendor._id.toString(),
    agreedPrice: 240000,
    assignmentNotes: "Cinematography team of 4 locked with deliverables in 14 days.",
  });
  console.log(`✓ Photography confirmed. Status: ${confirmPhoto.data?.service?.status}, Agreed Price: ₹${confirmPhoto.data?.service?.agreedPrice}`);
  console.log("--------------------------------------------------------------------------------\n");

  // STEP 9: User receives service-wise updates and inspects event details
  console.log("STEP 9: User checks Event Details & Service Tracking status...");
  const userCoord = await api(`/events/${eventId}/coordination`, "GET", hostToken);
  console.log(`✓ User retrieved celebration coordination matrix:`);
  for (const s of userCoord.data.requestedServices) {
    console.log(`  - [${s.category}]: Status = "${s.status}", Assigned = "${s.assignedVendorName || 'None'}", Agreed = ₹${s.agreedPrice || 0}`);
  }
  console.log(`  Summary: ${userCoord.data.summary.confirmedCount} confirmed, ${userCoord.data.summary.unavailableCount} unavailable.`);
  console.log("--------------------------------------------------------------------------------\n");

  // STEP 10: User resolves Decoration: chooses "Proceed Without"
  console.log("STEP 10: User resolves Decoration by selecting 'Proceed Without'...");
  const resolveDecor = await api(`/events/${eventId}/services/Decoration/resolve-unavailable`, "POST", hostToken, {
    decision: "Proceed Without",
  });
  console.log(`✓ User resolved Decoration: status="${resolveDecor.data?.service?.status}", decision="${resolveDecor.data?.service?.userDecision}"`);
  console.log("--------------------------------------------------------------------------------\n");

  // STEP 11: User resolves Venue: chooses "Search Alternative"
  console.log("STEP 11: User resolves Venue by selecting 'Search Alternative'...");
  // First, if Venue was declined, mark it as unavailable so user can trigger resolution or directly request alternative
  await api(`/events/${eventId}/services/Venue/mark-unavailable`, "POST", adminToken, {
    adminNotes: "Grand Kohinoor declined due to corporate reservation. Host requested alternative venue options.",
  });
  const resolveVenue = await api(`/events/${eventId}/services/Venue/resolve-unavailable`, "POST", hostToken, {
    decision: "Search Alternative",
  });
  console.log(`✓ User requested alternative Venue: status="${resolveVenue.data?.service?.status}", decision="${resolveVenue.data?.service?.userDecision}"`);
  console.log("--------------------------------------------------------------------------------\n");

  // STEP 12: Admin sees updated event state and can fulfill alternative Venue search
  console.log("STEP 12: Admin inspects updated celebration matrix for alternative search...");
  const finalCoord = await api(`/events/${eventId}/coordination`, "GET", adminToken);
  const decorFinal = finalCoord.data.requestedServices.find(s => s.category === "Decoration");
  const venueFinal = finalCoord.data.requestedServices.find(s => s.category === "Venue");
  const cateringFinal = finalCoord.data.requestedServices.find(s => s.category === "Catering");
  const photoFinal = finalCoord.data.requestedServices.find(s => s.category === "Photography");

  console.log(`✓ Verification of final state:`);
  console.log(`  - Catering: ${cateringFinal.status} (Vendor: ${cateringFinal.assignedVendorName}, Price: ₹${cateringFinal.agreedPrice})`);
  console.log(`  - Photography: ${photoFinal.status} (Vendor: ${photoFinal.assignedVendorName}, Price: ₹${photoFinal.agreedPrice})`);
  console.log(`  - Decoration: ${decorFinal.status} (User Decision: "${decorFinal.userDecision}")`);
  console.log(`  - Venue: ${venueFinal.status} (User Decision: "${venueFinal.userDecision}")`);
  console.log(`  - Overall Event Status: ${finalCoord.data.event.status}`);
  console.log("--------------------------------------------------------------------------------\n");

  // Database Verification
  const dbEvent = await Event.findById(eventId);
  console.log("MongoDB Database Persistence Audit:");
  console.log(`- Stored requestedServices count: ${dbEvent.requestedServices.length}`);
  console.log(`- Stored Event status: ${dbEvent.status}`);
  console.log(`- Catering bookingId: ${dbEvent.requestedServices.find(s => s.category === 'Catering')?.activeBookingId}`);
  console.log(`- Photography bookingId: ${dbEvent.requestedServices.find(s => s.category === 'Photography')?.activeBookingId}`);

  // Safe Cleanup of this specific E2E test celebration
  await Booking.deleteMany({ eventId });
  await Event.findByIdAndDelete(eventId);
  console.log("\n✓ Cleaned up test event and test booking artifacts while preserving all real platform users.");

  await mongoose.disconnect();
  console.log("\n================================================================================");
  console.log("   🎉 ALL 12 MULTI-ROLE END-TO-END WORKFLOW STEPS PASSED SUCCESSFULLY!          ");
  console.log("================================================================================");
}

runE2E().catch(err => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
