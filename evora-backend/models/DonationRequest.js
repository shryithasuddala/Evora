const mongoose = require("mongoose");

const foodItemSubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dietType: {
      type: String,
      enum: ["Vegetarian", "Non-Vegetarian", "Vegan", "Mixed"],
      default: "Vegetarian",
    },
    quantity: { type: Number, required: true, min: 1 },
    unit: {
      type: String,
      enum: ["plates", "kg", "packets", "boxes"],
      default: "plates",
    },
  },
  { _id: false }
);

const donationRequestSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Organizer ID is required"],
    },
    charityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Charity",
      required: [true, "Charity ID is required"],
    },
    eventName: {
      type: String,
      trim: true,
      default: "Celebration Event",
    },
    eventType: {
      type: String,
      trim: true,
      default: "Wedding",
    },
    foodItems: {
      type: [foodItemSubSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one food item must be provided",
      },
    },
    quantity: {
      type: Number,
      required: [true, "Total quantity is required"],
      min: 1,
    },
    unit: {
      type: String,
      enum: ["plates", "kg", "packets", "boxes"],
      default: "plates",
    },
    preparedAt: {
      type: Date,
      required: [true, "Food preparation time is required"],
    },
    safeUntil: {
      type: Date,
      required: [true, "Safe to consume until time is required"],
    },
    pickupType: {
      type: String,
      enum: ["pickup", "drop_off"],
      default: "pickup",
    },
    packagingAvailable: {
      type: Boolean,
      default: true,
    },
    contactName: {
      type: String,
      required: [true, "Contact name is required"],
      trim: true,
    },
    contactPhone: {
      type: String,
      required: [true, "Contact phone is required"],
      trim: true,
    },
    pickupAddress: {
      type: String,
      required: [true, "Pickup address is required"],
      trim: true,
    },
    pickupCity: {
      type: String,
      trim: true,
      default: "Hyderabad",
    },
    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [78.4867, 17.3850], // [lng, lat]
      },
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    aiRecommendationReason: {
      type: String,
      default: "",
    },
    aiGeneratedMessage: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "picked_up", "delivered", "expired"],
      default: "pending",
    },
    statusTimeline: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],
    estimatedPeopleServed: {
      type: Number,
      default: 0,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    pickupTimeExpected: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

donationRequestSchema.index({ organizerId: 1, createdAt: -1 });
donationRequestSchema.index({ charityId: 1, status: 1 });
donationRequestSchema.index({ eventId: 1 });

module.exports = mongoose.model("DonationRequest", donationRequestSchema);
