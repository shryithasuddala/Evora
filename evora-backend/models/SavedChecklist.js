const mongoose = require("mongoose");

const checklistTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General" },
    daysBefore: { type: Number, default: 7 },
    phase: { type: String, default: "7 Days Before" },
    dueDate: { type: String, default: "" }, // YYYY-MM-DD calculated from eventDate - daysBefore
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const savedChecklistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    title: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    eventDate: { type: String, required: true }, // YYYY-MM-DD
    guestCount: { type: Number, default: 0 },
    services: [{ type: String }],
    tasks: [checklistTaskSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SavedChecklist", savedChecklistSchema);
