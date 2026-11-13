const CharityDonation = require("../models/CharityDonation");
const User = require("../models/User");
const { emitNotification } = require("../services/notificationService");

// @desc    List surplus food for charity pickup
// @route   POST /api/charity/donations
// @access  Private (user/organizer)
exports.createDonation = async (req, res, next) => {
  try {
    const { eventId, eventName, foodType, quantityMeals, pickupAddress, pickupTime, contactPhone, dietType, notes } = req.body;

    if (!foodType || !quantityMeals || !pickupAddress) {
      return res.status(400).json({ success: false, message: "Food type, quantity, and pickup address are required." });
    }

    const donation = await CharityDonation.create({
      organizerId: req.user._id,
      eventId,
      eventName: eventName || "Celebration Feast",
      foodType,
      quantityMeals: Number(quantityMeals),
      pickupAddress,
      pickupTime: pickupTime || "Within 2 hours",
      contactPhone: contactPhone || req.user.phone || "",
      dietType: dietType || "Vegetarian",
      notes: notes || "",
    });

    // Notify volunteers about surplus food ready for pickup via unified in-app & automated WhatsApp
    const volunteers = await User.find({ role: "volunteer", isActive: true }).select("_id");
    await Promise.all(
      volunteers.map((vol) =>
        emitNotification({
          userId: vol._id,
          type: "alert",
          title: "Surplus Food Rescue Alert 🍲",
          message: `${quantityMeals} fresh meals available from "${eventName || "event"}" at ${pickupAddress}. Help transport to community shelters.`,
          link: "/volunteer/schedule",
          idempotencyKey: `charity-donation:${donation._id}:vol:${vol._id}`,
          eventId: eventId || null,
          eventName: eventName || "",
        }).catch(() => {})
      )
    );

    res.status(201).json({ success: true, donation });
  } catch (err) {
    next(err);
  }
};

// @desc    Get donations
// @route   GET /api/charity/donations
// @access  Private
exports.getDonations = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === "user") {
      filter.organizerId = req.user._id;
    }
    // volunteers and admin can view all available listings

    const donations = await CharityDonation.find(filter)
      .populate("organizerId", "fullName email phone")
      .populate("volunteerId", "fullName email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: donations.length, donations });
  } catch (err) {
    next(err);
  }
};

// @desc    Update donation status (e.g. Volunteer claims pickup or marks delivered)
// @route   PUT /api/charity/donations/:id/status
// @access  Private
exports.updateDonationStatus = async (req, res, next) => {
  try {
    const { status, shelterName } = req.body;
    const donation = await CharityDonation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: "Donation not found." });

    if (status) donation.status = status;
    if (shelterName) donation.shelterName = shelterName;
    if (req.user.role === "volunteer" && !donation.volunteerId) {
      donation.volunteerId = req.user._id;
    }

    await donation.save();
    res.status(200).json({ success: true, donation });
  } catch (err) {
    next(err);
  }
};
