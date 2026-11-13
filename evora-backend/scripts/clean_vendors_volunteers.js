const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

const User = require("../models/User");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const VendorAvailability = require("../models/VendorAvailability");
const Task = require("../models/Task");
const VolunteerApplication = require("../models/VolunteerApplication");
const Event = require("../models/Event");
const Review = require("../models/Review");
const Notification = require("../models/Notification");

async function purgeVendorAndVolunteerData() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB Atlas.\n");

  // 1. Delete all users with role 'vendor' or 'volunteer', or test users
  const delUsers = await User.deleteMany({
    $or: [
      { role: { $in: ["vendor", "volunteer"] } },
      { email: { $regex: /test\./i } },
    ],
  });
  console.log(`✓ Deleted Users (vendors, volunteers, test accounts): ${delUsers.deletedCount}`);

  // 2. Delete all Vendor Availability records
  const delAvail = await VendorAvailability.deleteMany({});
  console.log(`✓ Deleted VendorAvailability records: ${delAvail.deletedCount}`);

  // 3. Delete all Vendor Services
  const delServices = await Service.deleteMany({});
  console.log(`✓ Deleted Vendor Services in catalogue: ${delServices.deletedCount}`);

  // 4. Delete all Volunteer Tasks
  const delTasks = await Task.deleteMany({});
  console.log(`✓ Deleted Volunteer Tasks: ${delTasks.deletedCount}`);

  // 5. Delete all Volunteer Applications
  const delVolApps = await VolunteerApplication.deleteMany({});
  console.log(`✓ Deleted Volunteer Applications: ${delVolApps.deletedCount}`);

  // 6. Delete all Reviews
  const delReviews = await Review.deleteMany({});
  console.log(`✓ Deleted Reviews: ${delReviews.deletedCount}`);

  // 7. Delete all Bookings
  const delBookings = await Booking.deleteMany({});
  console.log(`✓ Deleted Bookings: ${delBookings.deletedCount}`);

  // 8. Delete temporary E2E test celebrations
  const delEvents = await Event.deleteMany({
    title: { $regex: /E2E/i },
  });
  console.log(`✓ Deleted temporary E2E test events: ${delEvents.deletedCount}`);

  // 9. Reset real user celebrations to fresh clean state
  const remainingEvents = await Event.find({});
  for (const ev of remainingEvents) {
    ev.allocatedVendors = [];
    if (ev.requestedServices && ev.requestedServices.length > 0) {
      ev.requestedServices.forEach((s) => {
        s.assignedVendorId = null;
        s.assignedVendorName = "";
        s.agreedPrice = 0;
        s.assignmentNotes = "";
        s.activeBookingId = null;
        s.declineReason = "";
        s.status = "Requested";
        s.userDecision = "None";
      });
      ev.status = "Submitted";
    }
    await ev.save();
    console.log(`✓ Reset Event: "${ev.title}" (Status: ${ev.status}, Services reset: ${ev.requestedServices?.length || 0})`);
  }

  // 10. Audit remaining users
  const remainingUsers = await User.find({}, "fullName email role");
  console.log("\n=======================================================");
  console.log("   CLEAN PLATFORM AUDIT - REMAINING REAL ACCOUNTS     ");
  console.log("=======================================================");
  remainingUsers.forEach((u) => {
    console.log(`- [${u.role.toUpperCase()}] ${u.fullName} (${u.email})`);
  });

  const totalVendors = await User.countDocuments({ role: "vendor" });
  const totalVolunteers = await User.countDocuments({ role: "volunteer" });
  const totalVendorAvail = await VendorAvailability.countDocuments({});
  const totalServices = await Service.countDocuments({});
  const totalTasks = await Task.countDocuments({});
  const totalVolApps = await VolunteerApplication.countDocuments({});
  const totalBookings = await Booking.countDocuments({});

  console.log("\nCounts verification:");
  console.log(`- Total Vendors: ${totalVendors}`);
  console.log(`- Total Volunteers: ${totalVolunteers}`);
  console.log(`- Total Vendor Availability Docs: ${totalVendorAvail}`);
  console.log(`- Total Catalog Services: ${totalServices}`);
  console.log(`- Total Volunteer Tasks: ${totalTasks}`);
  console.log(`- Total Volunteer Applications: ${totalVolApps}`);
  console.log(`- Total Bookings: ${totalBookings}`);
  console.log("=======================================================\n");

  await mongoose.disconnect();
  console.log("Database purge completed successfully.");
}

purgeVendorAndVolunteerData().catch((err) => {
  console.error("Purge error:", err);
  process.exit(1);
});
