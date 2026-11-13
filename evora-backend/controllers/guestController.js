const Guest = require("../models/Guest");
const Event = require("../models/Event");
const { emitNotification } = require("../services/notificationService");
const { sendWhatsAppNotification, cleanPhoneNumber, buildWhatsAppLink } = require("../services/whatsappService");
const { validateIndianPhone, validateEmail } = require("../utils/validators");

// @desc    Get guests for an event + summary
// @route   GET /api/events/:id/guests
// @access  Private (Owner / Admin)
exports.getEventGuests = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (req.user.role !== "admin" && String(event.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized to access guests for this event" });
    }

    const guests = await Guest.find({ eventId: event._id }).sort({ createdAt: -1 });

    const total = guests.length;
    const confirmed = guests.filter((g) => g.status === "Confirmed").length;
    const declined = guests.filter((g) => g.status === "Declined").length;
    const pending = guests.filter((g) => g.status === "Invited").length;
    const maybe = guests.filter((g) => g.status === "Maybe").length;
    const totalPlusOnes = guests.reduce((sum, g) => (g.status === "Confirmed" ? sum + (g.plusOnes || 0) : sum), 0);
    const expectedHeadcount = confirmed + totalPlusOnes;

    res.json({
      success: true,
      data: guests,
      summary: {
        total,
        confirmed,
        declined,
        pending,
        maybe,
        totalPlusOnes,
        expectedHeadcount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a single guest
// @route   POST /api/events/:id/guests
// @access  Private (Owner / Admin)
exports.addGuest = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (req.user.role !== "admin" && String(event.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized to add guests to this event" });
    }

    const { name, email, phone, group, plusOnes, dietaryNotes } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Guest name must be at least 2 characters." });
    }

    if (phone) {
      const phoneValidation = validateIndianPhone(phone, { allowLandline: false });
      if (!phoneValidation.isValid) {
        return res.status(400).json({ success: false, message: phoneValidation.error });
      }
    }

    if (email) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({ success: false, message: emailValidation.error });
      }
    }

    const guest = await Guest.create({
      eventId: event._id,
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : "",
      phone: phone ? validateIndianPhone(phone).digits : "",
      group: group || "General Guests",
      plusOnes: Math.max(0, Number(plusOnes) || 0),
      dietaryNotes: dietaryNotes || "",
    });

    res.status(201).json({ success: true, data: guest });
  } catch (err) {
    next(err);
  }
};

// @desc    Batch import guests
// @route   POST /api/events/:id/guests/import
// @access  Private (Owner / Admin)
exports.importGuests = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (req.user.role !== "admin" && String(event.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const { guests } = req.body;
    if (!Array.isArray(guests) || guests.length === 0) {
      return res.status(400).json({ success: false, message: "Please provide an array of guests to import" });
    }

    const docs = guests
      .filter((g) => g && g.name && g.name.trim())
      .map((g) => ({
        eventId: event._id,
        name: g.name.trim(),
        email: g.email ? g.email.trim() : "",
        phone: g.phone ? g.phone.trim() : "",
        group: g.group || "General Guests",
        plusOnes: Number(g.plusOnes) || 0,
        dietaryNotes: g.dietaryNotes || "",
      }));

    const inserted = await Guest.insertMany(docs);
    res.status(201).json({ success: true, count: inserted.length, data: inserted });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete guest
// @route   DELETE /api/events/:id/guests/:guestId
// @access  Private (Owner / Admin)
exports.deleteGuest = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (req.user.role !== "admin" && String(event.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await Guest.findOneAndDelete({ _id: req.params.guestId, eventId: event._id });
    res.json({ success: true, message: "Guest removed successfully" });
  } catch (err) {
    next(err);
  }
};

// @desc    Send digital invite link (WhatsApp / Email helper)
// @route   POST /api/events/:id/guests/:guestId/send-invite
// @access  Private (Owner / Admin)
exports.sendInvite = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const guest = await Guest.findOne({ _id: req.params.guestId, eventId: event._id });
    if (!guest) {
      return res.status(404).json({ success: false, message: "Guest not found" });
    }

    const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";
    const rsvpLink = `${clientOrigin}/rsvp/${guest.rsvpToken}`;

    const inviteMsg =
`✨ *Cordially Invited to ${event.title}* ✨
Dear *${guest.name}*,
You are warmly invited to celebrate with us!

📅 *Date:* ${event.date ? new Date(event.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "TBA"}
📍 *Venue:* ${event.location || "TBA"}

Please let us know if you can join us by clicking your personalized RSVP link:
👉 ${rsvpLink}

With warm regards,
${event.userId ? "The Event Host" : "EVORA Celebrations"}`;

    let whatsappUrl = "";
    if (guest.phone) {
      const cleanPhone = cleanPhoneNumber(guest.phone);
      whatsappUrl = buildWhatsAppLink(cleanPhone, inviteMsg);

      await sendWhatsAppNotification({
        phone: guest.phone,
        title: `Invitation: ${event.title}`,
        message: `You are cordially invited to ${event.title}. Tap below to submit your RSVP.`,
        link: `/rsvp/${guest.rsvpToken}`,
      }).catch((e) => console.warn("WhatsApp invite error:", e.message));
    }

    guest.invitationSent = true;
    await guest.save();

    res.json({
      success: true,
      message: "Invitation prepared",
      rsvpLink,
      whatsappUrl,
      guest,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get public RSVP details by token
// @route   GET /api/guests/rsvp/:token
// @access  Public
exports.getPublicRsvp = async (req, res, next) => {
  try {
    const guest = await Guest.findOne({ rsvpToken: req.params.token });
    if (!guest) {
      return res.status(404).json({ success: false, message: "RSVP invitation link is invalid or has expired" });
    }

    const event = await Event.findById(guest.eventId).select("title date location eventType description");
    if (!event) {
      return res.status(404).json({ success: false, message: "Event details not found" });
    }

    res.json({
      success: true,
      data: {
        guest: {
          name: guest.name,
          status: guest.status,
          plusOnes: guest.plusOnes,
          dietaryNotes: guest.dietaryNotes,
          group: guest.group,
        },
        event: {
          title: event.title,
          date: event.date,
          location: event.location,
          eventType: event.eventType,
          description: event.description,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit public RSVP response
// @route   POST /api/guests/rsvp/:token
// @access  Public
exports.submitPublicRsvp = async (req, res, next) => {
  try {
    const { status, plusOnes, dietaryNotes } = req.body;
    if (!["Confirmed", "Declined", "Maybe"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid RSVP status. Must be Confirmed, Declined, or Maybe" });
    }

    const guest = await Guest.findOne({ rsvpToken: req.params.token });
    if (!guest) {
      return res.status(404).json({ success: false, message: "RSVP link invalid" });
    }

    guest.status = status;
    if (plusOnes !== undefined) guest.plusOnes = Math.max(0, Number(plusOnes) || 0);
    if (dietaryNotes !== undefined) guest.dietaryNotes = String(dietaryNotes).trim();
    guest.respondedAt = new Date();
    await guest.save();

    const event = await Event.findById(guest.eventId);
    if (event && event.userId) {
      emitNotification({
        userId: event.userId,
        type: status === "Confirmed" ? "success" : "info",
        title: `RSVP: ${guest.name} responded ${status}`,
        message: `${guest.name} marked their attendance as ${status}${guest.plusOnes ? ` (+${guest.plusOnes} guest)` : ""}.`,
        link: `/user/events/${event._id}`,
      }).catch((e) => console.warn(e.message));
    }

    res.json({
      success: true,
      message: `Thank you, ${guest.name}! Your RSVP has been confirmed.`,
      guest,
    });
  } catch (err) {
    next(err);
  }
};
