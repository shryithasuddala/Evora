const ChangeRequest = require("../models/ChangeRequest");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const { emitNotification } = require("../services/notificationService");

// Helper to calculate refund based on event date
function calculateRefund(paidAmount, eventDateStr) {
  if (!paidAmount || paidAmount <= 0) return 0;
  if (!eventDateStr) return 0;

  const eventDate = new Date(eventDateStr);
  const now = new Date();
  const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays >= 14) {
    return Math.round(paidAmount * 0.8); // 80% refund
  } else if (diffDays >= 7) {
    return Math.round(paidAmount * 0.5); // 50% refund
  } else {
    return 0; // No refund within 7 days
  }
}

// @desc    Create a change request (Cancel or Reschedule)
// @route   POST /api/change-requests
// @access  Private (User)
exports.createChangeRequest = async (req, res, next) => {
  try {
    const { bookingId, type, reason, newDate } = req.body;

    if (!bookingId || !type || !reason) {
      return res.status(400).json({ success: false, message: "bookingId, type, and reason are required" });
    }

    const booking = await Booking.findById(bookingId).populate("eventId");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (String(booking.userId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to request changes on this booking" });
    }

    const existingPending = await ChangeRequest.findOne({ bookingId, status: "Pending" });
    if (existingPending) {
      return res.status(400).json({ success: false, message: "A change request is already pending for this booking" });
    }

    let refundAmount = 0;
    if (type === "Cancel") {
      refundAmount = calculateRefund(booking.paidAmount || 0, booking.date || booking.eventId?.date);
    }

    const request = await ChangeRequest.create({
      bookingId: booking._id,
      requesterId: req.user._id,
      vendorId: booking.vendorId,
      type,
      reason,
      newDate: newDate || "",
      refundAmount,
    });

    // Notify vendor
    emitNotification({
      userId: booking.vendorId,
      type: "warning",
      title: `Booking Change Request: ${type}`,
      message: `${req.user.fullName} requested to ${type.toLowerCase()} booking for ${booking.serviceTitle || booking.serviceName || "your service"}.`,
      link: "/vendor/bookings",
      idempotencyKey: `change-req-created:${request._id}:vendor:${booking.vendorId}`,
      bookingId: booking._id,
      eventId: booking.eventId?._id || booking.eventId || null,
      eventName: booking.eventName || "",
    }).catch((e) => console.warn(e.message));

    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

// @desc    Get change requests for user or vendor
// @route   GET /api/change-requests
// @access  Private
exports.getMyChangeRequests = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === "user") {
      query.requesterId = req.user._id;
    } else if (req.user.role === "vendor") {
      query.vendorId = req.user._id;
    }

    const requests = await ChangeRequest.find(query)
      .populate("bookingId")
      .populate("requesterId", "fullName email phone")
      .populate("vendorId", "fullName email businessName phone")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
};

// @desc    Decide change request (Approve or Reject)
// @route   PUT /api/change-requests/:id/decide
// @access  Private (Vendor / Admin)
exports.decideChangeRequest = async (req, res, next) => {
  try {
    const { action } = req.body; // "Approve" or "Reject"
    if (!["Approve", "Reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be Approve or Reject" });
    }

    const request = await ChangeRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Change request not found" });
    }

    if (String(request.vendorId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to decide this change request" });
    }

    request.status = action === "Approve" ? "Approved" : "Rejected";
    request.decidedBy = req.user._id;
    request.decidedAt = new Date();
    await request.save();

    const booking = await Booking.findById(request.bookingId);
    if (booking && action === "Approve") {
      if (request.type === "Cancel") {
        booking.status = "Cancelled";
      } else if (request.type === "Reschedule" && request.newDate) {
        booking.date = request.newDate;
      }
      await booking.save();
    }

    emitNotification({
      userId: request.requesterId,
      type: action === "Approve" ? "success" : "alert",
      title: `Change Request ${request.status}`,
      message: `Your request to ${request.type.toLowerCase()} the booking has been ${request.status.toLowerCase()}${request.refundAmount ? ` (Refund: ₹${request.refundAmount.toLocaleString()})` : ""}.`,
      link: "/user/bookings",
      idempotencyKey: `change-req-decided:${request._id}:${request.status}:user:${request.requesterId}`,
      bookingId: request.bookingId || null,
    }).catch((e) => console.warn(e.message));

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};
