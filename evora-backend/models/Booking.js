const mongoose = require("mongoose");
const { BOOKING_STATUSES } = require("../config/constants");

const bookingSchema = new mongoose.Schema(
  {
    organizerId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendorId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventId:       { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    serviceId:     { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    eventName:     { type: String, default: "" },
    organizer:     { type: String, default: "" },
    serviceName:   { type: String, default: "" },
    serviceCategory: { type: String, default: "" },
    items:         [{ type: String }],
    eventDate:     { type: String, default: "" }, // YYYY-MM-DD
    eventVenue:    { type: String, default: "" },
    guestCount:    { type: Number, default: 0 },
    notes:         { type: String, default: "" },

    // Coordination workflow fields
    proposedPrice:    { type: Number, default: 0 },
    assignmentNotes:  { type: String, default: "" },
    declineReason:    { type: String, default: "" },
    responseDeadline: { type: Date, default: null },

    // Booking flow status: Pending -> Proposal Sent -> Accepted -> Confirmed (via payment/admin) -> Completed
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "Pending",
    },

    // Payment linkage
    paidAmount:    { type: Number, default: 0 },
    totalPrice:    { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["Unpaid", "Partially Paid", "Paid", "Refunded"], default: "Unpaid" },
    paymentRef:    { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    cancellationFee: { type: Number, default: 0 },
    refundAmount:    { type: Number, default: 0 },
    cancellationReason: { type: String, default: "" },

    // Dynamic WhatsApp Booking Confirmation Status & Atomic Locking
    whatsappConfirmationStatus: {
      type: String,
      enum: ["not_sent", "in_progress", "sent", "simulated", "failed", "skipped_no_phone", "skipped_no_opt_in"],
      default: "not_sent",
    },
    whatsappConfirmationLockedAt: { type: Date, default: null },
    whatsappConfirmationSentAt:   { type: Date, default: null },
    whatsappNotificationId:       { type: mongoose.Schema.Types.ObjectId, ref: "Notification" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
