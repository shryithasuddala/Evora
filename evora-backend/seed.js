/**
 * EVORA Clean Baseline Seeder
 * Populates verified core platform accounts with working credentials.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const connectDB = require("./config/db");

const User = require("./models/User");
const Event = require("./models/Event");

const seed = async () => {
  await connectDB();
  console.log("🌱 Ensuring core verified platform accounts...");

  const defaultPassword = "Password123!";

  // 1. Admin Account
  let admin = await User.findOne({ email: "admin@evora.com" });
  if (!admin) {
    admin = await User.create({
      fullName: "Admin Controller",
      email: "admin@evora.com",
      password: defaultPassword,
      role: "admin",
      phone: "+91 99999 00000",
      location: "Hyderabad",
      isActive: true,
      isVerified: true,
    });
    console.log("✓ Core Admin initialized: admin@evora.com / Password123!");
  } else {
    admin.password = defaultPassword;
    admin.isActive = true;
    admin.isVerified = true;
    await admin.save();
    console.log("✓ Core Admin updated: admin@evora.com / Password123!");
  }

  // 2. Host / Organizer Account (User primary)
  let host = await User.findOne({ email: "shryithasuddala@gmail.com" });
  if (!host) {
    host = await User.create({
      fullName: "Suddala Shryitha",
      email: "shryithasuddala@gmail.com",
      password: defaultPassword,
      role: "user",
      phone: "+91 98765 43210",
      location: "Hyderabad",
      isActive: true,
      isVerified: true,
    });
    console.log("✓ Core Host initialized: shryithasuddala@gmail.com / Password123!");
  } else {
    host.password = defaultPassword;
    host.isActive = true;
    host.isVerified = true;
    await host.save();
    console.log("✓ Core Host updated: shryithasuddala@gmail.com / Password123!");
  }

  // 3. Organizer Account
  let organizer = await User.findOne({ email: "organizer@evora.com" });
  if (!organizer) {
    organizer = await User.create({
      fullName: "Priya Sharma",
      email: "organizer@evora.com",
      password: defaultPassword,
      role: "user",
      phone: "+91 98765 43211",
      location: "Hyderabad, India",
      isActive: true,
      isVerified: true,
    });
    console.log("✓ Core Organizer initialized: organizer@evora.com / Password123!");
  } else {
    organizer.password = defaultPassword;
    organizer.isActive = true;
    organizer.isVerified = true;
    await organizer.save();
    console.log("✓ Core Organizer updated: organizer@evora.com / Password123!");
  }

  // 4. Core Volunteer Account
  let volunteer = await User.findOne({ email: "volunteer@evora.com" });
  if (!volunteer) {
    volunteer = await User.create({
      fullName: "Aarav Patel",
      email: "volunteer@evora.com",
      password: defaultPassword,
      role: "volunteer",
      phone: "+91 98765 12345",
      location: "Hyderabad, India",
      city: "Hyderabad",
      bio: "Guest Reception & Ceremony Hospitality Specialist",
      volunteerId: "EVO-VOL-2026-1001",
      skills: ["Guest Reception", "Crowd Coordination", "Food Rescue"],
      verificationStatus: "Approved",
      isActive: true,
      isVerified: true,
    });
    console.log("✓ Core Volunteer initialized: volunteer@evora.com / Password123!");
  } else {
    volunteer.password = defaultPassword;
    volunteer.isActive = true;
    volunteer.isVerified = true;
    await volunteer.save();
    console.log("✓ Core Volunteer updated: volunteer@evora.com / Password123!");
  }

  // 5. Core Vendor Account
  let vendor = await User.findOne({ email: "vendor@evora.com" });
  if (!vendor) {
    vendor = await User.create({
      fullName: "Rajesh Studio Artisans",
      businessName: "Artisan Lens Studio",
      email: "vendor@evora.com",
      password: defaultPassword,
      role: "vendor",
      phone: "+91 98765 99999",
      location: "Hyderabad, India",
      serviceType: "Photography & Cinematography",
      isActive: true,
      isVerified: true,
    });
    console.log("✓ Core Vendor initialized: vendor@evora.com / Password123!");
  } else {
    vendor.password = defaultPassword;
    vendor.isActive = true;
    vendor.isVerified = true;
    await vendor.save();
    console.log("✓ Core Vendor updated: vendor@evora.com / Password123!");
  }

  // 6. Ensure at least one active celebration event exists
  let event = await Event.findOne({ organizerId: organizer._id });
  if (!event) {
    event = await Event.create({
      organizerId: organizer._id,
      title: "Royal Grand Sangeet & Reception",
      category: "Wedding",
      date: "2026-12-15",
      time: "06:30 PM",
      location: "Banjara Hills, Hyderabad",
      venue: "Taj Krishna Grand Ballroom",
      guestCount: 350,
      totalBudget: 1500000,
      description: "Grand evening celebration featuring live classical fusion musicians and royal floral banquet setup.",
      status: "Approved",
      planStatus: "Booked",
    });
    console.log("✓ Sample Celebration Event created:", event.title);
  }

  console.log("\n✅ All core platform accounts initialized and verified.");
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seeder error:", err);
  process.exit(1);
});
