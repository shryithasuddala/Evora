const mongoose = require("mongoose");
const { SERVICE_CATEGORIES } = require("../config/constants");

const serviceSchema = new mongoose.Schema(
  {
    vendorId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name:        { type: String, required: true, trim: true },
    category:    { type: String, required: true, enum: SERVICE_CATEGORIES },
    price:       { type: Number, required: true },
    rentalPrice: { type: Number, default: 0 },
    unit:        { type: String, default: "per event" },
    location:    { type: String, default: "" },
    city:        { type: String, default: "" },
    duration:    { type: String, default: "" },
    description: { type: String, default: "" },
    tags:        [{ type: String }],
    isActive:    { type: Boolean, default: true },

    // Venue & Halls specific attributes
    capacity:    { type: Number, default: 0 },
    venueType:   { type: String, default: "" },
    amenities:   [{ type: String }],
    images:      [{ type: String }],

    // Ratings & Reviews aggregate
    averageRating: { type: Number, default: 5.0 },
    reviewCount:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
