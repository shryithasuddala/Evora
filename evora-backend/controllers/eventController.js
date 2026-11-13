const Event = require("../models/Event");
const Service = require("../models/Service");
const { sendEventApprovalWhatsApp } = require("../services/whatsappService");
const { emitNotification, notifyAdmins } = require("../services/notificationService");
const { validateEventInput } = require("../utils/validators");

const getDefaultChecklist = (category = "") => [
  { title: "Finalize & Secure Venue Booking", category: "Venue & Halls", status: "In Progress", owner: "Organizer" },
  { title: "Select Catering Menu & Finalize Guest Count", category: "Catering", status: "Pending", owner: "Organizer" },
  { title: "Confirm Stage & Floral Theme Decoration", category: "Decoration", status: "Pending", owner: "Organizer" },
  { title: "Brief Photography & Cinematography Crew", category: "Photography & Videography", status: "Pending", owner: "Organizer" },
  { title: "Draft Digital Invitations & Launch RSVP", category: "Invitations", status: "Pending", owner: "Organizer" },
  { title: "Complete Vendor Advance Payments (50%)", category: "Finance", status: "Pending", owner: "Organizer" },
  { title: "Mobilize Volunteer Operations & Food Clearance", category: "Volunteers", status: "Pending", owner: "Volunteer Force" },
];

// @desc    Create event
// @route   POST /api/events
// @access  Private (user/organizer)
exports.createEvent = async (req, res, next) => {
  try {
    const {
      title,
      category,
      date,
      time,
      location,
      venue,
      guestCount,
      totalBudget,
      description,
      theme,
      details,
      preferences,
      selectedServices,
      requiredServices,
      requestedServices,
      estimatedTotal,
      planStatus,
      volunteersNeeded,
      volunteerRoles,
      schedule,
    } = req.body;

    if (!title || !category || !date) {
      return res.status(400).json({ success: false, message: "title, category, and date are required." });
    }

    const eventValidation = validateEventInput({ title, category, date, guestCount, totalBudget });
    if (!eventValidation.isValid) {
      return res.status(400).json({ success: false, message: eventValidation.errors.join(" ") });
    }

    // Parse and normalize structured requestedServices
    let parsedRequestedServices = [];
    if (Array.isArray(requestedServices) && requestedServices.length > 0) {
      parsedRequestedServices = requestedServices.map((item) => {
        if (typeof item === "string") {
          return { category: item.trim(), status: "Requested" };
        }
        return {
          category: item.category || "General Service",
          specificRequirements: item.specificRequirements || "",
          targetBudget: Number(item.targetBudget) || 0,
          status: "Requested",
        };
      });
    } else if (Array.isArray(requiredServices) && requiredServices.length > 0) {
      parsedRequestedServices = requiredServices.map((cat) => ({
        category: typeof cat === "string" ? cat.trim() : cat.category || "Service",
        status: "Requested",
      }));
    } else {
      parsedRequestedServices = [
        { category: "Catering", status: "Requested" },
        { category: "Decoration", status: "Requested" },
        { category: "Photography", status: "Requested" },
      ];
    }

    const categoriesArray = parsedRequestedServices.map((s) => s.category);

    const event = await Event.create({
      organizerId: req.user._id,
      title: title.trim(),
      category,
      date,
      time: time || "",
      location: location || "",
      venue: venue || "",
      guestCount: Number(guestCount) || 0,
      totalBudget: Number(totalBudget) || 0,
      description: description || "",
      theme: theme || "",
      details: details || {},
      preferences: preferences || {},
      requestedServices: parsedRequestedServices,
      requiredServices: categoriesArray,
      selectedServices: Array.isArray(selectedServices) ? selectedServices : [],
      estimatedTotal: Number(estimatedTotal) || 0,
      status: "Submitted",
      planStatus: planStatus || (selectedServices?.length ? "Saved" : "Draft"),
      volunteersNeeded: Number(volunteersNeeded) || 0,
      volunteerRoles: Array.isArray(volunteerRoles) ? volunteerRoles : [],
      schedule: Array.isArray(schedule) ? schedule : [],
      checklist: getDefaultChecklist(category),
    });

    // 1. Notify user that their celebration is created & submitted
    emitNotification({
      userId: req.user._id,
      type: "success",
      title: "Event Creation Confirmed 🎉",
      message: `Your celebration "${event.title}" on ${event.date} (${event.location || event.venue || "Venue TBC"}) has been created with ${parsedRequestedServices.length} requested service(s). EVORA Concierge will coordinate availability.`,
      link: `/user/events/${event._id}`,
      idempotencyKey: `event-created:${event._id}:user:${req.user._id}`,
      eventId: event._id,
      eventName: event.title,
      templateKey: "EVENT_CREATED",
    }).catch(() => {});

    // 2. Notify all Admins immediately
    const serviceNames = categoriesArray.join(", ");
    notifyAdmins({
      type: "alert",
      title: "New Event Coordination Request 🔔",
      message: `${req.user.fullName || "User"} created celebration "${event.title}" on ${event.date} in ${event.location || "Hyderabad"}. Services requested: ${serviceNames}.`,
      link: `/admin/events`,
      idempotencyPrefix: `event-created:${event._id}`,
      eventId: event._id,
      eventName: event.title,
    }).catch(() => {});

    res.status(201).json({ success: true, event });
  } catch (err) { next(err); }
};

// @desc    Get all events for the logged-in organizer
// @route   GET /api/events
// @access  Private
exports.getMyEvents = async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {} : { organizerId: req.user._id };
    const events = await Event.find(filter)
      .populate("organizerId", "fullName email phone")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: events.length, events });
  } catch (err) { next(err); }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Private
exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organizerId", "fullName email phone location")
      .populate("requestedServices.assignedVendorId", "fullName businessName serviceType phone email location")
      .populate("selectedServices.serviceId");

    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    if (req.user.role !== "admin" && String(event.organizerId._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Ensure requestedServices structure is present for legacy events
    ensureEventRequestedServices(event);

    res.status(200).json({ success: true, event });
  } catch (err) { next(err); }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
exports.updateEvent = async (req, res, next) => {
  try {
    let event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    if (req.user.role !== "admin" && String(event.organizerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const previous = {
      date: event.date,
      time: event.time,
      venue: event.venue,
      location: event.location,
    };

    const allowedUpdates = [
      "title", "category", "date", "time", "location", "venue", "guestCount", "confirmedGuests",
      "totalBudget", "description", "theme", "status", "planStatus", "details", "preferences",
      "selectedServices", "estimatedTotal", "volunteersNeeded", "volunteerRoles", "schedule", "checklist"
    ];

    const updates = {};
    allowedUpdates.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    event = await Event.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

    const scheduleChanged =
      (updates.date !== undefined && updates.date !== previous.date) ||
      (updates.time !== undefined && updates.time !== previous.time) ||
      (updates.venue !== undefined && updates.venue !== previous.venue) ||
      (updates.location !== undefined && updates.location !== previous.location) ||
      updates.schedule !== undefined;

    if (scheduleChanged) {
      const changeStamp = Date.now();
      const summary = `Date: ${event.date || "TBD"}, Time: ${event.time || "TBD"}, Venue: ${event.venue || event.location || "TBD"}`;

      // Notify Host if updated by someone else (e.g. Admin)
      if (String(event.organizerId) !== String(req.user._id)) {
        emitNotification({
          userId: event.organizerId,
          type: "warning",
          title: `Event Schedule Updated: ${event.title} 📅`,
          message: `Your celebration "${event.title}" details were updated (${summary}).`,
          link: `/user/events/${event._id}`,
          idempotencyKey: `event-updated:${event._id}:${changeStamp}:user:${event.organizerId}`,
          eventId: event._id,
          eventName: event.title,
        }).catch(() => {});
      }

      // Notify Active Vendors
      const Booking = require("../models/Booking");
      const activeBookings = await Booking.find({
        eventId: event._id,
        status: { $nin: ["Cancelled", "Declined", "Rejected"] },
      }).select("vendorId");
      const vendorIds = [...new Set(activeBookings.map((b) => String(b.vendorId)))];
      for (const vId of vendorIds) {
        emitNotification({
          userId: vId,
          type: "warning",
          title: `Event Details Changed: ${event.title} 📅`,
          message: `Details for "${event.title}" were updated (${summary}). Please review your vendor schedule.`,
          link: "/vendor/bookings",
          idempotencyKey: `event-updated:${event._id}:${changeStamp}:vendor:${vId}`,
          eventId: event._id,
          eventName: event.title,
        }).catch(() => {});
      }

      // Notify Assigned Volunteers
      const Task = require("../models/Task");
      const tasks = await Task.find({ eventId: event._id, status: { $ne: "Completed" } }).select("volunteerId");
      const volIds = [...new Set(tasks.map((t) => String(t.volunteerId)))];
      for (const volId of volIds) {
        emitNotification({
          userId: volId,
          type: "warning",
          title: `Duty Schedule Updated: ${event.title} 📅`,
          message: `Event schedule/venue for "${event.title}" changed (${summary}). Check your volunteer roster.`,
          link: "/volunteer/tasks",
          idempotencyKey: `event-updated:${event._id}:${changeStamp}:volunteer:${volId}`,
          eventId: event._id,
          eventName: event.title,
        }).catch(() => {});
      }
    }

    res.status(200).json({ success: true, event });
  } catch (err) { next(err); }
};

// @desc    Save event plan & live cost
// @route   PUT /api/events/:id/plan
// @access  Private
exports.savePlan = async (req, res, next) => {
  try {
    const { selectedServices = [], estimatedTotal = 0, planStatus = "Saved" } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    if (req.user.role !== "admin" && String(event.organizerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    event.selectedServices = selectedServices;
    event.estimatedTotal = Number(estimatedTotal) || selectedServices.reduce((sum, s) => sum + (Number(s.price) * (Number(s.quantity) || 1)), 0);
    event.planStatus = planStatus;
    await event.save();

    res.status(200).json({ success: true, event });
  } catch (err) { next(err); }
};

// @desc    Suggest cheaper alternatives for a service category
// @route   GET /api/events/:id/alternatives/:category
// @access  Private
exports.suggestAlternatives = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { maxPrice = 9999999 } = req.query;

    const alternatives = await Service.find({
      category,
      price: { $lt: Number(maxPrice) },
      isActive: true,
    })
      .sort({ price: 1 })
      .limit(4)
      .populate("vendorId", "fullName businessName phone");

    res.status(200).json({ success: true, count: alternatives.length, alternatives });
  } catch (err) { next(err); }
};

// @desc    Update event schedule
// @route   PUT /api/events/:id/schedule
// @access  Private
exports.updateSchedule = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    if (req.user.role !== "admin" && String(event.organizerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    event.schedule = Array.isArray(req.body.schedule) ? req.body.schedule : [];
    await event.save();

    const changeStamp = Date.now();
    // Notify Host
    emitNotification({
      userId: event.organizerId,
      type: "info",
      title: `Event Schedule Updated: ${event.title} 🕒`,
      message: `The timeline/schedule for "${event.title}" (${event.date}) has been updated with ${event.schedule.length} activity slot(s).`,
      link: `/user/events/${event._id}`,
      idempotencyKey: `schedule-updated:${event._id}:${changeStamp}:user:${event.organizerId}`,
      eventId: event._id,
      eventName: event.title,
    }).catch(() => {});

    // Notify Active Vendors
    const Booking = require("../models/Booking");
    const activeBookings = await Booking.find({
      eventId: event._id,
      status: { $nin: ["Cancelled", "Declined", "Rejected"] },
    }).select("vendorId");
    const vendorIds = [...new Set(activeBookings.map((b) => String(b.vendorId)))];
    for (const vId of vendorIds) {
      emitNotification({
        userId: vId,
        type: "info",
        title: `Event Schedule Changed: ${event.title} 🕒`,
        message: `The timeline for "${event.title}" on ${event.date} has been updated. Please review your slot timing.`,
        link: "/vendor/bookings",
        idempotencyKey: `schedule-updated:${event._id}:${changeStamp}:vendor:${vId}`,
        eventId: event._id,
        eventName: event.title,
      }).catch(() => {});
    }

    // Notify Assigned Volunteers
    const Task = require("../models/Task");
    const tasks = await Task.find({ eventId: event._id, status: { $ne: "Completed" } }).select("volunteerId");
    const volIds = [...new Set(tasks.map((t) => String(t.volunteerId)))];
    for (const volId of volIds) {
      emitNotification({
        userId: volId,
        type: "info",
        title: `Duty Schedule Changed: ${event.title} 🕒`,
        message: `Your duty timeline for "${event.title}" on ${event.date} has been updated. Check your schedule in EVORA.`,
        link: "/volunteer/tasks",
        idempotencyKey: `schedule-updated:${event._id}:${changeStamp}:volunteer:${volId}`,
        eventId: event._id,
        eventName: event.title,
      }).catch(() => {});
    }

    res.status(200).json({ success: true, schedule: event.schedule });
  } catch (err) { next(err); }
};

// @desc    Update event checklist
// @route   PUT /api/events/:id/checklist
// @access  Private
exports.updateChecklist = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    if (req.user.role !== "admin" && String(event.organizerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (Array.isArray(req.body.checklist)) {
      event.checklist = req.body.checklist;
    }
    await event.save();
    res.status(200).json({ success: true, checklist: event.checklist });
  } catch (err) { next(err); }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    if (req.user.role !== "admin" && String(event.organizerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await event.deleteOne();
    res.status(200).json({ success: true, message: "Event deleted." });
  } catch (err) { next(err); }
};

// --- Helper functions for Real-World Event Service Coordination ---
function getCategoryRegex(category) {
  let cat = (category || "").trim();
  if (/catering|food/i.test(cat)) return /cater|food|cook|dining/i;
  if (/venue|hall/i.test(cat)) return /venue|hall|lawn|resort|convention|banquet/i;
  if (/photo|video|camera/i.test(cat)) return /photo|video|candid|film|camera/i;
  if (/decor/i.test(cat)) return /decor|floral|stage|flower|theme/i;
  if (/sound|dj|music/i.test(cat)) return /sound|music|dj|audio/i;
  if (/makeup|styling|beauty/i.test(cat)) return /makeup|styling|mehendi|beauty|hair/i;
  if (/transport/i.test(cat)) return /transport|vehicle|car|bus/i;
  if (/security/i.test(cat)) return /security|guard/i;
  if (/printing|invite/i.test(cat)) return /print|invite|card/i;
  return new RegExp(cat, "i");
}

function ensureEventRequestedServices(event) {
  if (!Array.isArray(event.requestedServices) || event.requestedServices.length === 0) {
    const categories = Array.isArray(event.requiredServices) && event.requiredServices.length
      ? event.requiredServices
      : ["Catering", "Decoration", "Photography"];
    event.requestedServices = categories.map((cat) => ({
      category: typeof cat === "string" ? cat : cat.category || "Service",
      specificRequirements: "",
      targetBudget: 0,
      status: "Requested",
      assignedVendorId: null,
      assignedVendorName: "",
      agreedPrice: 0,
      assignmentNotes: "",
      activeBookingId: null,
      declineReason: "",
      userDecision: "None",
    }));
  }
  return event.requestedServices;
}

// @desc    Retrieve complete event coordination details with candidate vendors & availability matrix
// @route   GET /api/events/:id/coordination
// @access  Private (Admin or Host)
exports.getEventCoordination = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organizerId", "fullName email phone location")
      .populate("requestedServices.assignedVendorId", "fullName businessName serviceType phone email location");

    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    if (req.user.role !== "admin" && String(event.organizerId?._id || event.organizerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied. Only Admin or the event Host can access coordination details." });
    }

    const User = require("../models/User");
    const Booking = require("../models/Booking");
    const VendorAvailability = require("../models/VendorAvailability");
    const Service = require("../models/Service");

    ensureEventRequestedServices(event);

    const eventDate = event.date;
    const servicesCoordination = [];

    for (const s of event.requestedServices) {
      const categoryRegex = getCategoryRegex(s.category);

      // Find services with this category
      const catalogServices = await Service.find({ category: categoryRegex, isActive: true }).populate("vendorId");

      // Find vendors with matching serviceType or catalog services
      const vendorUsers = await User.find({
        role: "vendor",
        isActive: true,
        $or: [
          { serviceType: categoryRegex },
          { _id: { $in: catalogServices.map((cs) => cs.vendorId?._id).filter(Boolean) } },
        ],
      }).select("fullName businessName serviceType phone email location");

      // Deduplicate vendors
      const vendorMap = new Map();
      for (const v of vendorUsers) vendorMap.set(String(v._id), v);
      for (const cs of catalogServices) {
        if (cs.vendorId && cs.vendorId._id) {
          vendorMap.set(String(cs.vendorId._id), cs.vendorId);
        }
      }

      const candidateVendors = [];

      for (const vendor of vendorMap.values()) {
        const avail = await VendorAvailability.findOne({ vendorId: vendor._id });
        const blockedDates = avail?.blockedDates || [];
        const isBlocked = blockedDates.includes(eventDate);
        const capacityPerDay = avail?.capacityPerDay || 1;

        // Count confirmed/accepted bookings for this vendor on event date (excluding this event)
        const activeBookings = await Booking.countDocuments({
          vendorId: vendor._id,
          eventDate,
          status: { $in: ["Accepted", "Accepted by Vendor", "Confirmed", "Confirmed by Admin"] },
          eventId: { $ne: event._id },
        });

        const isCapacityFull = activeBookings >= capacityPerDay;
        const isAvailable = !isBlocked && !isCapacityFull;

        let conflictReason = null;
        if (isBlocked) {
          conflictReason = `Calendar date ${eventDate} blocked by artisan`;
        } else if (isCapacityFull) {
          conflictReason = `Artisan at full capacity (${activeBookings}/${capacityPerDay} celebrations confirmed)`;
        }

        // Check if there is an existing booking for this vendor on this event and service
        const existingBooking = await Booking.findOne({
          eventId: event._id,
          vendorId: vendor._id,
          $or: [
            { serviceCategory: new RegExp(s.category, "i") },
            { _id: s.activeBookingId },
          ],
        });

        candidateVendors.push({
          vendorId: vendor._id,
          fullName: vendor.fullName,
          businessName: vendor.businessName || vendor.fullName,
          serviceType: vendor.serviceType || s.category,
          phone: vendor.phone,
          email: vendor.email,
          location: vendor.location || "",
          isAvailable,
          isBlocked,
          capacityPerDay,
          activeBookingsOnDate: activeBookings,
          conflictReason,
          existingBooking: existingBooking
            ? {
                bookingId: existingBooking._id,
                status: existingBooking.status,
                declineReason: existingBooking.declineReason || "",
                proposedPrice: existingBooking.proposedPrice || 0,
                assignmentNotes: existingBooking.assignmentNotes || "",
                responseDeadline: existingBooking.responseDeadline || null,
              }
            : null,
        });
      }

      servicesCoordination.push({
        _id: s._id,
        category: s.category,
        specificRequirements: s.specificRequirements || "",
        targetBudget: s.targetBudget || 0,
        status: s.status,
        assignedVendorId: s.assignedVendorId,
        assignedVendorName: s.assignedVendorName,
        agreedPrice: s.agreedPrice || 0,
        assignmentNotes: s.assignmentNotes || "",
        activeBookingId: s.activeBookingId,
        declineReason: s.declineReason || "",
        userDecision: s.userDecision || "None",
        candidateVendors,
      });
    }

    const activeServices = servicesCoordination.filter((s) => s.status !== "Cancelled by User");
    const summary = {
      totalServices: servicesCoordination.length,
      activeServicesCount: activeServices.length,
      confirmedCount: servicesCoordination.filter((s) => s.status === "Confirmed").length,
      awaitingVendorCount: servicesCoordination.filter((s) => s.status === "Awaiting Vendor Response").length,
      acceptedByVendorCount: servicesCoordination.filter((s) => s.status === "Accepted by Vendor").length,
      unavailableCount: servicesCoordination.filter((s) => s.status === "Unavailable").length,
      cancelledCount: servicesCoordination.filter((s) => s.status === "Cancelled by User").length,
      searchInProgressCount: servicesCoordination.filter((s) => s.status === "Vendor Search in Progress" || s.status === "Requested").length,
    };

    res.status(200).json({
      success: true,
      event: {
        _id: event._id,
        title: event.title,
        category: event.category,
        date: event.date,
        time: event.time,
        location: event.location,
        venue: event.venue,
        guestCount: event.guestCount,
        totalBudget: event.totalBudget,
        status: event.status,
        organizer: event.organizerId,
      },
      summary,
      requestedServices: servicesCoordination,
    });
  } catch (err) { next(err); }
};

// @desc    Admin dispatches a service request to a vendor (prevents duplicate active requests)
// @route   POST /api/events/:id/services/:category/request-vendor
// @access  Private (Admin only)
exports.requestVendorForService = async (req, res, next) => {
  try {
    const { vendorId, proposedPrice, notes, responseDeadline } = req.body;
    const category = req.params.category;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId is required." });
    }

    const event = await Event.findById(req.params.id).populate("organizerId", "fullName email phone");
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    ensureEventRequestedServices(event);

    const service = event.requestedServices.find(
      (s) => s.category.toLowerCase() === category.toLowerCase()
    );
    if (!service) {
      return res.status(404).json({ success: false, message: `Service category "${category}" not found in event.` });
    }

    const User = require("../models/User");
    const Booking = require("../models/Booking");
    const VendorAvailability = require("../models/VendorAvailability");
    const Service = require("../models/Service");

    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== "vendor") {
      return res.status(404).json({ success: false, message: "Valid vendor not found." });
    }

    // 1. Prevent duplicate active requests
    const existingActive = await Booking.findOne({
      eventId: event._id,
      vendorId: vendor._id,
      serviceCategory: new RegExp(service.category, "i"),
      status: { $in: ["Pending", "Proposal Sent", "Accepted", "Accepted by Vendor", "Confirmed", "Confirmed by Admin"] },
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: `An active request (${existingActive.status}) already exists for ${vendor.fullName} in ${service.category}. Duplicate requests are blocked.`,
      });
    }

    // 2. Check vendor calendar availability & capacity
    const avail = await VendorAvailability.findOne({ vendorId: vendor._id });
    if (avail) {
      if (avail.blockedDates && avail.blockedDates.includes(event.date)) {
        return res.status(400).json({
          success: false,
          message: `${vendor.fullName} has blocked date ${event.date} on their availability calendar. Cannot dispatch request.`,
        });
      }
      const activeBookings = await Booking.countDocuments({
        vendorId: vendor._id,
        eventDate: event.date,
        status: { $in: ["Accepted", "Accepted by Vendor", "Confirmed", "Confirmed by Admin"] },
        eventId: { $ne: event._id },
      });
      if (activeBookings >= (avail.capacityPerDay || 1)) {
        return res.status(400).json({
          success: false,
          message: `${vendor.fullName} is fully booked at capacity (${activeBookings}/${avail.capacityPerDay}) on ${event.date}. Cannot dispatch request.`,
        });
      }
    }

    const catalogService = await Service.findOne({ vendorId: vendor._id });
    const deadlineDate = responseDeadline ? new Date(responseDeadline) : new Date(Date.now() + 48 * 3600 * 1000);

    // Create Booking record
    const booking = await Booking.create({
      organizerId: event.organizerId?._id || event.organizerId,
      organizer: event.organizerId?.fullName || "EVORA Host",
      vendorId: vendor._id,
      eventId: event._id,
      serviceId: catalogService?._id || null,
      serviceCategory: service.category,
      eventName: event.title,
      serviceName: catalogService?.name || `${service.category} Service`,
      eventDate: event.date,
      eventVenue: event.venue || event.location || "Celebration Hall",
      guestCount: event.guestCount || 0,
      proposedPrice: Number(proposedPrice) || service.targetBudget || 0,
      assignmentNotes: notes || "",
      responseDeadline: deadlineDate,
      status: "Pending",
      notes: `Service request initiated by EVORA Admin. Proposed price: ₹${Number(proposedPrice) || service.targetBudget || 0}. Notes: ${notes || "None"}`,
    });

    const previousServiceStatus = service.status;

    // Update service in event
    service.status = "Awaiting Vendor Response";
    service.assignedVendorId = vendor._id;
    service.assignedVendorName = vendor.fullName;
    service.activeBookingId = booking._id;
    service.assignmentNotes = notes || "";
    service.declineReason = "";

    // Sync legacy allocatedVendors
    event.allocatedVendors = event.allocatedVendors || [];
    const allocIdx = event.allocatedVendors.findIndex((a) => a.category.toLowerCase() === service.category.toLowerCase());
    const allocItem = {
      category: service.category,
      vendorId: vendor._id,
      vendorName: vendor.fullName,
      status: "Requested",
      bookingId: booking._id,
      note: `Request dispatched by admin on ${new Date().toISOString().split("T")[0]}`,
    };
    if (allocIdx >= 0) event.allocatedVendors[allocIdx] = allocItem;
    else event.allocatedVendors.push(allocItem);

    event.recalculateStatus();
    await event.save();

    // 1. Single deduplicated Vendor notification (in-app + automated WhatsApp if opted in)
    emitNotification({
      userId: vendor._id,
      type: "alert",
      title: "New Service Request 🔔",
      message: `EVORA Admin requested your ${service.category} service for "${event.title}" on ${event.date} (${event.location || "Venue"}). Proposed price: ₹${booking.proposedPrice}. Please review and Accept or Decline.`,
      link: "/vendor/requests",
      idempotencyKey: `vendor-service-req:${booking._id}:vendor:${vendor._id}`,
      bookingId: booking._id,
      eventId: event._id,
      eventName: event.title,
      templateKey: "VENDOR_NEW_REQUEST",
    }).catch(() => {});

    // 2. If this was an alternative vendor search, notify the User
    if (["Alternative Search Requested", "Unavailable", "Vendor Search in Progress"].includes(previousServiceStatus)) {
      const hostId = event.organizerId?._id || event.organizerId;
      if (hostId) {
        emitNotification({
          userId: hostId,
          type: "info",
          title: `Alternative Vendor Requested: ${service.category} 🔄`,
          message: `EVORA Admin has sent an alternative ${service.category} service request to ${vendor.fullName} for "${event.title}". We will notify you once they respond.`,
          link: `/user/events/${event._id}`,
          idempotencyKey: `alt-vendor-search:${booking._id}:user:${hostId}`,
          bookingId: booking._id,
          eventId: event._id,
          eventName: event.title,
        }).catch(() => {});
      }
    }

    res.status(200).json({
      success: true,
      message: `Service request successfully dispatched to ${vendor.fullName} for ${service.category}.`,
      booking,
      service,
      eventStatus: event.status,
    });
  } catch (err) { next(err); }
};

// @desc    Admin confirms vendor assignment (Only Admin can confirm the final assignment)
// @route   POST /api/events/:id/services/:category/confirm-assignment
// @access  Private (Admin only)
exports.confirmVendorAssignment = async (req, res, next) => {
  try {
    const { vendorId, agreedPrice, assignmentNotes } = req.body;
    const category = req.params.category;

    const event = await Event.findById(req.params.id).populate("organizerId", "fullName email phone");
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    ensureEventRequestedServices(event);

    const service = event.requestedServices.find(
      (s) => s.category.toLowerCase() === category.toLowerCase()
    );
    if (!service) {
      return res.status(404).json({ success: false, message: `Service category "${category}" not found in event.` });
    }

    const User = require("../models/User");
    const Booking = require("../models/Booking");
    const VendorAvailability = require("../models/VendorAvailability");

    const effectiveVendorId = vendorId || service.assignedVendorId;
    if (!effectiveVendorId) {
      return res.status(400).json({ success: false, message: "vendorId is required to confirm assignment." });
    }

    const vendor = await User.findById(effectiveVendorId);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found." });

    // Validate no conflicting bookings
    const avail = await VendorAvailability.findOne({ vendorId: vendor._id });
    if (avail) {
      if (avail.blockedDates && avail.blockedDates.includes(event.date)) {
        return res.status(400).json({
          success: false,
          message: `${vendor.fullName} has blocked date ${event.date}. Cannot confirm conflicting assignment.`,
        });
      }
      const activeBookings = await Booking.countDocuments({
        vendorId: vendor._id,
        eventDate: event.date,
        status: { $in: ["Confirmed", "Confirmed by Admin"] },
        eventId: { $ne: event._id },
      });
      if (activeBookings >= (avail.capacityPerDay || 1)) {
        return res.status(400).json({
          success: false,
          message: `${vendor.fullName} already has confirmed bookings at capacity (${activeBookings}/${avail.capacityPerDay}) on ${event.date}.`,
        });
      }
    }

    // Find and update Booking to Confirmed
    let booking = null;
    if (service.activeBookingId) {
      booking = await Booking.findById(service.activeBookingId);
    }
    if (!booking) {
      booking = await Booking.findOne({
        eventId: event._id,
        vendorId: vendor._id,
        serviceCategory: new RegExp(service.category, "i"),
      });
    }

    const finalAgreedPrice = Number(agreedPrice) || (booking ? booking.proposedPrice : 0) || service.targetBudget || 0;
    const finalNotes = assignmentNotes || (booking ? booking.assignmentNotes : "") || "";

    if (booking) {
      booking.status = "Confirmed";
      booking.totalPrice = finalAgreedPrice;
      booking.assignmentNotes = finalNotes;
      await booking.save();
    } else {
      booking = await Booking.create({
        organizerId: event.organizerId?._id || event.organizerId,
        organizer: event.organizerId?.fullName || "EVORA Host",
        vendorId: vendor._id,
        eventId: event._id,
        serviceCategory: service.category,
        eventName: event.title,
        serviceName: `${service.category} Service`,
        eventDate: event.date,
        eventVenue: event.venue || event.location || "Celebration Hall",
        guestCount: event.guestCount || 0,
        totalPrice: finalAgreedPrice,
        assignmentNotes: finalNotes,
        status: "Confirmed",
        notes: `Confirmed by EVORA Admin. Agreed price: ₹${finalAgreedPrice}. Notes: ${finalNotes}`,
      });
    }

    // Update service
    service.status = "Confirmed";
    service.assignedVendorId = vendor._id;
    service.assignedVendorName = vendor.fullName;
    service.agreedPrice = finalAgreedPrice;
    service.assignmentNotes = finalNotes;
    service.activeBookingId = booking._id;

    // Update legacy allocatedVendors
    event.allocatedVendors = event.allocatedVendors || [];
    const allocIdx = event.allocatedVendors.findIndex((a) => a.category.toLowerCase() === service.category.toLowerCase());
    const allocItem = {
      category: service.category,
      vendorId: vendor._id,
      vendorName: vendor.fullName,
      status: "Assigned",
      bookingId: booking._id,
      assignedAt: new Date(),
      note: `Confirmed by admin at agreed price ₹${finalAgreedPrice}`,
    };
    if (allocIdx >= 0) event.allocatedVendors[allocIdx] = allocItem;
    else event.allocatedVendors.push(allocItem);

    event.recalculateStatus();
    await event.save();

    // 1. Notify Host: Vendor assignment confirmed (in-app + automated WhatsApp if opted in)
    const hostId = event.organizerId?._id || event.organizerId;
    emitNotification({
      userId: hostId,
      type: "success",
      title: "Vendor Assignment Confirmed ✨",
      message: `Your ${service.category} service for "${event.title}" on ${event.date} has been confirmed with ${vendor.fullName} at ₹${finalAgreedPrice}.`,
      link: `/user/events/${event._id}`,
      idempotencyKey: `confirm-assignment:${booking._id}:user:${hostId}`,
      bookingId: booking._id,
      eventId: event._id,
      eventName: event.title,
      bookingRef: "EVR-" + booking._id.toString().slice(-6).toUpperCase(),
      templateKey: "BOOKING_CONFIRMED",
    }).catch(() => {});

    // 2. Notify Vendor: Assignment confirmed
    emitNotification({
      userId: vendor._id,
      type: "success",
      title: "Assignment Confirmed 🎉",
      message: `EVORA Admin officially confirmed your ${service.category} assignment for celebration "${event.title}" on ${event.date}. Agreed price: ₹${finalAgreedPrice}.`,
      link: "/vendor/requests",
      idempotencyKey: `confirm-assignment:${booking._id}:vendor:${vendor._id}`,
      bookingId: booking._id,
      eventId: event._id,
      eventName: event.title,
      bookingRef: "EVR-" + booking._id.toString().slice(-6).toUpperCase(),
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `${service.category} assignment officially confirmed with ${vendor.fullName}.`,
      service,
      booking,
      eventStatus: event.status,
    });
  } catch (err) { next(err); }
};

// @desc    Admin marks an individual service as Unavailable (does NOT cancel other confirmed services)
// @route   POST /api/events/:id/services/:category/mark-unavailable
// @access  Private (Admin only)
exports.markServiceUnavailable = async (req, res, next) => {
  try {
    const { adminNotes = "" } = req.body;
    const category = req.params.category;

    const event = await Event.findById(req.params.id).populate("organizerId", "fullName email phone");
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    ensureEventRequestedServices(event);

    const service = event.requestedServices.find(
      (s) => s.category.toLowerCase() === category.toLowerCase()
    );
    if (!service) {
      return res.status(404).json({ success: false, message: `Service category "${category}" not found in event.` });
    }

    const note = adminNotes.trim() || `No registered artisan is available for ${service.category} on ${event.date}.`;

    service.status = "Unavailable";
    service.assignmentNotes = note;
    service.userDecision = "None";

    // Maintain other confirmed services intact!
    event.recalculateStatus();
    await event.save();

    // Notify Host with resolution options
    const hostId = event.organizerId?._id || event.organizerId;
    const stamp = Date.now();
    emitNotification({
      userId: hostId,
      type: "warning",
      title: "Service Unavailable Notice ⚠️",
      message: `Artisan for ${service.category} is unavailable on ${event.date} for "${event.title}". All other confirmed services remain active. Please choose whether to proceed without this service, search alternatives, or cancel it.`,
      link: `/user/events/${event._id}`,
      idempotencyKey: `service-unavailable:${event._id}:${service.category}:${stamp}:user:${hostId}`,
      eventId: event._id,
      eventName: event.title,
    }).catch(() => {});

    // Notify Admins about service availability issue
    notifyAdmins({
      type: "alert",
      title: `Service Availability Issue: ${service.category} ⚠️`,
      message: `${service.category} was marked Unavailable on ${event.date} for "${event.title}". Host has been notified to choose resolution.`,
      link: "/admin/events",
      idempotencyPrefix: `service-unavailable:${event._id}:${service.category}:${stamp}`,
      eventId: event._id,
      eventName: event.title,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `${service.category} marked as Unavailable. Host has been notified with resolution options.`,
      service,
      eventStatus: event.status,
    });
  } catch (err) { next(err); }
};

// @desc    User resolves an unavailable service (Proceed Without, Search Alternative, Cancel Service)
// @route   POST /api/events/:id/services/:category/resolve-unavailable
// @access  Private (Host only)
exports.resolveUnavailableService = async (req, res, next) => {
  try {
    const { decision, notes = "" } = req.body;
    const category = req.params.category;

    const allowedDecisions = ["Proceed Without", "Search Alternative", "Cancel Service"];
    if (!allowedDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: `Invalid decision. Must be one of: ${allowedDecisions.join(", ")}`,
      });
    }

    const event = await Event.findById(req.params.id).populate("organizerId", "fullName email phone");
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    // Enforce authorization: only the event host can resolve
    if (String(event.organizerId?._id || event.organizerId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Only the event host can resolve service options." });
    }

    ensureEventRequestedServices(event);

    const service = event.requestedServices.find(
      (s) => s.category.toLowerCase() === category.toLowerCase()
    );
    if (!service) {
      return res.status(404).json({ success: false, message: `Service category "${category}" not found in event.` });
    }

    service.userDecision = decision;

    if (decision === "Proceed Without") {
      // User proceeds without this service - mark service Cancelled by User, other confirmed services remain!
      service.status = "Cancelled by User";
      service.assignmentNotes = notes ? `Host decided to proceed without: ${notes}` : "Host decided to proceed without this service.";
    } else if (decision === "Search Alternative") {
      // User requests alternative search
      service.status = "Alternative Search Requested";
      service.assignmentNotes = notes ? `Host requested alternative: ${notes}` : "Host requested alternative artisan search.";
    } else if (decision === "Cancel Service") {
      service.status = "Cancelled by User";
      service.assignmentNotes = notes ? `Host cancelled service: ${notes}` : "Host cancelled this service.";
    }

    event.recalculateStatus();
    await event.save();

    // 1. Notify Admins about user's decision
    const resolutionStamp = Date.now();
    notifyAdmins({
      type: "info",
      title: "User Service Resolution 🔔",
      message: `${req.user.fullName || "Host"} chose "${decision}" for ${service.category} on celebration "${event.title}".`,
      link: `/admin/events`,
      idempotencyPrefix: `service-resolution:${event._id}:${service.category}:${resolutionStamp}`,
      eventId: event._id,
      eventName: event.title,
    }).catch(() => {});

    // 2. Notify Host confirmation (including alternative search confirmation)
    emitNotification({
      userId: req.user._id,
      type: "success",
      title: decision === "Search Alternative"
        ? `Alternative Vendor Search Initiated: ${service.category} 🔍`
        : "Service Resolution Saved ✓",
      message: decision === "Search Alternative"
        ? `We have logged your request to search for an alternative ${service.category} vendor for "${event.title}". Our team will update you automatically.`
        : `Your choice to "${decision}" for ${service.category} has been saved for "${event.title}".`,
      link: `/user/events/${event._id}`,
      idempotencyKey: `service-resolution:${event._id}:${service.category}:${resolutionStamp}:user:${req.user._id}`,
      eventId: event._id,
      eventName: event.title,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Decision "${decision}" saved successfully for ${service.category}.`,
      service,
      eventStatus: event.status,
    });
  } catch (err) { next(err); }
};

// @desc    Get vendor availability and acceptance status across required categories for an event
// @route   GET /api/events/:id/vendor-availability
// @access  Private (admin only)
exports.getEventVendorReadiness = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate("organizerId", "fullName email phone");
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    const eventDate = event.date;
    const cat = (event.category || "").toLowerCase();

    // 1. Determine requested/required categories: respect user's explicit selection
    let requiredCategories = Array.isArray(event.requiredServices) && event.requiredServices.length
      ? event.requiredServices
      : ["Catering", "Venue", "Decoration", "Photography"];

    const exclusions = event.featureExclusions || [];

    const User = require("../models/User");
    const Service = require("../models/Service");
    const Booking = require("../models/Booking");
    const VendorAvailability = require("../models/VendorAvailability");

    const categoriesReadiness = [];

    for (const category of requiredCategories) {
      const isExcluded = exclusions.includes(category);

      let categoryRegex = new RegExp(category, "i");
      if (category === "Venue") categoryRegex = /venue|hall|lawn|resort/i;
      if (category === "Photography") categoryRegex = /photo|video|candid/i;
      if (category === "Decoration") categoryRegex = /decor|floral|stage/i;
      if (category === "Sound & DJ" || category === "Music & DJ") categoryRegex = /sound|music|dj|audio/i;
      if (category === "Makeup & Styling") categoryRegex = /makeup|styling|mehendi|beauty/i;

      // Find services with this category
      const services = await Service.find({ category: categoryRegex }).populate("vendorId");

      // Also find users with role vendor and matching serviceType
      const vendorsFromUsers = await User.find({
        role: "vendor",
        $or: [
          { serviceType: categoryRegex },
          { _id: { $in: services.map((s) => s.vendorId?._id).filter(Boolean) } },
        ],
      });

      // Deduplicate vendors
      const vendorMap = new Map();
      for (const v of vendorsFromUsers) {
        vendorMap.set(String(v._id), v);
      }
      for (const s of services) {
        if (s.vendorId && s.vendorId._id) {
          vendorMap.set(String(s.vendorId._id), s.vendorId);
        }
      }

      const vendorList = Array.from(vendorMap.values());
      const vendorDetails = [];
      let categoryHasAcceptedVendor = false;
      let categoryHasAvailableVendor = false;
      let categoryHasPendingRequest = false;

      for (const vendor of vendorList) {
        const avail = await VendorAvailability.findOne({ vendorId: vendor._id });
        const blockedDates = avail?.blockedDates || [];
        const isBlocked = blockedDates.includes(eventDate);
        const capacityPerDay = avail?.capacityPerDay || 1;

        // Count active bookings on this date (excluding cancelled/rejected and this event)
        const activeBookings = await Booking.countDocuments({
          vendorId: vendor._id,
          eventDate,
          status: { $in: ["Accepted", "Confirmed"] },
          eventId: { $ne: event._id },
        });

        const isAvailable = !isBlocked && activeBookings < capacityPerDay;
        if (isAvailable) categoryHasAvailableVendor = true;

        // Check if there is an existing booking for this event and vendor
        const existingBooking = await Booking.findOne({
          eventId: event._id,
          vendorId: vendor._id,
        });

        const bookingStatus = existingBooking?.status || "None";
        const isAccepted = bookingStatus === "Accepted" || bookingStatus === "Confirmed";
        const isRequested = bookingStatus === "Pending" || bookingStatus === "Proposal Sent";
        const isDeclined = bookingStatus === "Declined" || bookingStatus === "Rejected";

        if (isAccepted) categoryHasAcceptedVendor = true;
        if (isRequested) categoryHasPendingRequest = true;

        vendorDetails.push({
          vendorId: vendor._id,
          fullName: vendor.fullName,
          businessName: vendor.businessName || vendor.fullName,
          email: vendor.email,
          phone: vendor.phone,
          serviceType: vendor.serviceType || category,
          isAvailable,
          isBlocked,
          capacityPerDay,
          activeBookings,
          bookingId: existingBooking?._id || null,
          bookingStatus,
          isAccepted,
          isRequested,
          isDeclined,
        });
      }

      let categoryStatus = "Awaiting Request";
      if (isExcluded) {
        categoryStatus = "Excluded (Host Notified)";
      } else if (categoryHasAcceptedVendor) {
        categoryStatus = "Vendor Accepted ✓";
      } else if (categoryHasPendingRequest) {
        categoryStatus = "Request Sent (Awaiting Response)";
      } else if (!categoryHasAvailableVendor && vendorList.length > 0) {
        categoryStatus = "Vendors Unavailable on Date";
      } else if (vendorList.length === 0) {
        categoryStatus = "No Registered Vendors";
      }

      categoriesReadiness.push({
        category,
        isRequired: !isExcluded,
        isExcluded,
        status: categoryStatus,
        isAccepted: categoryHasAcceptedVendor,
        hasAvailableVendor: categoryHasAvailableVendor,
        vendors: vendorDetails,
      });
    }

    // A category is satisfied if it is accepted OR if it has been formally excluded with a note to host
    const nonExcludedCategories = categoriesReadiness.filter((c) => !c.isExcluded);
    const allAccepted = nonExcludedCategories.every((c) => c.isAccepted);
    const missingAcceptedCategories = nonExcludedCategories.filter((c) => !c.isAccepted).map((c) => c.category);

    res.status(200).json({
      success: true,
      eventId: event._id,
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location || event.venue || "Hyderabad",
      eventCategory: event.category,
      guestCount: event.guestCount || 0,
      hostName: event.organizerId?.fullName || "Valued Host",
      hostPhone: event.organizerId?.phone || "",
      requiredServices: event.requiredServices,
      featureExclusions: event.featureExclusions || [],
      adminNoteToHost: event.adminNoteToHost || "",
      partialApprovalStatus: event.partialApprovalStatus || "None",
      allAccepted,
      missingAcceptedCategories,
      categories: categoriesReadiness,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin sends an event booking request to a vendor
// @route   POST /api/events/:id/send-vendor-request
// @access  Private (admin only)
exports.sendVendorRequest = async (req, res, next) => {
  try {
    const { vendorId, category } = req.body;
    if (!vendorId) return res.status(400).json({ success: false, message: "vendorId is required." });

    const event = await Event.findById(req.params.id).populate("organizerId", "fullName email phone");
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    const User = require("../models/User");
    const Booking = require("../models/Booking");
    const Service = require("../models/Service");

    const vendor = await User.findById(vendorId);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found." });

    const service = await Service.findOne({ vendorId });

    // Find or create booking with status "Pending"
    let booking = await Booking.findOne({ eventId: event._id, vendorId });
    if (booking) {
      booking.status = "Pending";
      booking.eventDate = event.date;
      booking.guestCount = event.guestCount || 0;
      await booking.save();
    } else {
      booking = await Booking.create({
        organizerId: event.organizerId._id || event.organizerId,
        organizer: event.organizerId?.fullName || "EVORA Host",
        vendorId,
        eventId: event._id,
        serviceId: service?._id || null,
        eventName: event.title,
        serviceName: service?.name || `${category || vendor.serviceType || "Artisan"} Service`,
        eventDate: event.date,
        eventVenue: event.venue || event.location || "Celebration Hall",
        guestCount: event.guestCount || 0,
        status: "Pending",
        notes: `Booking request sent by EVORA Admin for celebration "${event.title}". Please accept or decline in your portal.`,
      });
    }

    // Update event.allocatedVendors
    const existingAllocIndex = (event.allocatedVendors || []).findIndex(
      (a) => a.category === (category || vendor.serviceType)
    );
    const allocEntry = {
      category: category || vendor.serviceType || "Service",
      vendorId: vendor._id,
      vendorName: vendor.fullName,
      status: "Requested",
      bookingId: booking._id,
      note: `Request dispatched by admin on ${new Date().toISOString().split("T")[0]}`,
    };

    if (existingAllocIndex >= 0) {
      event.allocatedVendors[existingAllocIndex] = allocEntry;
    } else {
      event.allocatedVendors = event.allocatedVendors || [];
      event.allocatedVendors.push(allocEntry);
    }
    await event.save();

    // Single deduplicated notification to vendor (in-app + automated WhatsApp if opted in)
    emitNotification({
      userId: vendor._id,
      type: "alert",
      title: "New Celebration Assignment Request 🔔",
      message: `EVORA Admin has requested your ${category || vendor.serviceType} services for "${event.title}" on ${event.date} (${event.location || "Venue"}). Headcount: ${event.guestCount}. Please review and Accept or Decline.`,
      link: "/vendor/requests",
      idempotencyKey: `legacy-vendor-req:${booking._id}:vendor:${vendor._id}`,
      bookingId: booking._id,
      eventId: event._id,
      eventName: event.title,
      templateKey: "VENDOR_NEW_REQUEST",
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Request successfully transmitted to ${vendor.fullName} (${category || vendor.serviceType}). Notification sent.`,
      booking,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin notifies host about unavailable feature and sets partial feature approval
// @route   POST /api/events/:id/partial-feature-update
// @access  Private (admin only)
exports.updateFeatureExclusion = async (req, res, next) => {
  try {
    const { category, adminNote = "", exclude = true } = req.body;
    if (!category) return res.status(400).json({ success: false, message: "category is required." });

    const event = await Event.findById(req.params.id).populate("organizerId", "fullName email phone");
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    event.featureExclusions = event.featureExclusions || [];
    if (exclude) {
      if (!event.featureExclusions.includes(category)) {
        event.featureExclusions.push(category);
      }
      event.partialApprovalStatus = "Partial";
    } else {
      event.featureExclusions = event.featureExclusions.filter((c) => c !== category);
      if (event.featureExclusions.length === 0) {
        event.partialApprovalStatus = "Full";
      }
    }

    const defaultNote = `Our verified artisan for ${category} is unavailable on ${event.date}. We are proceeding with all remaining confirmed features (${(event.requiredServices || []).filter((c) => !event.featureExclusions.includes(c)).join(", ")}).`;
    event.adminNoteToHost = adminNote.trim() || defaultNote;
    await event.save();

    // Single deduplicated Host notification (in-app + automated WhatsApp if opted in)
    const hostId = event.organizerId._id || event.organizerId;
    emitNotification({
      userId: hostId,
      type: "warning",
      title: "Celebration Feature Allocation Update 📋",
      message: event.adminNoteToHost,
      link: `/user/events/${event._id}`,
      idempotencyKey: `feature-exclusion:${event._id}:${category}:${Date.now()}:user:${hostId}`,
      eventId: event._id,
      eventName: event.title,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Host notified regarding ${category}. Event updated with partial feature status.`,
      event,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin assigns an accepted vendor to an event and verifies allocation
// @route   POST /api/events/:id/assign-vendor
// @access  Private (admin only)
exports.assignVendorToEvent = async (req, res, next) => {
  try {
    const { vendorId, category, action = "accept" } = req.body;
    if (!vendorId) return res.status(400).json({ success: false, message: "vendorId is required." });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    const User = require("../models/User");
    const Booking = require("../models/Booking");
    const VendorAvailability = require("../models/VendorAvailability");
    const Service = require("../models/Service");

    const vendor = await User.findById(vendorId);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found." });

    // Check availability on event date
    const avail = await VendorAvailability.findOne({ vendorId });
    if (avail && avail.blockedDates && avail.blockedDates.includes(event.date)) {
      return res.status(400).json({
        success: false,
        message: `${vendor.fullName} is marked BLOCKED on ${event.date}. Cannot assign.`,
      });
    }

    const service = await Service.findOne({ vendorId });

    // Find or create booking
    let booking = await Booking.findOne({ eventId: event._id, vendorId });
    const targetStatus = action === "accept" ? "Accepted" : "Proposal Sent";

    if (booking) {
      booking.status = targetStatus;
      booking.eventDate = event.date;
      await booking.save();
    } else {
      const organizer = await User.findById(event.organizerId);
      booking = await Booking.create({
        organizerId: event.organizerId,
        organizer: organizer?.fullName || "Organizer",
        vendorId,
        eventId: event._id,
        serviceId: service?._id || null,
        eventName: event.title,
        serviceName: service?.name || `${category || vendor.serviceType || "Vendor"} Service`,
        eventDate: event.date,
        eventVenue: event.venue || event.location || "",
        guestCount: event.guestCount || 0,
        status: targetStatus,
        notes: `Assigned & verified by EVORA Admin for celebration "${event.title}".`,
      });
    }

    // Update allocatedVendors in event
    event.allocatedVendors = event.allocatedVendors || [];
    const idx = event.allocatedVendors.findIndex((a) => a.category === (category || vendor.serviceType));
    const allocEntry = {
      category: category || vendor.serviceType || "Service",
      vendorId: vendor._id,
      vendorName: vendor.fullName,
      status: "Assigned",
      bookingId: booking._id,
      assignedAt: new Date(),
    };
    if (idx >= 0) {
      event.allocatedVendors[idx] = allocEntry;
    } else {
      event.allocatedVendors.push(allocEntry);
    }
    await event.save();

    res.status(200).json({
      success: true,
      message: `${vendor.fullName} (${category || vendor.serviceType}) assigned and locked for celebration.`,
      booking,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin approves an event and dispatches real WhatsApp notification to the host
// @route   PUT /api/events/:id/approve or PUT /api/admin/events/:id/approve
// @access  Private (admin only)
exports.approveEvent = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admin role required." });
    }

    const event = await Event.findById(req.params.id).populate("organizerId", "fullName email phone whatsappOptIn");
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    const Booking = require("../models/Booking");
    const { forceApprove = false } = req.body;

    // Remaining required categories = event.requiredServices excluding featureExclusions
    const exclusions = event.featureExclusions || [];
    const baseRequired = Array.isArray(event.requiredServices) && event.requiredServices.length
      ? event.requiredServices
      : ["Catering", "Decoration", "Photography"];
    const activeRequired = baseRequired.filter((c) => !exclusions.includes(c));

    // Check vendor acceptance enforcement on activeRequired
    const acceptedBookings = await Booking.find({
      eventId: event._id,
      status: { $in: ["Accepted", "Confirmed"] },
    }).populate("vendorId", "fullName businessName serviceType");

    if (!forceApprove && activeRequired.length > 0 && acceptedBookings.length === 0) {
      return res.status(400).json({
        success: false,
        requiresVendorAcceptance: true,
        message: `Cannot approve celebration "${event.title}": Required artisans for [${activeRequired.join(", ")}] have not accepted yet. Admin can send requests to artisans or exclude unavailable features with a note to the host.`,
      });
    }

    // Upgrade all accepted bookings to Confirmed
    await Booking.updateMany(
      { eventId: event._id, status: "Accepted" },
      { $set: { status: "Confirmed" } }
    );

    event.status = "Approved";
    event.approvedAt = new Date();
    event.approvedBy = req.user._id;
    await event.save();

    // Trigger automated WhatsApp celebration confirmation (respects opt-in + idempotency)
    await sendEventApprovalWhatsApp(event._id);

    // Emit in-app alert to host (sendWhatsApp: false to prevent duplicate WhatsApp message)
    const notifMsg = event.adminNoteToHost 
      ? `Your celebration "${event.title}" is approved! Service notice: ${event.adminNoteToHost}`
      : `Your celebration "${event.title}" has been approved. All artisan schedules are confirmed!`;

    emitNotification({
      userId: event.organizerId._id || event.organizerId,
      type: "success",
      title: "Celebration Approved & Assured by EVORA! 🎉",
      message: notifMsg,
      link: `/user/events/${event._id}`,
      idempotencyKey: `event-approved-inapp:${event._id}`,
      eventId: event._id,
      eventName: event.title,
      sendWhatsApp: false,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Event "${event.title}" approved and artisan schedules locked!`,
      event,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel an event (by host or admin)
// @route   PUT /api/events/:id/cancel
// @access  Private (host or admin)
exports.cancelEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    if (req.user.role !== "admin" && String(event.organizerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied. Only the host or admin can cancel this celebration." });
    }

    if (event.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Event is already cancelled." });
    }

    event.status = "Cancelled";
    await event.save();

    // Notify host
    emitNotification({
      userId: event.organizerId,
      type: "alert",
      title: "Celebration Cancelled ⚠️",
      message: `Your event "${event.title}" scheduled for ${event.date} has been marked as Cancelled.`,
      link: `/user/events/${event._id}`,
      idempotencyKey: `event-cancelled:${event._id}:user:${event.organizerId}`,
      eventId: event._id,
      eventName: event.title,
    }).catch(() => {});

    // Notify allocated vendors of cancellation
    const Booking = require("../models/Booking");
    const activeBookings = await Booking.find({
      eventId: event._id,
      status: { $nin: ["Cancelled", "Declined", "Rejected"] },
    });
    for (const b of activeBookings) {
      b.status = "Cancelled";
      b.cancellationReason = "Event cancelled";
      await b.save();
      emitNotification({
        userId: b.vendorId,
        type: "alert",
        title: `Event Request Cancelled: ${event.title} ⚠️`,
        message: `Celebration "${event.title}" scheduled for ${event.date} has been cancelled. Your service request is no longer active.`,
        link: "/vendor/bookings",
        idempotencyKey: `event-cancelled:${event._id}:vendor:${b.vendorId}:${b._id}`,
        bookingId: b._id,
        eventId: event._id,
        eventName: event.title,
      }).catch(() => {});
    }

    // Notify assigned volunteers
    const Task = require("../models/Task");
    const tasks = await Task.find({ eventId: event._id, status: { $ne: "Completed" } }).select("volunteerId");
    const volIds = [...new Set(tasks.map((t) => String(t.volunteerId)))];
    for (const volId of volIds) {
      emitNotification({
        userId: volId,
        type: "warning",
        title: `Volunteer Duty Cancelled: ${event.title} ⚠️`,
        message: `Celebration "${event.title}" on ${event.date} has been cancelled. Your assigned duties for this event have been stood down.`,
        link: "/volunteer/tasks",
        idempotencyKey: `event-cancelled:${event._id}:volunteer:${volId}`,
        eventId: event._id,
        eventName: event.title,
      }).catch(() => {});
    }

    // Notify Admins
    notifyAdmins({
      type: "alert",
      title: `Event Cancelled: ${event.title} ⚠️`,
      message: `Event "${event.title}" (${event.date}) was cancelled.`,
      link: "/admin/events",
      idempotencyPrefix: `event-cancelled:${event._id}`,
      eventId: event._id,
      eventName: event.title,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Event "${event.title}" has been cancelled.`,
      event,
    });
  } catch (err) { next(err); }
};
