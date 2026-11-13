const VendorAvailability = require("../models/VendorAvailability");
const Booking = require("../models/Booking");

// @desc    Get vendor availability (public to logged-in users)
// @route   GET /api/availability/:vendorId
// @access  Private
exports.getVendorAvailability = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    let record = await VendorAvailability.findOne({ vendorId });
    if (!record) {
      record = { vendorId, blockedDates: [], capacityPerDay: 1, notes: "" };
    }

    // Find confirmed & accepted bookings for this vendor
    const activeBookings = await Booking.find({
      vendorId,
      status: { $in: ["Accepted", "Confirmed"] },
    }).select("eventDate eventName status");

    // Group bookings count by date
    const bookingCounts = {};
    activeBookings.forEach((b) => {
      if (b.eventDate) {
        bookingCounts[b.eventDate] = (bookingCounts[b.eventDate] || 0) + 1;
      }
    });

    const capacity = record.capacityPerDay || 1;
    const bookedDates = Object.keys(bookingCounts).filter((date) => bookingCounts[date] >= capacity);

    res.status(200).json({
      success: true,
      availability: {
        vendorId,
        blockedDates: record.blockedDates || [],
        capacityPerDay: capacity,
        bookedDates,
        bookingCounts,
        notes: record.notes || "",
      },
    });
  } catch (err) { next(err); }
};

// @desc    Update my availability (vendor only)
// @route   PUT /api/availability/me
// @access  Private (vendor)
exports.updateMyAvailability = async (req, res, next) => {
  try {
    if (req.user.role !== "vendor" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only vendors can update availability." });
    }

    const { blockedDates = [], capacityPerDay = 1, notes = "" } = req.body;

    // Check if vendor tries to unblock a date that already has confirmed bookings
    const activeBookings = await Booking.find({
      vendorId: req.user._id,
      status: { $in: ["Accepted", "Confirmed"] },
    }).select("eventDate");

    const capacity = Math.max(1, Number(capacityPerDay) || 1);

    const updated = await VendorAvailability.findOneAndUpdate(
      { vendorId: req.user._id },
      {
        vendorId: req.user._id,
        blockedDates: Array.isArray(blockedDates) ? blockedDates : [],
        capacityPerDay: capacity,
        notes,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, availability: updated });
  } catch (err) { next(err); }
};
