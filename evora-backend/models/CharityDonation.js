const mongoose = require("mongoose");

const charityDonationSchema = new mongoose.Schema(
  {
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    eventName: { type: String, default: "" },
    foodType: { type: String, required: true },
    quantityMeals: { type: Number, required: true },
    pickupAddress: { type: String, required: true },
    pickupTime: { type: String, default: "Immediate (within 2-3 hours)" },
    contactPhone: { type: String, default: "" },
    dietType: { type: String, enum: ["Vegetarian", "Non-Vegetarian", "Mixed"], default: "Vegetarian" },
    status: {
      type: String,
      enum: ["Listed", "Volunteer Assigned", "Picked Up", "Delivered to Shelter"],
      default: "Listed",
    },
    volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    shelterName: { type: String, default: "Robin Hood Army & City Shelter Network" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CharityDonation", charityDonationSchema);
