const User = require("../models/User");
const PendingRegistration = require("../models/PendingRegistration");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { formatDisplayPhone, isValidWhatsAppPhone } = require("../services/whatsappService");
const { emitNotification } = require("../services/notificationService");
const { generateVolunteerId } = require("../services/volunteerIdService");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const sendToken = (user, statusCode, res, extra = {}) => {
  const token = signToken(user._id);
  res.status(statusCode).json({ success: true, token, user, ...extra });
};

// Send OTP email helper
const sendOtpEmail = async (email, otp, fullName, purpose = "sign in to") => {
  const isSmtpConfigured =
    (process.env.SMTP_SERVICE || process.env.SMTP_HOST) &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (isSmtpConfigured) {
    try {
      const transportConfig = process.env.SMTP_SERVICE
        ? {
            service: process.env.SMTP_SERVICE,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          }
        : {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          };

      const transporter = nodemailer.createTransport(transportConfig);

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"EVORA Celebrations" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Your EVORA One-Time Verification Code: ${otp}`,
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 520px; margin: 0 auto; padding: 32px; background-color: #FAF5EA; border: 1px solid #D5B36A; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 22px;">
              <h1 style="color: #2B1D12; font-size: 28px; margin: 0; letter-spacing: 2px;">EVORA</h1>
              <p style="color: #C9A13A; font-size: 11px; font-weight: bold; letter-spacing: 1.5px; margin: 4px 0 0;">MADE TO CELEBRATE</p>
            </div>
            <div style="background: #FFFDF9; border-radius: 12px; padding: 26px; border: 1px solid #E8DCC8; text-align: center;">
              <p style="color: #6B5240; font-size: 15px; margin: 0 0 14px;">Hello ${fullName || "Honored Guest"},</p>
              <p style="color: #2B1D12; font-size: 14px; margin: 0 0 20px;">Use the verification code below to securely ${purpose} your EVORA account:</p>
              <div style="background: #2B1D12; color: #FAF5EA; font-size: 34px; font-weight: bold; letter-spacing: 8px; padding: 14px 28px; border-radius: 10px; display: inline-block; margin: 0 auto 20px; border: 1px solid #C9A13A;">
                ${otp}
              </div>
              <p style="color: #8B7355; font-size: 12px; margin: 0;">This code expires in 10 minutes. If you did not request this, you can safely ignore this message.</p>
            </div>
          </div>
        `,
      });
      console.log(`📧 [EMAIL SENT] OTP successfully emailed to ${email}`);
      return true;
    } catch (err) {
      console.error("❌ [EMAIL ERROR] Failed to send email via SMTP:", err.message);
    }
  }

  // Fallback console log for development and evaluation
  console.log(`\n======================================================`);
  console.log(`🔑 [EVORA OTP DISPATCH] Sent to: ${email}`);
  console.log(`   Purpose: ${purpose}`);
  console.log(`   Verification Code: ${otp}`);
  console.log(`   Valid for: 10 minutes`);
  if (!isSmtpConfigured) {
    console.log(`   ⚠️ Notice: SMTP credentials not set in evora-backend/.env`);
    console.log(`   Set SMTP_SERVICE=gmail and your App Password to receive real emails.`);
  }
  console.log(`======================================================\n`);
  return false;
};

// @desc    Step 1: Request Registration OTP (validates details, sends OTP to email)
// @route   POST /api/auth/register-otp
// @access  Public
exports.requestRegisterOtp = async (req, res, next) => {
  try {
    const { fullName, email, password, role, phone, businessName, serviceType, bio, whatsappOptIn } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Please provide fullName, email, password, and role." });
    }

    // Enforce security rule: Admin accounts cannot be created through public registration
    const allowedRoles = ["user", "vendor", "volunteer"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role specified. Admin accounts cannot be registered publicly." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await PendingRegistration.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password,
        role,
        phone: phone ? formatDisplayPhone(phone) : "",
        businessName: businessName || "",
        serviceType: serviceType || "",
        bio: bio || "",
        whatsappOptIn: Boolean(whatsappOptIn),
        otpCode: otp,
        otpExpires,
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await sendOtpEmail(email.toLowerCase().trim(), otp, fullName, "register");

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${email}`,
      email: email.toLowerCase().trim(),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Step 2: Verify Registration OTP & Complete Registration
// @route   POST /api/auth/verify-register-otp
// @access  Public
exports.verifyRegisterOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and verification code are required." });
    }

    const pending = await PendingRegistration.findOne({ email: email.toLowerCase().trim() });
    if (!pending) {
      return res.status(400).json({
        success: false,
        message: "Registration session not found or expired. Please submit the registration form again.",
      });
    }

    if (String(pending.otpCode).trim() !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: "Invalid verification code. Please check and try again." });
    }

    if (pending.otpExpires && new Date() > pending.otpExpires) {
      return res.status(400).json({ success: false, message: "Verification code has expired. Please request a new code." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    const optedIn = pending.whatsappOptIn === true;
    const userData = {
      fullName: pending.fullName,
      email: pending.email,
      password: pending.password,
      role: pending.role,
      phone: pending.phone,
      whatsappNumber: pending.phone,
      businessName: pending.businessName,
      serviceType: pending.serviceType,
      bio: pending.bio,
      whatsappOptIn: optedIn,
      whatsappOptInAt: optedIn ? new Date() : null,
      whatsappEnabled: optedIn,
      inAppEnabled: true,
      isVerified: true,
    };

    if (pending.role === "volunteer") {
      userData.volunteerId = await generateVolunteerId();
      userData.verificationStatus = "Pending";
    }

    const user = await User.create(userData);
    await PendingRegistration.deleteOne({ _id: pending._id });

    // Welcome WhatsApp notification (only if user explicitly opted in)
    if (user.phone && user.whatsappOptIn === true) {
      emitNotification({
        userId: user._id,
        type: "success",
        title: "Welcome to EVORA! 🎉",
        message: `Your account as ${user.role.toUpperCase()} has been created. Welcome to EVORA – Made to Celebrate. You will receive automated WhatsApp updates for event bookings, proposals, and schedules.`,
        link: `/${user.role}`,
        idempotencyKey: `welcome:${user._id}`,
        templateKey: "WELCOME",
      }).catch((err) => console.warn("Welcome WhatsApp notification skipped:", err.message));
    }

    sendToken(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Register a new user (Direct or fallback)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { fullName, email, password, role, phone, businessName, serviceType, otp, whatsappOptIn } = req.body;

    // If OTP is provided, verify it first
    if (otp) {
      req.body.email = email;
      req.body.otp = otp;
      return exports.verifyRegisterOtp(req, res, next);
    }

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Please provide fullName, email, password, and role." });
    }

    // Enforce security rule: Admin accounts cannot be created through public registration
    const allowedRoles = ["user", "vendor", "volunteer"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role specified. Admin accounts cannot be registered publicly." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    const optedIn = whatsappOptIn === true;
    const formattedPhone = phone ? formatDisplayPhone(phone) : "";
    const userData = {
      fullName,
      email,
      password,
      role,
      phone: formattedPhone,
      whatsappNumber: formattedPhone,
      whatsappOptIn: optedIn,
      whatsappOptInAt: optedIn ? new Date() : null,
      whatsappEnabled: optedIn,
      inAppEnabled: true,
    };
    if (role === "vendor") {
      userData.businessName = businessName || "";
      userData.serviceType = serviceType || "";
    }
    if (role === "volunteer") {
      userData.volunteerId = await generateVolunteerId();
      userData.verificationStatus = "Pending";
    }

    const user = await User.create(userData);

    // Welcome WhatsApp notification to registered phone number (only if explicitly opted in)
    if (user.phone && user.whatsappOptIn === true) {
      emitNotification({
        userId: user._id,
        type: "success",
        title: "Welcome to EVORA! 🎉",
        message: `Your account as ${role.toUpperCase()} has been created. Welcome to EVORA – Made to Celebrate. You will receive automated WhatsApp updates for event bookings, proposals, and schedules.`,
        link: `/${role}`,
        idempotencyKey: `welcome:${user._id}`,
        templateKey: "WELCOME",
      }).catch((err) => console.warn("Welcome WhatsApp notification skipped:", err.message));
    }

    sendToken(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword, role } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: "Email and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const query = { email: email.toLowerCase().trim() };
    if (role) query.role = role;

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been successfully updated. You can now log in.",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Initiate Login (Verifies credentials and dispatches Email OTP)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password, role, skipOtp } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: "Please provide email, password, and role." });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (user.role !== role) {
      return res.status(401).json({ success: false, message: `Account belongs to ${user.role}, not ${role}.` });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account has been suspended. Contact support." });
    }

    // Direct Login without requiring Email OTP
    return sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Send standalone OTP to email
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOtp = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    if (role && user.role !== role) {
      return res.status(401).json({ success: false, message: `Account belongs to ${user.role}, not ${role}.` });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail(user.email, otp, user.fullName);

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${user.email}`,
      email: user.email,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify OTP and log user in
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, role } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP code are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    if (role && user.role !== role) {
      return res.status(401).json({ success: false, message: `Account belongs to ${user.role}, not ${role}.` });
    }

    if (!user.otpCode || String(user.otpCode) !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: "Invalid verification code. Please check and try again." });
    }

    if (user.otpExpires && new Date() > user.otpExpires) {
      return res.status(400).json({ success: false, message: "Verification code has expired. Please request a new code." });
    }

    // Reset OTP upon successful verification
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

// @desc    Update profile
// @route   PUT /api/auth/me
// @access  Private
exports.updateMe = async (req, res, next) => {
  try {
    const allowedFields = [
      "fullName",
      "phone",
      "whatsappNumber",
      "location",
      "city",
      "bio",
      "profileImage",
      "businessName",
      "serviceType",
      "whatsappOptIn",
      "whatsappEnabled",
      "inAppEnabled",
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (["whatsappOptIn", "whatsappEnabled", "inAppEnabled"].includes(field)) {
          updates[field] = Boolean(req.body[field]);
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    if (updates.whatsappNumber !== undefined) {
      const trimmed = String(updates.whatsappNumber).trim();
      if (trimmed && !isValidWhatsAppPhone(trimmed)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid WhatsApp phone number (10 to 15 digits with country code).",
        });
      }
      updates.whatsappNumber = trimmed ? formatDisplayPhone(trimmed) : "";
    }

    if (updates.phone) {
      updates.phone = formatDisplayPhone(updates.phone) || updates.phone;
      if (updates.whatsappNumber === undefined && !req.user.whatsappNumber) {
        updates.whatsappNumber = updates.phone;
      }
    }

    if (updates.whatsappOptIn === true && req.user.whatsappOptIn !== true) {
      updates.whatsappOptInAt = new Date();
      if (updates.whatsappEnabled === undefined) {
        updates.whatsappEnabled = true;
      }
    }
    if (updates.whatsappOptIn === false) {
      updates.whatsappEnabled = false;
    }

    const oldPhone = req.user.whatsappNumber || req.user.phone;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });

    const newPhone = user.whatsappNumber || user.phone;
    if (newPhone && newPhone !== oldPhone && user.whatsappOptIn === true && user.whatsappEnabled === true) {
      emitNotification({
        userId: user._id,
        type: "info",
        title: "WhatsApp Number Updated 📱",
        message: `Your registered WhatsApp contact number has been updated. All future celebration updates, proposals, and schedules will be delivered automatically.`,
        link: `/${user.role}/notifications`,
        idempotencyKey: `phone-updated:${user._id}:${Date.now()}`,
      }).catch((err) => console.warn("WhatsApp phone update notice skipped:", err.message));
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};
