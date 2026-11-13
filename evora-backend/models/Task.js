const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    volunteerId:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventId:              { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    eventName:            { type: String, default: "" },
    title:                { type: String, required: true, trim: true },
    description:          { type: String, default: "" },
    instructions:         { type: String, default: "" },
    location:             { type: String, default: "" },
    date:                 { type: String, default: "" },
    time:                 { type: String, default: "" },
    priority:             { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    // Standardized statuses: Pending, In Progress, Completed
    // Preserves backward compatibility with legacy Assigned and Done
    status:               {
      type: String,
      enum: ["Pending", "Assigned", "In Progress", "Completed", "Done", "Missed"],
      default: "Pending",
    },
    // Reuse existing dueAt Date field
    dueAt:                { type: Date },
    completedAt:          { type: Date },
    reportNote:           { type: String, default: "" },
    // Delay / problem reporting by volunteer to Admin
    issueReported:        { type: Boolean, default: false },
    issueDescription:     { type: String, default: "" },
    issueReportedAt:      { type: Date, default: null },
    issueResolved:        { type: Boolean, default: false },
    issueResolutionNote:  { type: String, default: "" },
    assignedBy:           { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Prevent accidental duplicate task creation for the same volunteer and event with the same title
taskSchema.index({ volunteerId: 1, eventId: 1, title: 1 });

module.exports = mongoose.model("Task", taskSchema);
