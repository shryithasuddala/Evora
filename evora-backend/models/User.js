const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName:     { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:     { type: String, required: true, minlength: 6 },
    role:         { type: String, enum: ["user", "vendor", "volunteer", "admin"], required: true },
    phone:        { type: String, default: "" },
    location:     { type: String, default: "" },
    bio:          { type: String, default: "" },
    profileImage: { type: String, default: "" },

    // Vendor-specific
    businessName: { type: String, default: "" },
    serviceType:  { type: String, default: "" },

    // Volunteer-specific
    volunteerId:        { type: String, unique: true, sparse: true },
    city:               { type: String, default: "" },
    skills:             [{ type: String }],
    experience:         { type: String, default: "" },
    availability:       { type: String, default: "" },
    idProof: {
      fileUrl:          { type: String, default: "" },
      fileType:         { type: String, default: "" },
      fileName:         { type: String, default: "" },
      uploadedAt:       { type: Date },
    },
    verificationStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    rejectionReason:    { type: String, default: "" },

    // Platform flags & Notification Preferences
    isActive:        { type: Boolean, default: true },
    isVerified:      { type: Boolean, default: false },
    whatsappOptIn:   { type: Boolean, default: false },
    whatsappOptInAt: { type: Date, default: null },
    whatsappEnabled: { type: Boolean, default: false },
    whatsappNumber:  { type: String, default: "" },
    inAppEnabled:    { type: Boolean, default: true },

    // Email OTP authentication
    otpCode:      { type: String, default: null },
    otpExpires:   { type: Date, default: null },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Never return password in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
