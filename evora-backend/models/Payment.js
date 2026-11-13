const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    bookingId:      { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    eventId:        { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    payerId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendorId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mode:           { type: String, enum: ["advance50", "full", "express"], required: true },
    totalAmount:    { type: Number, required: true },
    amountPaid:     { type: Number, required: true },
    balance:        { type: Number, default: 0 },
    status:         { type: String, enum: ["Pending", "Partially Paid", "Paid", "Refunded", "Failed"], default: "Paid" },
    method:         { type: String, default: "UPI / NetBanking Demo" },
    transactionRef: { type: String, required: true },
    paidAt:         { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
