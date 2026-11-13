const mongoose = require("mongoose");
const { EVENT_STATUSES, PLAN_STATUSES, SERVICE_STATUSES } = require("../config/constants");

const requestedServiceSchema = new mongoose.Schema(
  {
    category:             { type: String, required: true },
    specificRequirements: { type: String, default: "" },
    targetBudget:         { type: Number, default: 0 },
    status: {
      type: String,
      enum: SERVICE_STATUSES,
      default: "Requested",
    },
    assignedVendorId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedVendorName:   { type: String, default: "" },
    agreedPrice:          { type: Number, default: 0 },
    assignmentNotes:      { type: String, default: "" },
    activeBookingId:      { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    declineReason:        { type: String, default: "" },
    userDecision: {
      type: String,
      enum: ["None", "Proceed Without", "Search Alternative", "Cancel Service"],
      default: "None",
    },
  },
  { _id: true, timestamps: true }
);

const eventSchema = new mongoose.Schema(
  {
    organizerId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title:             { type: String, required: true, trim: true },
    category:          { type: String, required: true },
    date:              { type: String, required: true },
    time:              { type: String, default: "" },
    location:          { type: String, default: "" },
    venue:             { type: String, default: "" },
    guestCount:        { type: Number, default: 0 },
    confirmedGuests:   { type: Number, default: 0 },
    totalBudget:       { type: Number, default: 0 },
    description:       { type: String, default: "" },
    theme:             { type: String, default: "" },
    status:            { type: String, enum: EVENT_STATUSES, default: "Submitted" },
    planStatus:        { type: String, enum: PLAN_STATUSES, default: "Draft" },
    approvedAt:        { type: Date, default: null },
    approvedBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    whatsappNotificationStatus: { type: String, enum: ["not_sent", "sent", "simulated", "failed"], default: "not_sent" },

    // Dynamic type-specific fields (Wedding: bride/groom, Corporate: meetingPurpose, etc.)
    details:           { type: mongoose.Schema.Types.Mixed, default: {} },

    // Specific vendor preferences
    preferences: {
      decoration:      { type: String, default: "" },
      catering:        { type: String, default: "" },
      photography:     { type: String, default: "" },
      entertainment:   { type: String, default: "" },
      additional:      { type: String, default: "" },
    },

    // Structured service-wise tracking
    requestedServices: [requestedServiceSchema],

    // Required celebration features selected by host (Catering, Venue, Photography, Decoration, Music & Sound, Makeup & Styling)
    requiredServices:  [{ type: String, default: "Catering" }],

    // Admin vendor allocations and acceptance tracking per feature
    allocatedVendors: [
      {
        category:    { type: String, required: true },
        vendorId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        vendorName:  { type: String, default: "" },
        status:      { type: String, enum: ["None", "Requested", "Accepted", "Declined", "Assigned", "Unavailable"], default: "None" },
        bookingId:   { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
        assignedAt:  { type: Date, default: null },
        note:        { type: String, default: "" },
      },
    ],

    // Partial approval / Feature update communication
    adminNoteToHost:       { type: String, default: "" },
    featureExclusions:     [{ type: String }],
    partialApprovalStatus: { type: String, enum: ["None", "Partial", "Full"], default: "None" },

    // Selected Services & Cost calculation
    selectedServices: [
      {
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
        name:       { type: String, default: "" },
        category:   { type: String, default: "" },
        price:      { type: Number, default: 0 },
        quantity:   { type: Number, default: 1 },
      },
    ],
    estimatedTotal:    { type: Number, default: 0 },

    // Volunteer operations
    volunteersNeeded:  { type: Number, default: 0 },
    volunteerRoles:    [{ type: String }],
    assignedVolunteers: [
      {
        volunteerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role:         { type: String, default: "Event Operations" },
        instructions: { type: String, default: "" },
        assignedAt:   { type: Date, default: Date.now },
        status:       { type: String, enum: ["Assigned", "Active", "Completed", "Withdrawn"], default: "Assigned" },
      },
    ],

    // Schedule / Timeline
    schedule: [
      {
        time:      { type: String, default: "" },
        activity:  { type: String, default: "" },
        owner:     { type: String, default: "" },
        notes:     { type: String, default: "" },
      },
    ],

    // Checklist items
    checklist: [
      {
        title:     { type: String, required: true },
        category:  { type: String, default: "General" },
        status:    { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
        owner:     { type: String, default: "Organizer" },
        dueDate:   { type: String, default: "" },
      },
    ],

    // Post event feedback & analysis
    feedback:          { type: mongoose.Schema.Types.Mixed, default: null },
    postEventReport:   { type: mongoose.Schema.Types.Mixed, default: null },
    sustainabilityReport: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Helper method to recalculate overall event status from requested services
eventSchema.methods.recalculateStatus = function () {
  if (this.status === "Cancelled" || this.status === "Completed") {
    return this.status;
  }
  const services = this.requestedServices || [];
  if (services.length === 0) {
    return this.status || "Submitted";
  }
  const activeServices = services.filter((s) => s.status !== "Cancelled by User");
  if (activeServices.length === 0) {
    this.status = "Cancelled";
    return this.status;
  }
  const allConfirmed = activeServices.every((s) => s.status === "Confirmed");
  if (allConfirmed) {
    this.status = "Confirmed";
    return this.status;
  }
  const anyConfirmed = activeServices.some((s) => s.status === "Confirmed");
  if (anyConfirmed) {
    this.status = "Partially Confirmed";
    return this.status;
  }
  const anyCoordination = activeServices.some((s) =>
    [
      "Vendor Search in Progress",
      "Awaiting Vendor Response",
      "Accepted by Vendor",
      "Alternative Search Requested",
      "Unavailable",
    ].includes(s.status)
  );
  if (anyCoordination) {
    this.status = "Coordination in Progress";
    return this.status;
  }
  this.status = "Submitted";
  return this.status;
};

module.exports = mongoose.model("Event", eventSchema);
