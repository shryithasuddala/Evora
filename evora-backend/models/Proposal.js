const mongoose = require("mongoose");

const proposalSchema = new mongoose.Schema(
  {
    bookingId:        { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    vendorId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    servicePrice:     { type: Number, required: true },
    advanceAmount:    { type: Number, default: 0 },
    includedServices: { type: String, default: "" },
    description:      { type: String, default: "" },
    validityDate:     { type: String, default: "" },
    serviceDuration:  { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Proposal", proposalSchema);
