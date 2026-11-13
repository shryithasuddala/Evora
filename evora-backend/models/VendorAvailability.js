const mongoose = require("mongoose");

const vendorAvailabilitySchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    blockedDates: [{ type: String }], // format: YYYY-MM-DD
    capacityPerDay: { type: Number, default: 1, min: 1 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VendorAvailability", vendorAvailabilitySchema);
