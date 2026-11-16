const Charity = require("../models/Charity");
const DonationRequest = require("../models/DonationRequest");
const Event = require("../models/Event");
const User = require("../models/User");
const {
  geocodeAddress,
  findNearbyCharities,
  calculateDistanceKm,
} = require("../services/locationService");
const {
  rankCharities,
  evaluateFoodSafety,
  generateFallbackExplanation,
} = require("../services/charityRankingService");
const {
  generateCharityRecommendationExplanation,
  generateDonationRequestMessage,
} = require("../services/aiService");
const { emitNotification } = require("../services/notificationService");

// @desc    Register / Validate surplus food submission & geocode venue
// @route   POST /api/charity-ai/surplus
// @access  Private (organizer, admin)
exports.createSurplusRecord = async (req, res, next) => {
  try {
    const {
      eventId,
      eventName,
      eventType,
      venueAddress,
      city = "Hyderabad",
      foodItems = [],
      quantity,
      unit = "plates",
      preparedAt,
      safeUntil,
      pickupType = "pickup",
      packagingAvailable = true,
      contactName,
      contactPhone,
      notes = "",
    } = req.body;

    if (!quantity || !safeUntil || !venueAddress) {
      return res.status(400).json({
        success: false,
        message: "Venue address, food quantity, and safe-until consumption time are required.",
      });
    }

    // Geocode venue address to get longitude & latitude
    const geocoded = await geocodeAddress(venueAddress, city);
    const coordinates = [geocoded.lng, geocoded.lat];

    // Evaluate food safety window
    const foodSafety = evaluateFoodSafety({ safeUntil }, 4);

    return res.status(200).json({
      success: true,
      data: {
        eventId: eventId || null,
        eventName: eventName || "Celebration Feast",
        eventType: eventType || "Wedding",
        venueAddress,
        city,
        coordinates,
        geocodedLocation: geocoded,
        foodItems: Array.isArray(foodItems) && foodItems.length > 0 ? foodItems : [
          { name: "Main Feast Surplus", dietType: "Vegetarian", quantity: Number(quantity), unit },
        ],
        quantity: Number(quantity),
        unit,
        preparedAt: preparedAt ? new Date(preparedAt) : new Date(),
        safeUntil: new Date(safeUntil),
        pickupType,
        packagingAvailable: Boolean(packagingAvailable),
        contactName: contactName || req.user.fullName,
        contactPhone: contactPhone || req.user.phone || "",
        notes,
        foodSafety,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Find nearby charities with MongoDB $geoNear or fallback
// @route   GET /api/charity-ai/nearby
// @access  Private
exports.getNearbyCharities = async (req, res, next) => {
  try {
    const { lat, lng, radius = 25, type = "all", address, city = "Hyderabad" } = req.query;

    let targetLat = lat ? parseFloat(lat) : null;
    let targetLng = lng ? parseFloat(lng) : null;

    if ((targetLat === null || targetLng === null) && address) {
      const geo = await geocodeAddress(address, city);
      targetLat = geo.lat;
      targetLng = geo.lng;
    }

    if (targetLat === null || targetLng === null) {
      // Default to Hyderabad center
      targetLat = 17.4123;
      targetLng = 78.4744;
    }

    const charities = await findNearbyCharities({
      lat: targetLat,
      lng: targetLng,
      radiusInKm: parseFloat(radius),
      type,
    });

    res.status(200).json({
      success: true,
      count: charities.length,
      coordinates: [targetLng, targetLat],
      charities,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Return ranked charities with AI-generated rationale & food safety check
// @route   POST /api/charity-ai/recommend
// @access  Private
exports.recommendCharities = async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      venueAddress,
      city = "Hyderabad",
      radius = 25,
      type = "all",
      quantity = 100,
      unit = "plates",
      preparedAt,
      safeUntil,
      foodItems = [],
      pickupType = "pickup",
    } = req.body;

    let searchLat = lat ? parseFloat(lat) : null;
    let searchLng = lng ? parseFloat(lng) : null;

    if ((searchLat === null || searchLng === null) && venueAddress) {
      const geo = await geocodeAddress(venueAddress, city);
      searchLat = geo.lat;
      searchLng = geo.lng;
    }

    if (searchLat === null || searchLng === null) {
      searchLat = 17.4123;
      searchLng = 78.4744;
    }

    // 1. Fetch nearby charities
    const rawCharities = await findNearbyCharities({
      lat: searchLat,
      lng: searchLng,
      radiusInKm: parseFloat(radius) || 25,
      type,
    });

    if (!rawCharities || rawCharities.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        rankedCharities: [],
        foodSafety: evaluateFoodSafety({ safeUntil }, 5),
        message: "No registered charities found in this search radius. Try expanding the radius.",
      });
    }

    const surplusDetails = {
      quantity: Number(quantity),
      unit,
      preparedAt: preparedAt ? new Date(preparedAt) : new Date(),
      safeUntil: safeUntil ? new Date(safeUntil) : new Date(Date.now() + 4 * 60 * 60 * 1000),
      foodItems,
      pickupType,
    };

    // 2. Deterministic ranking & food safety check
    const rankedCharities = rankCharities(rawCharities, surplusDetails);
    const foodSafety = evaluateFoodSafety(
      surplusDetails,
      rankedCharities[0]?.distanceKm || 3
    );

    // 3. AI-generated explanation for the top 3 recommendations
    const topMatchesCount = Math.min(3, rankedCharities.length);
    for (let i = 0; i < topMatchesCount; i++) {
      const item = rankedCharities[i];
      try {
        const explanation = await generateCharityRecommendationExplanation({
          charity: item,
          surplusDetails,
        });
        item.aiRecommendationReason = explanation;
      } catch {
        item.aiRecommendationReason = generateFallbackExplanation(item, surplusDetails);
      }
    }

    // Fill deterministic fallback for the rest
    for (let i = topMatchesCount; i < rankedCharities.length; i++) {
      rankedCharities[i].aiRecommendationReason = generateFallbackExplanation(
        rankedCharities[i],
        surplusDetails
      );
    }

    res.status(200).json({
      success: true,
      count: rankedCharities.length,
      venueCoordinates: [searchLng, searchLat],
      foodSafety,
      topMatchId: rankedCharities[0]?._id || null,
      rankedCharities,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Send donation request to selected charity (or multiple charities)
// @route   POST /api/charity-ai/request
// @access  Private (organizer, admin)
exports.sendDonationRequest = async (req, res, next) => {
  try {
    const {
      charityIds = [],
      charityId,
      eventId,
      eventName,
      eventType,
      foodItems = [],
      quantity,
      unit = "plates",
      preparedAt,
      safeUntil,
      pickupType = "pickup",
      packagingAvailable = true,
      contactName,
      contactPhone,
      pickupAddress,
      pickupCity = "Hyderabad",
      pickupCoordinates,
      notes = "",
    } = req.body;

    const targets = Array.isArray(charityIds) && charityIds.length > 0 ? charityIds : (charityId ? [charityId] : []);

    if (targets.length === 0) {
      return res.status(400).json({ success: false, message: "Please select at least one charity to send the request." });
    }

    if (!quantity || !safeUntil || !pickupAddress || !contactName || !contactPhone) {
      return res.status(400).json({
        success: false,
        message: "Quantity, safe until time, pickup address, contact name, and contact phone are required.",
      });
    }

    const createdRequests = [];

    for (const cId of targets) {
      const charity = await Charity.findById(cId);
      if (!charity) continue;

      // Draft AI pickup dispatch message
      let aiGeneratedMessage = "";
      try {
        aiGeneratedMessage = await generateDonationRequestMessage({
          charity,
          surplusDetails: { quantity, unit, foodItems, safeUntil, pickupAddress },
          organizerName: contactName,
          eventName: eventName || "Celebration Feast",
        });
      } catch {
        aiGeneratedMessage = `Urgent Surplus Food Donation from ${eventName || "Event"}: ${quantity} ${unit} ready for pickup at ${pickupAddress}.`;
      }

      const donationReq = await DonationRequest.create({
        eventId: eventId || null,
        organizerId: req.user._id,
        charityId: charity._id,
        eventName: eventName || "Celebration Event",
        eventType: eventType || "Wedding",
        foodItems: Array.isArray(foodItems) && foodItems.length > 0 ? foodItems : [
          { name: "Surplus Food", dietType: "Vegetarian", quantity: Number(quantity), unit },
        ],
        quantity: Number(quantity),
        unit,
        preparedAt: preparedAt ? new Date(preparedAt) : new Date(),
        safeUntil: new Date(safeUntil),
        pickupType,
        packagingAvailable: Boolean(packagingAvailable),
        contactName,
        contactPhone,
        pickupAddress,
        pickupCity,
        pickupLocation: {
          type: "Point",
          coordinates: Array.isArray(pickupCoordinates) && pickupCoordinates.length === 2
            ? pickupCoordinates
            : [78.4867, 17.3850],
        },
        notes,
        aiGeneratedMessage,
        status: "pending",
        statusTimeline: [
          {
            status: "pending",
            changedAt: new Date(),
            note: "Donation request submitted by organizer.",
          },
        ],
      });

      // Populate charity details
      const populated = await DonationRequest.findById(donationReq._id)
        .populate("charityId", "name type phone address capacityPerDay acceptsCookedFood location")
        .populate("organizerId", "fullName email phone");

      createdRequests.push(populated);

      // Notify platform volunteers / charity coordinators about incoming donation
      const volunteers = await User.find({
        role: { $in: ["volunteer", "admin"] },
        isActive: true,
      }).select("_id");

      await Promise.all(
        volunteers.map((vol) =>
          emitNotification({
            userId: vol._id,
            type: "alert",
            title: "🍲 Surplus Food Rescue Request!",
            message: `${quantity} ${unit} available from "${eventName || "Event"}" for ${charity.name}. Safe until: ${new Date(safeUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
            link: "/volunteer/donations",
            idempotencyKey: `charity-ai-request:${donationReq._id}:vol:${vol._id}`,
            eventId: eventId || null,
            eventName: eventName || "",
          }).catch(() => {})
        )
      );
    }

    res.status(201).json({
      success: true,
      message: `Donation request dispatched successfully to ${createdRequests.length} recipient(s).`,
      count: createdRequests.length,
      requests: createdRequests,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Charity or Volunteer accepts, declines, marks picked up or delivered
// @route   PATCH /api/charity-ai/request/:id/status
// @access  Private (volunteer, admin, organizer for cancel)
exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { status, note = "", pickupTimeExpected } = req.body;
    const validStatuses = ["pending", "accepted", "declined", "picked_up", "delivered", "expired"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const request = await DonationRequest.findById(req.params.id)
      .populate("charityId")
      .populate("organizerId", "fullName email phone");

    if (!request) {
      return res.status(404).json({ success: false, message: "Donation request not found." });
    }

    // Role check: Organizer can only cancel/expire pending requests; volunteers and admins can accept/decline/deliver
    if (req.user.role === "user" && request.organizerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to update this donation request." });
    }

    request.status = status;
    if (pickupTimeExpected) {
      request.pickupTimeExpected = pickupTimeExpected;
    }

    // Timeline entry
    request.statusTimeline.push({
      status,
      changedAt: new Date(),
      note: note || `Status updated to ${status} by ${req.user.fullName} (${req.user.role}).`,
    });

    if (status === "delivered") {
      request.deliveredAt = new Date();
      // Calculate estimated people served (plates = 1 person; kg = approx 2.5 people per kg)
      if (request.unit === "kg") {
        request.estimatedPeopleServed = Math.round(request.quantity * 2.5);
      } else {
        request.estimatedPeopleServed = Math.round(request.quantity);
      }
    }

    await request.save();

    // Notify organizer about status change
    await emitNotification({
      userId: request.organizerId._id,
      type: status === "declined" ? "warning" : "success",
      title: `Food Donation Update: ${status.replace("_", " ").toUpperCase()}`,
      message: `${request.charityId?.name || "Charity"} has updated the surplus food donation status to "${status.replace("_", " ")}". ${note ? `Note: ${note}` : ""}`,
      link: request.eventId ? `/user/events/${request.eventId}` : "/user/charity-ai",
      idempotencyKey: `charity-ai-status:${request._id}:${status}:${Date.now()}`,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Donation request status updated to "${status}".`,
      request,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get donation history for an event or organizer
// @route   GET /api/charity-ai/history/:eventId
// @access  Private
exports.getDonationHistory = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const filter = {};

    if (eventId && eventId !== "all" && eventId !== "my") {
      filter.eventId = eventId;
    }

    if (req.user.role === "user") {
      filter.organizerId = req.user._id;
    }

    const requests = await DonationRequest.find(filter)
      .populate("charityId", "name type address phone capacityPerDay acceptsCookedFood verified")
      .populate("organizerId", "fullName email phone")
      .sort({ createdAt: -1 });

    const totalDelivered = requests.filter((r) => r.status === "delivered");
    const totalPeopleServed = totalDelivered.reduce((sum, r) => sum + (r.estimatedPeopleServed || 0), 0);
    const totalMealsDonated = requests.reduce((sum, r) => sum + (r.quantity || 0), 0);

    res.status(200).json({
      success: true,
      count: requests.length,
      summary: {
        totalRequests: requests.length,
        deliveredCount: totalDelivered.length,
        totalPeopleServed,
        totalMealsDonated,
      },
      requests,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get incoming donation requests (for volunteers, charities & admins)
// @route   GET /api/charity-ai/incoming
// @access  Private (volunteer, admin, user)
exports.getIncomingRequests = async (req, res, next) => {
  try {
    const { status, charityId } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }
    if (charityId) {
      filter.charityId = charityId;
    }

    // If regular user, only show their own
    if (req.user.role === "user") {
      filter.organizerId = req.user._id;
    }

    const requests = await DonationRequest.find(filter)
      .populate("charityId", "name type address city phone email acceptsCookedFood capacityPerDay verified location")
      .populate("organizerId", "fullName email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single donation request details
// @route   GET /api/charity-ai/request/:id
// @access  Private
exports.getRequestById = async (req, res, next) => {
  try {
    const request = await DonationRequest.findById(req.params.id)
      .populate("charityId")
      .populate("organizerId", "fullName email phone");

    if (!request) {
      return res.status(404).json({ success: false, message: "Donation request not found." });
    }

    res.status(200).json({ success: true, request });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: Get all charities or add new charity
// @route   GET /api/charity-ai/charities
// @access  Private
exports.listCharities = async (req, res, next) => {
  try {
    const { type, verified, city = "Hyderabad" } = req.query;
    const filter = {};
    if (type && type !== "all") filter.type = type;
    if (verified !== undefined) filter.verified = verified === "true";
    if (city) filter.city = new RegExp(city, "i");

    const charities = await Charity.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, count: charities.length, charities });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: Create new charity listing
// @route   POST /api/charity-ai/charities
// @access  Private (admin)
exports.createCharity = async (req, res, next) => {
  try {
    const {
      name,
      type,
      address,
      city = "Hyderabad",
      coordinates, // [lng, lat]
      phone,
      email,
      acceptsCookedFood = true,
      capacityPerDay = 150,
      operatingHours = "08:00 - 22:00",
      description = "",
      contactPerson = "",
      verified = true,
    } = req.body;

    if (!name || !address || !phone) {
      return res.status(400).json({ success: false, message: "Name, address, and phone are required." });
    }

    let finalCoords = coordinates;
    if (!Array.isArray(finalCoords) || finalCoords.length !== 2) {
      const geo = await geocodeAddress(address, city);
      finalCoords = [geo.lng, geo.lat];
    }

    const charity = await Charity.create({
      name,
      type: type || "NGO",
      address,
      city,
      location: {
        type: "Point",
        coordinates: finalCoords,
      },
      phone,
      email: email || "",
      acceptsCookedFood: Boolean(acceptsCookedFood),
      capacityPerDay: Number(capacityPerDay) || 150,
      operatingHours,
      description,
      contactPerson,
      verified: Boolean(verified),
    });

    res.status(201).json({ success: true, charity });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: Update / Verify charity
// @route   PATCH /api/charity-ai/charities/:id
// @access  Private (admin)
exports.updateCharity = async (req, res, next) => {
  try {
    const charity = await Charity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!charity) {
      return res.status(404).json({ success: false, message: "Charity not found." });
    }
    res.status(200).json({ success: true, charity });
  } catch (err) {
    next(err);
  }
};
