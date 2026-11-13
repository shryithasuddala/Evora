const mongoose = require("mongoose");
const crypto = require("crypto");

const guestSchema = new mongoose.Schema(
  {
    eventId:     { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    name:        { type: String, required: true, trim: true },
    email:       { type: String, trim: true, default: "" },
    phone:       { type: String, trim: true, default: "" },
    group:       { type: String, default: "General Guests" }, // Family, Friends, VIP, Colleagues
    status:      { type: String, enum: ["Invited", "Confirmed", "Declined", "Maybe"], default: "Invited" },
    plusOnes:    { type: Number, default: 0 },
    rsvpToken:   { type: String, unique: true },
    invitationSent: { type: Boolean, default: false },
    dietaryNotes:{ type: String, default: "" },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

guestSchema.pre("save", function (next) {
  if (!this.rsvpToken) {
    this.rsvpToken = crypto.randomBytes(16).toString("hex");
  }
  next();
});

module.exports = mongoose.model("Guest", guestSchema);
