const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    vendorId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bookingId:      { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    eventId:        { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    serviceId:      { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    reviewerId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewerName:   { type: String, default: "" },
    eventName:      { type: String, default: "" },
    overall:        { type: Number, required: true, min: 1, max: 5 },
    rating:         { type: Number, min: 1, max: 5 }, // alias to overall
    serviceQuality: { type: Number, default: 5, min: 1, max: 5 },
    punctuality:    { type: Number, default: 5, min: 1, max: 5 },
    pricing:        { type: Number, default: 5, min: 1, max: 5 },
    experience:     { type: Number, default: 5, min: 1, max: 5 },
    comment:        { type: String, default: "" },
  },
  { timestamps: true }
);

reviewSchema.pre("save", function (next) {
  if (!this.rating && this.overall) this.rating = this.overall;
  next();
});

module.exports = mongoose.model("Review", reviewSchema);
