const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Proposal = require("../models/Proposal");
const Expense = require("../models/Expense");
const paymentGateway = require("../services/paymentGateway");
const { emitNotification } = require("../services/notificationService");
const { sendEventBookingWhatsApp } = require("../services/whatsappService");

// @desc    Process payment for an accepted booking
// @route   POST /api/payments
// @access  Private (organizer)
exports.createPayment = async (req, res, next) => {
  try {
    const { bookingId, mode = "advance50", method = "UPI" } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required." });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    if (String(booking.organizerId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (booking.status !== "Accepted" && booking.status !== "Confirmed" && mode !== "express") {
      return res.status(400).json({
        success: false,
        message: `Cannot pay for booking with status "${booking.status}". Proposal must be Accepted first.`,
      });
    }

    // Get proposal or service price
    const proposal = await Proposal.findOne({ bookingId: booking._id });
    const totalAmount = proposal?.servicePrice || booking.totalPrice || 25000;

    let amountPaid = totalAmount;
    let balance = 0;
    let paymentStatus = "Paid";

    if (mode === "advance50") {
      amountPaid = Math.round(totalAmount * 0.5);
      balance = totalAmount - amountPaid;
      paymentStatus = "Partially Paid";
    }

    // Process through gateway
    const gatewayResult = await paymentGateway.processPayment({
      amount: amountPaid,
      mode,
      metadata: { bookingId: booking._id, organizerId: req.user._id, vendorId: booking.vendorId },
    });

    const payment = await Payment.create({
      bookingId: booking._id,
      eventId: booking.eventId,
      payerId: req.user._id,
      vendorId: booking.vendorId,
      mode,
      totalAmount,
      amountPaid,
      balance,
      status: paymentStatus,
      method,
      transactionRef: gatewayResult.transactionRef,
      paidAt: new Date(),
    });

    const wasAlreadyConfirmed = booking.status === "Confirmed";

    // Update booking status to Confirmed
    booking.status = "Confirmed";
    booking.paidAmount = (booking.paidAmount || 0) + amountPaid;
    booking.totalPrice = totalAmount;
    booking.paymentStatus = paymentStatus;
    booking.paymentRef = payment._id;
    await booking.save();

    // Automatically synchronize with event expense tracker
    await Expense.create({
      eventId: booking.eventId,
      title: `${mode === "advance50" ? "50% Advance" : "Full Payment"}: ${booking.serviceName || "Vendor"}`,
      category: booking.serviceName || "Vendor Service",
      amount: amountPaid,
      status: "Paid",
      paymentMethod: method,
      notes: `Transaction Ref: ${gatewayResult.transactionRef}`,
    }).catch((err) => console.warn("Expense creation skipped:", err.message));

    // Notify vendor
    emitNotification({
      userId: booking.vendorId,
      type: "success",
      title: "Booking Confirmed & Payment Received! 💰",
      message: `${req.user.fullName} completed ${mode === "advance50" ? "50% advance payment" : "full payment"} of ₹${amountPaid.toLocaleString("en-IN")} for "${booking.eventName}". Date is locked!`,
      link: "/vendor/bookings",
      idempotencyKey: `payment:${payment._id}:vendor:${booking.vendorId}`,
      bookingId: booking._id,
      eventId: booking.eventId,
      eventName: booking.eventName,
    }).catch(() => {});

    // Notify organizer (suppress WhatsApp here if sendEventBookingWhatsApp fires below)
    emitNotification({
      userId: req.user._id,
      type: "success",
      title: "Celebration Booking Confirmed ✅",
      message: `Payment of ₹${amountPaid.toLocaleString("en-IN")} processed. Booking with ${booking.serviceName} is confirmed and synced with your event budget.`,
      link: "/user/bookings",
      idempotencyKey: `payment:${payment._id}:user:${req.user._id}`,
      bookingId: booking._id,
      eventId: booking.eventId,
      eventName: booking.eventName,
      sendWhatsApp: wasAlreadyConfirmed,
    }).catch(() => {});

    // Trigger dynamic WhatsApp booking confirmation if genuinely transitioning to Confirmed
    if (!wasAlreadyConfirmed) {
      sendEventBookingWhatsApp(booking._id).catch((err) =>
        console.warn(`[WhatsApp booking confirmation skipped]: ${err.message}`)
      );
    }

    res.status(201).json({ success: true, payment, booking });
  } catch (err) { next(err); }
};

// @desc    Get payments (role-filtered)
// @route   GET /api/payments
// @access  Private
exports.getPayments = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === "user") filter.payerId = req.user._id;
    else if (req.user.role === "vendor") filter.vendorId = req.user._id;

    const payments = await Payment.find(filter)
      .populate("bookingId", "eventName serviceName eventDate")
      .populate("payerId", "fullName email")
      .populate("vendorId", "fullName businessName phone")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: payments.length, payments });
  } catch (err) { next(err); }
};

// @desc    Get payment for specific booking
// @route   GET /api/payments/booking/:id
// @access  Private
exports.getPaymentByBooking = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ bookingId: req.params.id })
      .populate("payerId", "fullName email")
      .populate("vendorId", "fullName businessName phone");

    res.status(200).json({ success: true, payment });
  } catch (err) { next(err); }
};

// @desc    Pay remaining balance
// @route   POST /api/payments/:id/pay-balance
// @access  Private (organizer)
exports.payBalance = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: "Payment record not found." });

    if (String(payment.payerId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (payment.balance <= 0) {
      return res.status(400).json({ success: false, message: "This booking has no pending balance." });
    }

    const balanceAmount = payment.balance;
    const gatewayResult = await paymentGateway.processPayment({
      amount: balanceAmount,
      mode: "balance",
      metadata: { paymentId: payment._id, bookingId: payment.bookingId },
    });

    payment.amountPaid += balanceAmount;
    payment.balance = 0;
    payment.status = "Paid";
    await payment.save();

    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      booking.paidAmount += balanceAmount;
      booking.paymentStatus = "Paid";
      await booking.save();

      // Log second expense
      await Expense.create({
        eventId: booking.eventId,
        title: `Final Settlement Balance: ${booking.serviceName || "Vendor"}`,
        category: booking.serviceName || "Vendor Service",
        amount: balanceAmount,
        status: "Paid",
        paymentMethod: "UPI / NetBanking Demo",
        notes: `Balance Cleared Ref: ${gatewayResult.transactionRef}`,
      }).catch((err) => console.warn(err.message));

      emitNotification({
        userId: booking.vendorId,
        type: "success",
        title: "Remaining Balance Cleared! 🎉",
        message: `${req.user.fullName} cleared the balance payment of ₹${balanceAmount.toLocaleString("en-IN")} for "${booking.eventName}". Full payment received.`,
        link: "/vendor/earnings",
      });
    }

    res.status(200).json({ success: true, payment, message: "Balance payment completed successfully." });
  } catch (err) { next(err); }
};


// @desc    Admin: Get all payments on the platform
// @route   GET /api/payments/admin
// @access  Private (admin)
exports.getAdminPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate("userId", "fullName email phone role")
      .populate("bookingId")
      .sort({ createdAt: -1 });

    const totalVolume = payments.reduce((sum, p) => sum + (p.status === "Success" ? p.amount : 0), 0);
    const platformFees = Math.round(totalVolume * 0.05);

    res.status(200).json({
      success: true,
      count: payments.length,
      totalVolume,
      platformFees,
      payments,
    });
  } catch (err) { next(err); }
};
