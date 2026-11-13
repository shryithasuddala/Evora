const mongoose = require("mongoose");

const notificationJobSchema = new mongoose.Schema(
  {
    idempotencyKey: { type: String, required: true, unique: true },
    notificationId: { type: mongoose.Schema.Types.ObjectId, ref: "Notification", required: true },
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    toPhone:        { type: String, required: true }, // Clean E.164 digits, backend-only
    maskedPhone:    { type: String, default: "" },
    recipientName:  { type: String, default: "" },
    title:          { type: String, default: "" },
    body:           { type: String, required: true },
    templateKey:    { type: String, default: "" },
    templateVars:   { type: mongoose.Schema.Types.Mixed, default: {} },
    bookingId:      { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    eventId:        { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "skipped"],
      default: "pending",
    },
    attempts:          { type: Number, default: 0 },
    maxAttempts:       { type: Number, default: 3 },
    nextAttemptAt:     { type: Date, default: Date.now },
    lockedAt:          { type: Date, default: null },
    lastError:         { type: String, default: "" },
    lastErrorCode:     { type: String, default: "" },
    provider:          { type: String, default: "twilio" },
    providerMessageId: { type: String, default: "" },
    deliveryStatus:    { type: String, default: "Queued" },
    twilioStatus:      { type: String, default: "" },
    deliveredAt:       { type: Date, default: null },
    readAt:            { type: Date, default: null },
  },
  { timestamps: true }
);

notificationJobSchema.index({ status: 1, nextAttemptAt: 1 });

module.exports = mongoose.model("NotificationJob", notificationJobSchema);
