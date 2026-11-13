/**
 * EVORA Enterprise Validation Engine
 * Implements strict Indian National Numbering Plan (NNP) rules:
 * - Mobile: Flat 10 digits starting with 6, 7, 8, or 9
 * - Landline: Variable-length STD code (2-4 digits) + subscriber number (total 10 digits)
 * - Both domestic '0' and international '+91' normalized cleanly
 */

const COMMON_WEAK_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "password",
  "password123",
  "admin123",
  "qwerty",
  "111111",
  "000000",
  "letmein",
  "welcome",
  "iloveyou",
]);

/**
 * Validates Indian Phone Numbers (Mobile & Landline)
 * Domestic 0 and international +91 are cleanly stripped to extract the 10 core national digits.
 */
function validateIndianPhone(rawPhone, options = { allowLandline: false, requireMobileForWhatsApp: true }) {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      isValid: false,
      digits: "",
      type: "invalid",
      error: "Phone number is required.",
    };
  }

  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, "");

  // Handle +91 or 91 country code (12 digits -> 10 digits)
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  // Handle domestic trunk prefix '0' (11 digits -> 10 digits)
  else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Exact 10 digits check
  if (digits.length !== 10) {
    return {
      isValid: false,
      digits,
      type: "invalid",
      error: `Phone number must be exactly 10 digits (you entered ${digits.length} ${digits.length === 1 ? "digit" : "digits"}).`,
    };
  }

  // Check if Mobile (starts with 6, 7, 8, or 9)
  const isMobile = /^[6-9]\d{9}$/.test(digits);

  // Check if Landline (STD code starts with 1-5, followed by subscriber number, 10 digits total)
  const isLandline = /^[1-5]\d{9}$/.test(digits);

  if (isMobile) {
    return {
      isValid: true,
      digits,
      type: "mobile",
      display: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      international: `+91${digits}`,
      error: null,
    };
  }

  if (options.allowLandline && isLandline) {
    if (options.requireMobileForWhatsApp) {
      return {
        isValid: false,
        digits,
        type: "landline",
        error: "Landline numbers cannot receive WhatsApp notifications. Please provide a 10-digit mobile number starting with 6, 7, 8, or 9.",
      };
    }
    return {
      isValid: true,
      digits,
      type: "landline",
      display: `+91 ${digits}`,
      international: `+91${digits}`,
      error: null,
    };
  }

  return {
    isValid: false,
    digits,
    type: "invalid",
    error: "Mobile numbers must start with 6, 7, 8, or 9. Numbers starting with '1' to '5' are landlines or invalid.",
  };
}

/**
 * Validates Email addresses (RFC 5322 compatible)
 */
function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { isValid: false, error: "Email address is required." };
  }
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: "Please enter a valid email address (e.g. name@example.com)." };
  }
  return { isValid: true, email: trimmed, error: null };
}

/**
 * Validates Strong Passwords & flags weak ones
 */
function validatePassword(pwd) {
  if (!pwd || typeof pwd !== "string") {
    return { isValid: false, error: "Password is required." };
  }
  const trimmed = pwd.trim();
  if (COMMON_WEAK_PASSWORDS.has(trimmed.toLowerCase())) {
    return {
      isValid: false,
      isWeak: true,
      error: `"${trimmed}" is too weak and easily guessed. Please choose a strong password.`,
    };
  }
  if (trimmed.length < 8) {
    return { isValid: false, isWeak: true, error: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(trimmed)) {
    return { isValid: false, isWeak: true, error: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!/[a-z]/.test(trimmed)) {
    return { isValid: false, isWeak: true, error: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!/[0-9]/.test(trimmed)) {
    return { isValid: false, isWeak: true, error: "Password must contain at least one number (0-9)." };
  }
  if (!/[^A-Za-z0-9]/.test(trimmed)) {
    return { isValid: false, isWeak: true, error: "Password must contain at least one special character (!@#$%^&*)." };
  }
  return { isValid: true, isWeak: false, error: null };
}

/**
 * Validates Event Data
 */
function validateEventInput(data) {
  const errors = [];
  if (!data.title || data.title.trim().length < 3) {
    errors.push("Event title must be at least 3 characters.");
  }
  if (!data.date) {
    errors.push("Event date is required.");
  } else {
    const eventDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(eventDate.getTime())) {
      errors.push("Event date is invalid.");
    } else if (eventDate < today) {
      errors.push("Event date cannot be in the past.");
    }
  }
  if (data.guestCount !== undefined && data.guestCount !== null && data.guestCount !== "") {
    const guests = Number(data.guestCount);
    if (isNaN(guests) || guests < 0 || !Number.isInteger(guests)) {
      errors.push("Guest count must be a non-negative whole number.");
    }
  }
  if (data.totalBudget !== undefined && data.totalBudget !== null && data.totalBudget !== "") {
    const budget = Number(data.totalBudget);
    if (isNaN(budget) || budget < 0) {
      errors.push("Budget must be a non-negative number.");
    }
  }
  return { isValid: errors.length === 0, errors };
}

/**
 * Validates Monetary Amounts
 */
function validatePositiveAmount(amount, fieldName = "Amount") {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return { isValid: false, error: `${fieldName} must be a positive number greater than 0.` };
  }
  return { isValid: true, value: num, error: null };
}

module.exports = {
  validateIndianPhone,
  validateEmail,
  validatePassword,
  validateEventInput,
  validatePositiveAmount,
};
