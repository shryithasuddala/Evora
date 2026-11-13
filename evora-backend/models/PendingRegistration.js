const mongoose = require("mongoose");

const pendingRegistrationSchema = new mongoose.Schema(
  {
    fullName:     { type: String, required: true, trim: true },
    email:        { type: String, required: true, lowercase: true, trim: true },
    password:     { type: String, required: true },
    role:         { type: String, enum: ["user", "vendor", "volunteer", "admin"], required: true },
    phone:        { type: String, default: "" },
    businessName: { type: String, default: "" },
    serviceType:  { type: String, default: "" },
    bio:          { type: String, default: "" },
    whatsappOptIn:{ type: Boolean, default: false },
    otpCode:      { type: String, required: true },
    otpExpires:   { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-expire documents after 15 minutes (TTL index)
pendingRegistrationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

module.exports = mongoose.model("PendingRegistration", pendingRegistrationSchema);
