const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type:           { type: String, default: "info" }, // info | success | warning | alert | whatsapp
    channel:        { type: String, enum: ["in-app", "whatsapp", "both"], default: "in-app" },
    phone:          { type: String, default: "" }, // Masked phone for display
    maskedPhone:    { type: String, default: "" },
    title:          { type: String, required: true },
    message:        { type: String, default: "" },
    deliveryStatus: {
      type: String,
      enum: ["Not Applicable", "Queued", "Sent", "Delivered", "Read", "Failed", "Skipped", "Simulated (Demo)"],
      default: "Not Applicable",
    },
    isRead:         { type: Boolean, default: false },
    link:           { type: String, default: "" },

    // Idempotency & Provider Tracking
    idempotencyKey:    { type: String, default: undefined },
    provider:          { type: String, enum: ["none", "demo", "twilio", "meta"], default: "none" },
    providerMessageId: { type: String, default: "" },
    failureReason:     { type: String, default: "" },
    errorCode:         { type: String, default: "" },
    attempts:          { type: Number, default: 0 },
    sentAt:            { type: Date, default: null },
    deliveredAt:       { type: Date, default: null },
    readAt:            { type: Date, default: null },

    // Dynamic WhatsApp Booking/Event Metadata
    bookingId:      { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    eventId:        { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    customerName:   { type: String, default: "" },
    customerPhone:  { type: String, default: "" }, // Masked phone for display
    eventName:      { type: String, default: "" },
    bookingRef:     { type: String, default: "" },
    mode:           { type: String, enum: ["demo", "live"], default: "demo" },
    twilioSid:      { type: String, default: "" },
    twilioStatus:   { type: String, default: "" },
  },
  { timestamps: true }
);

notificationSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
notificationSchema.index({ providerMessageId: 1 }, { sparse: true });
notificationSchema.index({ twilioSid: 1 }, { sparse: true });

module.exports = mongoose.model("Notification", notificationSchema);
