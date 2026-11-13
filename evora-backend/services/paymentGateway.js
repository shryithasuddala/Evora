const crypto = require("crypto");

/**
 * EVORA Payment Gateway Engine (Modular Demo Gateway)
 * Implements standard provider contracts for easy plug-and-play with Razorpay / Stripe
 */
class DemoPaymentGateway {
  async processPayment({ amount, mode, currency = "INR", metadata = {} }) {
    // Generate deterministic transaction reference
    const prefix = mode === "express" ? "EXP" : mode === "advance50" ? "ADV" : "PAY";
    const transactionRef = `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Simulate gateway verification
    return {
      success: true,
      transactionRef,
      gateway: "EVORA Instant Settlement Gateway (Demo)",
      amount,
      currency,
      timestamp: new Date().toISOString(),
      metadata,
    };
  }

  async processRefund({ transactionRef, amount, reason = "" }) {
    const refundRef = `REF-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    return {
      success: true,
      refundRef,
      originalRef: transactionRef,
      refundAmount: amount,
      reason,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new DemoPaymentGateway();
