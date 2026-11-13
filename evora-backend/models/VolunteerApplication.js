const mongoose = require("mongoose");

const volunteerApplicationSchema = new mongoose.Schema(
  {
    eventId:     { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status:      { type: String, enum: ["Applied", "Selected", "Rejected", "Withdrawn"], default: "Applied" },
    message:     { type: String, default: "" },
    appliedAt:   { type: Date, default: Date.now },
    decidedAt:   { type: Date },
  },
  { timestamps: true }
);

volunteerApplicationSchema.index({ eventId: 1, volunteerId: 1 }, { unique: true });

module.exports = mongoose.model("VolunteerApplication", volunteerApplicationSchema);
