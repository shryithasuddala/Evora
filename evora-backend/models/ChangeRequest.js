const mongoose = require("mongoose");

const changeRequestSchema = new mongoose.Schema(
  {
    bookingId:    { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    requesterId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendorId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type:         { type: String, enum: ["Cancel", "Reschedule"], required: true },
    reason:       { type: String, required: true },
    newDate:      { type: String, default: "" }, // for Reschedule
    status:       { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    refundAmount: { type: Number, default: 0 },
    decidedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    decidedAt:    { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChangeRequest", changeRequestSchema);
