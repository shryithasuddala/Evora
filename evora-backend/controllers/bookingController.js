const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Proposal = require("../models/Proposal");
const VendorAvailability = require("../models/VendorAvailability");
const { sendEventBookingWhatsApp } = require("../services/whatsappService");
const { emitNotification, notifyAdmins } = require("../services/notificationService");

// @desc    Create a new booking request
// @route   POST /api/bookings
// @access  Private (user/organizer)
exports.createBooking = async (req, res, next) => {
  try {
    const { vendorId, serviceId, eventId, eventName, serviceName, items, eventDate, eventVenue, guestCount, notes } = req.body;

    if (!vendorId || !eventId) {
      return res.status(400).json({ success: false, message: "vendorId and eventId are required." });
    }

    // SERVER-SIDE AVAILABILITY CHECK
    if (eventDate) {
      const avail = await VendorAvailability.findOne({ vendorId });
      if (avail) {
        if (avail.blockedDates && avail.blockedDates.includes(eventDate)) {
          return res.status(400).json({
            success: false,
            message: `The artisan has blocked new bookings on ${eventDate}. Please choose another date or artisan.`,
          });
        }
        const activeBookingsOnDate = await Booking.countDocuments({
          vendorId,
          eventDate,
          status: { $in: ["Accepted", "Confirmed"] },
        });
        if (activeBookingsOnDate >= (avail.capacityPerDay || 1)) {
          return res.status(400).json({
            success: false,
            message: `Artisan is already fully booked at capacity (${avail.capacityPerDay} event/day) on ${eventDate}.`,
          });
        }
      }
    }

    const booking = await Booking.create({
      organizerId: req.user._id,
      organizer: req.user.fullName,
      vendorId,
      eventId,
      serviceId,
      eventName: eventName || "",
      serviceName: serviceName || "",
      items: Array.isArray(items) ? items : [],
      eventDate: eventDate || "",
      eventVenue: eventVenue || "",
      guestCount: Number(guestCount) || 0,
      notes: notes || "",
    });

    // Notify vendor (in-app + automated WhatsApp if opted-in)
    emitNotification({
      userId: vendorId,
      type: "alert",
      title: "New Service Request Received 🔔",
      message: `${req.user.fullName} requested your services for "${eventName || "Special Event"}" on ${eventDate || "upcoming date"}.`,
      link: "/vendor/requests",
      idempotencyKey: `booking-created:${booking._id}:vendor:${vendorId}`,
      bookingId: booking._id,
      eventId,
      eventName: eventName || "",
      templateKey: "VENDOR_NEW_REQUEST",
    }).catch(() => {});

    // Notify organizer (in-app + automated WhatsApp if opted-in)
    emitNotification({
      userId: req.user._id,
      type: "info",
      title: "Booking Request Dispatched ✨",
      message: `Your booking request for "${serviceName || "vendor services"}" has been transmitted to the vendor. You will receive updates automatically!`,
      link: "/user/bookings",
      idempotencyKey: `booking-created:${booking._id}:organizer:${req.user._id}`,
      bookingId: booking._id,
      eventId,
      eventName: eventName || "",
      templateKey: "USER_BOOKING_SENT",
    }).catch(() => {});

    res.status(201).json({ success: true, booking });
  } catch (err) { next(err); }
};

// @desc    Get bookings (scoped by role)
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === "user") {
      filter.organizerId = req.user._id;
    } else if (req.user.role === "vendor") {
      filter.vendorId = req.user._id;
    }

    if (req.query.eventId) filter.eventId = req.query.eventId;
    if (req.query.status) filter.status = req.query.status;

    const bookings = await Booking.find(filter)
      .populate("organizerId", "fullName email phone")
      .populate("vendorId", "fullName businessName serviceType phone")
      .populate("serviceId")
      .populate("eventId", "title date time venue")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (err) { next(err); }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("organizerId", "fullName email phone")
      .populate("vendorId", "fullName businessName serviceType phone")
      .populate("serviceId")
      .populate("eventId");

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

    const isAuthorized =
      req.user.role === "admin" ||
      String(booking.organizerId._id) === String(req.user._id) ||
      String(booking.vendorId._id) === String(req.user._id);

    if (!isAuthorized) return res.status(403).json({ success: false, message: "Access denied." });

    res.status(200).json({ success: true, booking });
  } catch (err) { next(err); }
};

// @desc    Update booking status (Accept / Reject / Cancel / Complete)
// @route   PUT /api/bookings/:id/status
// @access  Private
exports.updateStatus = async (req, res, next) => {
  try {
    let { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "Status is required." });

    // Normalize Declined -> Rejected
    if (status === "Declined") status = "Rejected";

    const allowed = ["Pending", "Proposal Sent", "Accepted", "Rejected", "Declined", "Confirmed", "Completed", "Cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

    const isVendor = String(booking.vendorId) === String(req.user._id);
    const isOrganizer = String(booking.organizerId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isVendor && !isOrganizer && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Availability capacity check on Accept
    if (status === "Accepted" || status === "Confirmed") {
      if (booking.eventDate) {
        const avail = await VendorAvailability.findOne({ vendorId: booking.vendorId });
        if (avail) {
          if (avail.blockedDates && avail.blockedDates.includes(booking.eventDate)) {
            return res.status(400).json({
              success: false,
              message: `Cannot accept booking. Date ${booking.eventDate} is marked as blocked on your availability calendar.`,
            });
          }
          const activeCount = await Booking.countDocuments({
            vendorId: booking.vendorId,
            eventDate: booking.eventDate,
            status: { $in: ["Accepted", "Confirmed"] },
            _id: { $ne: booking._id },
          });
          if (activeCount >= (avail.capacityPerDay || 1)) {
            return res.status(400).json({
              success: false,
              message: `Daily capacity limit (${avail.capacityPerDay} event/day) reached for ${booking.eventDate}. Cannot accept further bookings.`,
            });
          }
        }
      }
    }

    const previousStatus = booking.status;
    booking.status = status;

    // Apply 20% non-refundable cancellation policy if cancelling
    if (status === "Cancelled") {
      const { reason = "" } = req.body;
      const paid = Number(booking.paidAmount || 0);
      let fee = 0;
      let refund = 0;
      if (paid > 0) {
        fee = Math.round(paid * 0.20); // 20% non-refundable fee
        refund = paid - fee;          // 80% refund
        booking.paymentStatus = "Refunded";
        booking.cancellationFee = fee;
        booking.refundAmount = refund;
      }
      booking.cancellationReason = reason || "Cancelled by host";
    }

    await booking.save();

    // Trigger WhatsApp confirmation only if genuinely transitioning from non-confirmed to Confirmed
    if (status === "Confirmed" && previousStatus !== "Confirmed") {
      sendEventBookingWhatsApp(booking._id).catch((err) =>
        console.warn(`[WhatsApp booking confirmation skipped]: ${err.message}`)
      );
    }

    // Synchronize vendor response with Event allocatedVendors and requestedServices
    if (isVendor && booking.eventId) {
      try {
        const Event = require("../models/Event");
        const User = require("../models/User");
        const event = await Event.findById(booking.eventId);
        if (event) {
          // Sync requestedServices
          const s = (event.requestedServices || []).find(
            (item) =>
              item.category.toLowerCase() === (booking.serviceCategory || "").toLowerCase() ||
              String(item.activeBookingId) === String(booking._id) ||
              String(item.assignedVendorId) === String(booking.vendorId)
          );
          if (s) {
            if (status === "Accepted" || status === "Accepted by Vendor") {
              s.status = "Accepted by Vendor";
              s.assignedVendorId = req.user._id;
              s.assignedVendorName = req.user.fullName;
            } else if (status === "Rejected" || status === "Declined" || status === "Declined by Vendor") {
              s.status = "Vendor Search in Progress";
              s.declineReason = req.body.declineReason || req.body.reason || "Declined by vendor";
              s.activeBookingId = null;
            } else if (status === "Confirmed" || status === "Confirmed by Admin") {
              s.status = "Confirmed";
            }
          }

          event.allocatedVendors = event.allocatedVendors || [];
          const alloc = event.allocatedVendors.find((a) => String(a.vendorId) === String(booking.vendorId));
          if (alloc) {
            alloc.status = (status === "Accepted" || status === "Accepted by Vendor") ? "Accepted" : "Declined";
            alloc.note = `Vendor ${status.toLowerCase()} on ${new Date().toISOString().split("T")[0]}`;
          } else {
            event.allocatedVendors.push({
              category: booking.serviceCategory || booking.serviceName || "Service",
              vendorId: booking.vendorId,
              vendorName: req.user.fullName,
              status: (status === "Accepted" || status === "Accepted by Vendor") ? "Accepted" : "Declined",
              bookingId: booking._id,
              note: `Vendor ${status.toLowerCase()}`,
            });
          }
          if (typeof event.recalculateStatus === "function") {
            event.recalculateStatus();
          }
          await event.save();
        }

        // Notify Admins
        notifyAdmins({
          type: (status === "Accepted" || status === "Accepted by Vendor") ? "success" : "alert",
          title: `Artisan Response: ${status} 🔔`,
          message: `${req.user.fullName} has responded with ${status.toUpperCase()} for celebration "${booking.eventName}".`,
          link: `/admin/events`,
          idempotencyPrefix: `booking-status:${booking._id}:${status}`,
          eventId: booking.eventId,
          eventName: booking.eventName,
          bookingId: booking._id,
        }).catch(() => {});
      } catch (syncErr) {
        console.warn("Event sync warning:", syncErr.message);
      }
    }

    // Notify parties (avoid duplicate WhatsApp with sendEventBookingWhatsApp when Confirmed)
    if (isVendor) {
      emitNotification({
        userId: booking.organizerId,
        type: status === "Accepted" ? "success" : "warning",
        title: `Service Update: ${status} 🔔`,
        message: `The vendor has ${status.toLowerCase()} your booking request for "${booking.eventName}" (${booking.serviceCategory || booking.serviceName || "Service"}).`,
        link: "/user/bookings",
        idempotencyKey: `booking-status:${booking._id}:${status}:user:${booking.organizerId}`,
        bookingId: booking._id,
        eventId: booking.eventId,
        eventName: booking.eventName,
        sendWhatsApp: status !== "Confirmed",
      }).catch(() => {});
    }

    if (isOrganizer || isAdmin) {
      emitNotification({
        userId: booking.vendorId,
        type: status === "Accepted" || status === "Confirmed" ? "success" : "warning",
        title: status === "Cancelled" ? "Request Cancelled ⚠️" : `Booking ${status}`,
        message: `${req.user.fullName} updated booking status to ${status} for "${booking.eventName}".`,
        link: "/vendor/bookings",
        idempotencyKey: `booking-status:${booking._id}:${status}:vendor:${booking.vendorId}`,
        bookingId: booking._id,
        eventId: booking.eventId,
        eventName: booking.eventName,
      }).catch(() => {});
    }

    res.status(200).json({ success: true, booking });
  } catch (err) { next(err); }
};

// @desc    Vendor sends proposal for a booking
// @route   POST /api/bookings/:id/proposal
// @access  Private (vendor)
exports.sendProposal = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

    if (String(booking.vendorId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only the assigned vendor can send proposals." });
    }

    const { servicePrice, advanceAmount, includedServices, description, validityDate, serviceDuration } = req.body;
    if (servicePrice === undefined || servicePrice === null || isNaN(Number(servicePrice)) || Number(servicePrice) <= 0) {
      return res.status(400).json({ success: false, message: "Contract price must be a positive amount greater than zero." });
    }

    const advance = Number(advanceAmount) || 0;
    if (advance < 0 || advance > Number(servicePrice)) {
      return res.status(400).json({ success: false, message: "Booking advance amount cannot be negative or exceed the total contract price." });
    }

    if (description && description.trim().length < 5) {
      return res.status(400).json({ success: false, message: "Proposal description should be at least 5 characters." });
    }

    let proposal = await Proposal.findOne({ bookingId: booking._id });
    if (proposal) {
      Object.assign(proposal, { servicePrice: Number(servicePrice), advanceAmount: Number(advanceAmount) || 0, includedServices, description, validityDate, serviceDuration });
      await proposal.save();
    } else {
      proposal = await Proposal.create({
        bookingId: booking._id,
        vendorId: req.user._id,
        servicePrice: Number(servicePrice),
        advanceAmount: Number(advanceAmount) || 0,
        includedServices: Array.isArray(includedServices) ? includedServices : [],
        description: description || "",
        validityDate: validityDate || "",
        serviceDuration: serviceDuration || "",
      });
    }

    booking.status = "Proposal Sent";
    booking.totalPrice = Number(servicePrice);
    await booking.save();

    emitNotification({
      userId: booking.organizerId,
      type: "info",
      title: "Commercial Proposal Received 💼",
      message: `The vendor submitted a proposal of ₹${Number(servicePrice).toLocaleString("en-IN")} for "${booking.eventName}". Review and accept to lock in your date.`,
      link: "/user/bookings",
      idempotencyKey: `proposal-sent:${booking._id}:${proposal._id}:${Number(servicePrice)}`,
      bookingId: booking._id,
      eventId: booking.eventId,
      eventName: booking.eventName,
    }).catch(() => {});

    res.status(200).json({ success: true, proposal, booking });
  } catch (err) { next(err); }
};

// @desc    Get proposal for a booking
// @route   GET /api/bookings/:id/proposal
// @access  Private
exports.getProposal = async (req, res, next) => {
  try {
    const proposal = await Proposal.findOne({ bookingId: req.params.id });
    res.status(200).json({ success: true, proposal });
  } catch (err) { next(err); }
};

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

    if (req.user.role !== "admin" && String(booking.organizerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await booking.deleteOne();
    res.status(200).json({ success: true, message: "Booking deleted." });
  } catch (err) { next(err); }
};

// @desc    Cancel booking with 20% non-refundable fee deduction policy
// @route   PUT /api/bookings/:id/cancel
// @access  Private (host or admin)
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

    const isOrganizer = String(booking.organizerId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Booking is already cancelled." });
    }

    const { reason = "" } = req.body;
    const paid = Number(booking.paidAmount || 0);
    const fee = paid > 0 ? Math.round(paid * 0.20) : 0; // 20% non-refundable deduction
    const refund = paid > 0 ? paid - fee : 0;          // 80% refund

    booking.status = "Cancelled";
    if (paid > 0) {
      booking.paymentStatus = "Refunded";
      booking.cancellationFee = fee;
      booking.refundAmount = refund;
    }
    booking.cancellationReason = reason || "Cancelled by host";
    await booking.save();

    // Notify vendor
    emitNotification({
      userId: booking.vendorId,
      type: "alert",
      title: "Service Request Cancelled ⚠️",
      message: `${req.user.fullName} cancelled booking for "${booking.eventName}".${fee > 0 ? ` 20% non-refundable cancellation fee: ₹${fee.toLocaleString("en-IN")}.` : ""}`,
      link: "/vendor/bookings",
      idempotencyKey: `booking-cancelled:${booking._id}:vendor:${booking.vendorId}`,
      bookingId: booking._id,
      eventId: booking.eventId,
      eventName: booking.eventName,
    }).catch(() => {});

    // Notify organizer
    emitNotification({
      userId: booking.organizerId,
      type: "alert",
      title: "Booking Cancelled",
      message: `Your booking for "${booking.serviceName}" has been cancelled.${paid > 0 ? ` Per EVORA policy, 20% fee (₹${fee.toLocaleString("en-IN")}) is non-refundable. Refund: ₹${refund.toLocaleString("en-IN")} (80%).` : ""}`,
      link: "/user/bookings",
      idempotencyKey: `booking-cancelled:${booking._id}:user:${booking.organizerId}`,
      bookingId: booking._id,
      eventId: booking.eventId,
      eventName: booking.eventName,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      booking,
      paidAmount: paid,
      cancellationFee: fee,
      refundAmount: refund,
    });
  } catch (err) { next(err); }
};

// @desc    Vendor accepts or declines an event service request
// @route   PUT /api/bookings/:id/respond
// @access  Private (Vendor only)
exports.respondToRequest = async (req, res, next) => {
  try {
    const { action, declineReason, proposedPrice } = req.body;
    if (!action || !["accept", "decline"].includes(action.toLowerCase())) {
      return res.status(400).json({ success: false, message: "action must be 'accept' or 'decline'." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking request not found." });

    // Authorization: only the assigned vendor can respond
    if (String(booking.vendorId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied. Only the assigned vendor can respond to this request." });
    }

    const Event = require("../models/Event");
    const User = require("../models/User");
    const event = await Event.findById(booking.eventId);

    if (action.toLowerCase() === "accept") {
      // 1. Availability and capacity validation
      if (booking.eventDate) {
        const avail = await VendorAvailability.findOne({ vendorId: booking.vendorId });
        if (avail) {
          if (avail.blockedDates && avail.blockedDates.includes(booking.eventDate)) {
            return res.status(400).json({
              success: false,
              message: `Cannot accept booking. Date ${booking.eventDate} is marked as blocked on your availability calendar.`,
            });
          }
          const activeCount = await Booking.countDocuments({
            vendorId: booking.vendorId,
            eventDate: booking.eventDate,
            status: { $in: ["Accepted", "Accepted by Vendor", "Confirmed", "Confirmed by Admin"] },
            _id: { $ne: booking._id },
          });
          if (activeCount >= (avail.capacityPerDay || 1)) {
            return res.status(400).json({
              success: false,
              message: `Daily capacity limit (${avail.capacityPerDay} event/day) reached on ${booking.eventDate}. Cannot accept request.`,
            });
          }
        }
      }

      booking.status = "Accepted by Vendor";
      if (proposedPrice) booking.proposedPrice = Number(proposedPrice);
      await booking.save();

      // Synchronize with event requestedServices
      if (event) {
        const service = (event.requestedServices || []).find(
          (s) =>
            s.category.toLowerCase() === (booking.serviceCategory || "").toLowerCase() ||
            String(s.activeBookingId) === String(booking._id) ||
            String(s.assignedVendorId) === String(booking.vendorId)
        );
        if (service) {
          service.status = "Accepted by Vendor";
          service.assignedVendorId = req.user._id;
          service.assignedVendorName = req.user.fullName;
          if (proposedPrice) service.agreedPrice = Number(proposedPrice);
        }

        // Sync legacy allocatedVendors
        event.allocatedVendors = event.allocatedVendors || [];
        const alloc = event.allocatedVendors.find((a) => String(a.vendorId) === String(booking.vendorId));
        if (alloc) {
          alloc.status = "Accepted";
          alloc.note = `Accepted by vendor on ${new Date().toISOString().split("T")[0]}`;
        }
        if (typeof event.recalculateStatus === "function") {
          event.recalculateStatus();
        }
        await event.save();
      }

      // Notify Organizer of Service Acceptance
      if (booking.organizerId) {
        emitNotification({
          userId: booking.organizerId,
          type: "success",
          title: `Service Request Accepted: ${booking.serviceCategory || booking.serviceName} ✅`,
          message: `${req.user.fullName} accepted your ${booking.serviceCategory || "service"} request for "${booking.eventName}". Admin will finalize the assignment shortly.`,
          link: `/user/events/${booking.eventId}`,
          idempotencyKey: `booking-respond:${booking._id}:accept:user:${booking.organizerId}`,
          bookingId: booking._id,
          eventId: booking.eventId,
          eventName: booking.eventName,
        }).catch(() => {});
      }

      // Notify Admins
      notifyAdmins({
        type: "success",
        title: "Vendor Accepted Request 🔔",
        message: `${req.user.fullName} accepted ${booking.serviceCategory || "requested"} service for "${booking.eventName}". Admin can now confirm assignment.`,
        link: `/admin/events`,
        idempotencyPrefix: `booking-respond:${booking._id}:accept`,
        eventId: booking.eventId,
        eventName: booking.eventName,
        bookingId: booking._id,
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `You have successfully accepted the request for "${booking.eventName}". Awaiting Admin final confirmation.`,
        booking,
      });
    } else {
      // action === "decline"
      const reason = (declineReason || req.body.reason || "").trim();
      if (!reason) {
        return res.status(400).json({ success: false, message: "declineReason is required when declining a request." });
      }

      booking.status = "Declined";
      booking.declineReason = reason;
      await booking.save();

      // Synchronize with event requestedServices
      if (event) {
        const service = (event.requestedServices || []).find(
          (s) =>
            s.category.toLowerCase() === (booking.serviceCategory || "").toLowerCase() ||
            String(s.activeBookingId) === String(booking._id) ||
            String(s.assignedVendorId) === String(booking.vendorId)
        );
        if (service) {
          service.status = "Vendor Search in Progress";
          service.declineReason = reason;
          service.activeBookingId = null; // Reset so Admin can select another candidate
        }

        // Sync legacy allocatedVendors
        event.allocatedVendors = event.allocatedVendors || [];
        const alloc = event.allocatedVendors.find((a) => String(a.vendorId) === String(booking.vendorId));
        if (alloc) {
          alloc.status = "Declined";
          alloc.note = `Declined: ${reason}`;
        }
        if (typeof event.recalculateStatus === "function") {
          event.recalculateStatus();
        }
        await event.save();
      }

      // Notify Organizer of Service Decline
      if (booking.organizerId) {
        emitNotification({
          userId: booking.organizerId,
          type: "warning",
          title: `Service Declined: ${booking.serviceCategory || booking.serviceName} ⚠️`,
          message: `${req.user.fullName} declined the ${booking.serviceCategory || "service"} request for "${booking.eventName}". Reason: "${reason}". EVORA Admin is assisting with alternatives.`,
          link: `/user/events/${booking.eventId}`,
          idempotencyKey: `booking-respond:${booking._id}:decline:user:${booking.organizerId}`,
          bookingId: booking._id,
          eventId: booking.eventId,
          eventName: booking.eventName,
        }).catch(() => {});
      }

      // Notify Admins with decline reason
      notifyAdmins({
        type: "alert",
        title: "Vendor Declined Request ⚠️",
        message: `${req.user.fullName} declined ${booking.serviceCategory || "requested"} service for "${booking.eventName}". Reason: "${reason}".`,
        link: `/admin/events`,
        idempotencyPrefix: `booking-respond:${booking._id}:decline`,
        eventId: booking.eventId,
        eventName: booking.eventName,
        bookingId: booking._id,
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `You have declined the request for "${booking.eventName}". Admin has been notified.`,
        booking,
      });
    }
  } catch (err) { next(err); }
};
