/**
 * EVORA Frontend Validation Engine
 * Indian National Numbering Plan (NNP) Standards:
 * - Mobile: Exactly 10 digits starting with 6, 7, 8, or 9
 * - Landline: Variable-length STD code (2-4 digits) + subscriber number (total 10 digits)
 * - Both domestic '0' and international '+91' normalized cleanly
 */

export const COMMON_WEAK_PASSWORDS = new Set([
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
 */
export function validateIndianPhone(rawPhone, options = { allowLandline: false, requireMobileForWhatsApp: true }) {
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
      error: `Phone number must be exactly 10 digits (currently ${digits.length} ${digits.length === 1 ? "digit" : "digits"}).`,
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
 * Validates Email addresses (RFC 5322)
 */
export function validateEmail(email) {
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
export function checkPasswordSecurity(pwd) {
  if (!pwd || typeof pwd !== "string") {
    return {
      score: 0,
      hasMinLen: false,
      hasUpper: false,
      hasLower: false,
      hasNum: false,
      hasSpecial: false,
      isCommonWeak: false,
      isStrong: false,
      isWeak: false,
      error: "Password is required.",
    };
  }
  const trimmed = pwd.trim();
  const isCommonWeak = COMMON_WEAK_PASSWORDS.has(trimmed.toLowerCase());
  const hasMinLen = trimmed.length >= 8;
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  const hasNum = /[0-9]/.test(trimmed);
  const hasSpecial = /[^A-Za-z0-9]/.test(trimmed);

  let score = 0;
  if (hasMinLen) score++;
  if (hasUpper && hasLower) score++;
  if (hasNum) score++;
  if (hasSpecial) score++;
  if (isCommonWeak) score = 0;

  const isStrong = !isCommonWeak && hasMinLen && hasUpper && hasLower && hasNum && hasSpecial;
  const isWeak = isCommonWeak || (trimmed.length > 0 && score < 3);

  let error = null;
  if (isCommonWeak) {
    error = `"${trimmed}" is too weak and easily guessed. Please choose a strong password.`;
  } else if (!isStrong) {
    error = "Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters (!@#$).";
  }

  return {
    score,
    hasMinLen,
    hasUpper,
    hasLower,
    hasNum,
    hasSpecial,
    isCommonWeak,
    isStrong,
    isWeak,
    error,
  };
}

/**
 * Validates Positive Number
 */
export function validatePositiveNumber(val, fieldName = "Amount") {
  const num = Number(val);
  if (isNaN(num) || num <= 0) {
    return { isValid: false, error: `${fieldName} must be a positive number greater than 0.` };
  }
  return { isValid: true, value: num, error: null };
}
