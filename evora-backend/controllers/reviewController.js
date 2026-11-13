const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const User = require("../models/User");
const { emitNotification } = require("../services/notificationService");

// @desc    Create review for completed booking
// @route   POST /api/reviews
// @access  Private (user)
exports.createReview = async (req, res, next) => {
  try {
    const {
      vendorId,
      bookingId,
      overall,
      serviceQuality,
      punctuality,
      pricing,
      experience,
      comment,
    } = req.body;

    if (!vendorId || !bookingId || overall === undefined || overall === null) {
      return res.status(400).json({ success: false, message: "vendorId, bookingId, and overall rating are required." });
    }

    const ratingNum = Number(overall);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: "Rating must be a whole number between 1 and 5 stars." });
    }

    if (!comment || comment.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Review comment must be at least 3 characters." });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (String(booking.userId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to review this booking" });
    }

    if (booking.status !== "Completed") {
      return res.status(400).json({ success: false, message: "Reviews can only be submitted for Completed bookings" });
    }

    const existing = await Review.findOne({ bookingId });
    if (existing) {
      return res.status(400).json({ success: false, message: "A review has already been submitted for this booking" });
    }

    const review = await Review.create({
      vendorId,
      bookingId,
      eventId: booking.eventId,
      serviceId: booking.serviceId,
      reviewerId: req.user._id,
      reviewerName: req.user.fullName,
      eventName: booking.eventName || "Celebration",
      overall: Number(overall),
      rating: Number(overall),
      serviceQuality: Number(serviceQuality) || 5,
      punctuality: Number(punctuality) || 5,
      pricing: Number(pricing) || 5,
      experience: Number(experience) || 5,
      comment: comment || "",
    });

    // Update Vendor and Service average ratings
    const allReviews = await Review.find({ vendorId });
    const avg = allReviews.reduce((sum, r) => sum + r.overall, 0) / allReviews.length;
    await User.findByIdAndUpdate(vendorId, {
      rating: Math.round(avg * 10) / 10,
      totalReviews: allReviews.length,
    });

    if (booking.serviceId) {
      const serviceReviews = await Review.find({ serviceId: booking.serviceId });
      const sAvg = serviceReviews.reduce((sum, r) => sum + r.overall, 0) / serviceReviews.length;
      await Service.findByIdAndUpdate(booking.serviceId, {
        averageRating: Math.round(sAvg * 10) / 10,
        reviewCount: serviceReviews.length,
      });
    }

    emitNotification({
      userId: vendorId,
      type: "success",
      title: "New Review Received ⭐",
      message: `${req.user.fullName} rated your service ${overall}/5 stars!`,
      link: "/vendor/reviews",
    }).catch((e) => console.warn(e.message));

    res.status(201).json({ success: true, review });
  } catch (err) { next(err); }
};

// @desc    Get reviews for a vendor
// @route   GET /api/reviews?vendorId=xxx
// @access  Private
exports.getReviews = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.vendorId) filter.vendorId = req.query.vendorId;
    else if (req.user.role === "vendor") filter.vendorId = req.user._id;

    const reviews = await Review.find(filter)
      .populate("reviewerId", "fullName email")
      .populate("serviceId", "title category")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (err) { next(err); }
};
