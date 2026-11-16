const mongoose = require("mongoose");

const charitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Charity name is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Charity type is required"],
      enum: ["NGO", "orphanage", "old-age home", "shelter"],
      default: "NGO",
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      default: "Hyderabad",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      // GeoJSON standard: [longitude, latitude]
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coords) =>
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords[0] >= -180 &&
            coords[0] <= 180 &&
            coords[1] >= -90 &&
            coords[1] <= 90,
          message: "Coordinates must be [longitude, latitude] within valid ranges",
        },
      },
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    acceptsCookedFood: {
      type: Boolean,
      default: true,
    },
    capacityPerDay: {
      type: Number,
      default: 200,
      min: [1, "Capacity must be at least 1 person/plate per day"],
    },
    operatingHours: {
      type: String,
      default: "08:00 - 22:00",
    },
    verified: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    contactPerson: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// 2dsphere index for geospatial $near and $geoNear queries
charitySchema.index({ location: "2dsphere" });
charitySchema.index({ type: 1, verified: 1 });
charitySchema.index({ city: 1 });

module.exports = mongoose.model("Charity", charitySchema);
