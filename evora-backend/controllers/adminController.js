const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const Task = require("../models/Task");
const Payment = require("../models/Payment");
const { emitNotification } = require("../services/notificationService");

// @desc    Admin dashboard metrics
// @route   GET /api/admin/stats
// @access  Private (admin)
exports.getPlatformStats = async (req, res, next) => {
  try {
    const [totalUsers, totalVendors, totalVolunteers, totalEvents, totalBookings, pendingBookings] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "vendor" }),
      User.countDocuments({ role: "volunteer" }),
      Event.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "Pending" }),
    ]);

    res.status(200).json({
      success: true,
      stats: { totalUsers, totalVendors, totalVolunteers, totalEvents, totalBookings, pendingBookings },
    });
  } catch (err) { next(err); }
};

// @desc    Get all users (any role)
// @route   GET /api/admin/users
// @access  Private (admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
};

// @desc    Toggle user active status (suspend / reinstate)
// @route   PUT /api/admin/users/:id/toggle-status
// @access  Private (admin)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.role === "admin") return res.status(400).json({ success: false, message: "Cannot suspend admin accounts." });
    user.isActive = !user.isActive;
    await user.save();
    res.status(200).json({ success: true, user, message: `User ${user.isActive ? "reinstated" : "suspended"}.` });
  } catch (err) { next(err); }
};

// @desc    Toggle vendor verification badge
// @route   PUT /api/admin/users/:id/toggle-verify
// @access  Private (admin)
exports.toggleVerified = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    user.isVerified = !user.isVerified;
    await user.save();
    res.status(200).json({ success: true, user });
  } catch (err) { next(err); }
};

// @desc    Delete any user (admin power)
// @route   DELETE /api/admin/users/:id
// @access  Private (admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.role === "admin") return res.status(400).json({ success: false, message: "Cannot delete admin accounts." });
    await user.deleteOne();
    res.status(200).json({ success: true, message: "User deleted." });
  } catch (err) { next(err); }
};

// @desc    Get volunteers by verification status
// @route   GET /api/admin/volunteers
// @access  Private (admin)
exports.getVolunteers = async (req, res, next) => {
  try {
    const filter = { role: "volunteer" };
    if (req.query.status) {
      filter.verificationStatus = req.query.status;
    }

    const volunteers = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.json({ success: true, count: volunteers.length, data: volunteers });
  } catch (err) { next(err); }
};

// @desc    Approve or Reject volunteer application
// @route   PUT /api/admin/volunteers/:id/verify
// @access  Private (admin)
exports.verifyVolunteer = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be Approved or Rejected" });
    }

    const volunteer = await User.findById(req.params.id);
    if (!volunteer || volunteer.role !== "volunteer") {
      return res.status(404).json({ success: false, message: "Volunteer not found" });
    }

    volunteer.verificationStatus = status;
    volunteer.isVerified = status === "Approved";
    if (rejectionReason) volunteer.rejectionReason = rejectionReason;
    await volunteer.save();

    emitNotification({
      userId: volunteer._id,
      type: status === "Approved" ? "success" : "alert",
      title: `Volunteer Verification: ${status}`,
      message: status === "Approved"
        ? `Congratulations! Your EVORA Volunteer ID (${volunteer.volunteerId}) is now approved and active.`
        : `Your volunteer profile was reviewed and marked as Rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
      link: "/volunteer",
      idempotencyKey: `vol-verify:${volunteer._id}:${status}:${Date.now()}`,
    }).catch((e) => console.warn(e.message));

    res.json({ success: true, message: `Volunteer ${status.toLowerCase()} successfully`, data: volunteer });
  } catch (err) { next(err); }
};

// @desc    Safely serve volunteer ID proof file
// @route   GET /api/admin/idproof/:filename
// @access  Private (admin)
exports.getIdProofFile = async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, "../uploads/idproofs", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "ID proof document not found" });
    }

    res.sendFile(filePath);
  } catch (err) { next(err); }
};

// @desc    Export platform data for CSV reporting
// @route   GET /api/admin/reports/export/:resource
// @access  Private (admin)
exports.exportReportData = async (req, res, next) => {
  try {
    const { resource } = req.params; // users, bookings, payments, events
    let data = [];

    if (resource === "users") {
      data = await User.find().select("-password").lean();
    } else if (resource === "bookings") {
      data = await Booking.find().populate("userId", "fullName email").populate("vendorId", "businessName fullName").lean();
    } else if (resource === "payments") {
      data = await Payment.find().populate("userId", "fullName email").populate("bookingId").lean();
    } else if (resource === "events") {
      data = await Event.find().populate("userId", "fullName email").lean();
    } else {
      return res.status(400).json({ success: false, message: "Unknown resource type" });
    }

    res.json({ success: true, resource, count: data.length, data });
  } catch (err) { next(err); }
};
