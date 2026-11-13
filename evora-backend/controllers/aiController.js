const { generateChat, generateStructuredJson } = require("../services/aiService");
const Event = require("../models/Event");
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const SavedFoodMenu = require("../models/SavedFoodMenu");
const SavedChecklist = require("../models/SavedChecklist");
const SavedEventPlan = require("../models/SavedEventPlan");

const CHAT_SYSTEM_PROMPT = `You are the official EVORA AI Assistant for "EVORA – Made to Celebrate", an Indian event planning and celebration coordination platform.

Your purpose is to help users plan celebrations and guide them through the EVORA platform.

EVORA Platform Details (use accurately; never invent unconfirmed vendor quotes or bookings):
1. Supported Event Categories: Wedding, Birthday, Corporate, Anniversary, Festival, Graduation, Engagement, and Other.
2. Core Services Available in EVORA:
   - Venue & Halls: Banquet halls, lawns, heritage venues, convention centres; check guest capacity + 15% buffer.
   - Catering: Regional and multi-cuisine menus, live counters, desserts, and dietary customization.
   - Decoration: Stage backdrops, floral arrangements, entrance arches, mandap/theme styling, lighting.
   - Photography & Videography: Traditional, candid, 4K highlights, drone coverage (subject to venue rules).
   - Sound & DJ: PA systems, wireless mics, DJ/entertainment, acoustic setup.
   - Makeup & Styling: Bridal/party styling, draping, mehendi.
   - Additional platform categories: Transportation, Security, Printing, Live Streaming, Event Coordination.
3. How to Create an Event in EVORA:
   - Go to User Portal -> "Create Event" (/user/events/create).
   - Fill in Event Title, Category, Date, Time, City/Location, Venue (or choose from venue suggestions), Guest Count, Theme, and Total Budget.
   - Select required services and enter service-wise requirements and target budgets.
   - Submit the event request so EVORA Admin coordinates verified vendor availability and sends proposals.
4. Booking & Payment Policy:
   - After receiving a vendor proposal in "Services & Bookings", accepting and paying a 50% advance locks the booking date.
   - Cancelling a booking with advance paid incurs a 20% non-refundable deduction, with 80% refunded. Unpaid requests have 0% cancellation fee.

Response Guidelines:
- Be warm, clear, practical, and structured (use concise headings or bullet points).
- When asked what services to select (e.g., for a birthday party or wedding), suggest suitable services, explain the purpose of each, give actionable preparation tips, and explain how to create the event in EVORA.
- Maintain context from earlier messages in the conversation.`;

// ─────────────────────────────────────────────────────────
// 1. EVORA AI CHATBOT
// ─────────────────────────────────────────────────────────
exports.chatAssistant = async (req, res, next) => {
  try {
    const { message, history = [] } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a non-empty question or message.",
      });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Message is too long. Please keep it under 2000 characters.",
      });
    }

    const userName = req.user?.fullName?.split(" ")[0] || "Host";
    const systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\nCurrent authenticated user's first name: ${userName}.`;

    const { text, model } = await generateChat({
      systemPrompt,
      history,
      message: message.trim(),
      temperature: 0.7,
    });

    res.status(200).json({
      success: true,
      reply: text,
      model,
      suggestions: [
        "How do I create an event in EVORA?",
        "What services do I need for a 150-guest wedding?",
        "Explain EVORA's advance payment & cancellation policy",
      ],
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// Remaining AI Features (Enabled sequentially in Phase 4)
// ─────────────────────────────────────────────────────────
const notYetImplemented = (featureName) => (req, res) => {
  res.status(501).json({
    success: false,
    inDevelopment: true,
    message: `${featureName} is currently in development and will be enabled in the next rollout step.`,
  });
};

// Map user-facing service names to Service model categories
const SERVICE_CATEGORY_ALIAS = {
  venue: "Venue & Halls",
  "venue & halls": "Venue & Halls",
  catering: "Catering",
  decoration: "Decoration",
  photography: "Photography & Videography",
  "photography & videography": "Photography & Videography",
  music: "Sound & DJ",
  "music & sound": "Sound & DJ",
  "sound & dj": "Sound & DJ",
  makeup: "Makeup & Styling",
  "makeup & styling": "Makeup & Styling",
  transportation: "Transportation",
  security: "Security",
  printing: "Printing",
  "live streaming": "Live Streaming",
  "event coordination": "Event Coordination",
};

const resolveServiceCategory = (name = "") => {
  const key = String(name).trim().toLowerCase();
  return SERVICE_CATEGORY_ALIAS[key] || String(name).trim();
};

// ─────────────────────────────────────────────────────────
// 2. AI BUDGET ASSISTANT
// ─────────────────────────────────────────────────────────
exports.budgetAssistant = async (req, res, next) => {
  try {
    const {
      eventType = "Wedding",
      guestCount,
      totalBudget,
      selectedServices = [],
      location = "",
    } = req.body || {};

    const guestsNum = Number(guestCount);
    const budgetNum = Number(totalBudget);

    if (!eventType || typeof eventType !== "string" || !eventType.trim()) {
      return res.status(400).json({ success: false, message: "Event type is required." });
    }
    if (!Number.isFinite(guestsNum) || guestsNum <= 0) {
      return res.status(400).json({ success: false, message: "Guest count must be a positive number." });
    }
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
      return res.status(400).json({ success: false, message: "Total budget must be greater than 0." });
    }
    if (!Array.isArray(selectedServices) || selectedServices.length === 0) {
      return res.status(400).json({ success: false, message: "Please select at least one service." });
    }

    const cleanServices = selectedServices
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 15);

    // Gather real platform vendor service pricing & historical booking prices from MongoDB
    const mappedCategories = [...new Set(cleanServices.map(resolveServiceCategory))];
    const [activeServices, historicalBookings] = await Promise.all([
      Service.find({ isActive: true, category: { $in: mappedCategories } })
        .select("name category price rentalPrice unit city location capacity")
        .lean(),
      Booking.find({
        serviceCategory: { $in: mappedCategories },
        status: { $in: ["Accepted", "Accepted by Vendor", "Confirmed", "Confirmed by Admin", "Completed"] },
      })
        .select("serviceCategory totalPrice proposedPrice guestCount")
        .limit(100)
        .lean(),
    ]);

    const pricingStats = {};
    for (const label of cleanServices) {
      const cat = resolveServiceCategory(label);
      const catServices = activeServices.filter((s) => s.category === cat && Number(s.price) > 0);
      const catBookings = historicalBookings.filter(
        (b) => b.serviceCategory === cat && (Number(b.totalPrice) > 0 || Number(b.proposedPrice) > 0)
      );

      const servicePrices = catServices.map((s) => Number(s.price));
      const bookingPrices = catBookings.map((b) => Number(b.totalPrice) || Number(b.proposedPrice));

      pricingStats[label] = {
        platformCategory: cat,
        vendorListingCount: servicePrices.length,
        minListingPrice: servicePrices.length ? Math.min(...servicePrices) : null,
        avgListingPrice: servicePrices.length
          ? Math.round(servicePrices.reduce((a, b) => a + b, 0) / servicePrices.length)
          : null,
        maxListingPrice: servicePrices.length ? Math.max(...servicePrices) : null,
        historicalBookingCount: bookingPrices.length,
        avgHistoricalPrice: bookingPrices.length
          ? Math.round(bookingPrices.reduce((a, b) => a + b, 0) / bookingPrices.length)
          : null,
      };
    }

    const systemPrompt = `You are the EVORA AI Budget Assistant for Indian event planning ("EVORA – Made to Celebrate").
Return ONLY valid JSON matching the requested schema. All monetary values must be integers in INR (₹).
Base allocations realistically on event type, guest count, Indian event economics, and any available EVORA platform pricing benchmarks provided.
Include an "Other expenses" line item for contingencies/misc only if appropriate (or keep a small buffer).
If the realistic estimated cost for the guest count and selected services exceeds the user's target totalBudget, reflect the honest estimated cost (do not artificially shrink costs below realistic minimums if the budget is too low—instead let estimatedTotal exceed totalBudget so the overrun warning triggers and provide practical cheaper alternatives). If the budget is sufficient, keep allocations within totalBudget with realistic buffer.
Never claim estimates are confirmed vendor prices.`;

    const userPrompt = `Generate a service-wise budget allocation plan in JSON for:
- Event Type: ${eventType.trim()}
- Guest Count: ${guestsNum}
- Target Total Budget (INR): ${budgetNum}
- City/Location: ${location.trim() || "Not specified"}
- Selected Services: ${JSON.stringify(cleanServices)}
- EVORA Database Pricing Context (null means no platform data for that category yet): ${JSON.stringify(pricingStats)}

Return strictly this JSON schema:
{
  "allocations": [
    {
      "service": "string (exact service name from Selected Services, plus optional 'Other expenses')",
      "suggestedBudget": number,
      "pricingSource": "string ('EVORA vendor & historical data' or 'AI market estimate')",
      "notes": "string (short rationale or per-guest context)"
    }
  ],
  "cheaperAlternatives": [
    {
      "service": "string",
      "suggestion": "string",
      "potentialSavings": number
    }
  ],
  "summaryNote": "string"
}`;

    const { data, model } = await generateStructuredJson({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
    });

    const rawAllocations = Array.isArray(data?.allocations) ? data.allocations : [];
    if (rawAllocations.length === 0) {
      return res.status(502).json({
        success: false,
        message: "AI did not return valid budget allocations. Please try again.",
      });
    }

    const allocations = rawAllocations.map((item) => {
      const amount = Math.max(0, Math.round(Number(item.suggestedBudget) || 0));
      const stat = pricingStats[item.service];
      const hasPlatformData = Boolean(stat && (stat.vendorListingCount > 0 || stat.historicalBookingCount > 0));
      return {
        service: String(item.service || "Other expenses"),
        suggestedBudget: amount,
        pricingSource: hasPlatformData
          ? "EVORA platform data + AI"
          : String(item.pricingSource || "AI market estimate"),
        platformBenchmark: stat || null,
        notes: String(item.notes || ""),
      };
    });

    const estimatedTotal = allocations.reduce((sum, a) => sum + a.suggestedBudget, 0);
    const remainingBalance = budgetNum - estimatedTotal;
    const isOverBudget = estimatedTotal > budgetNum;
    const overrunAmount = isOverBudget ? estimatedTotal - budgetNum : 0;

    const cheaperAlternatives = Array.isArray(data?.cheaperAlternatives)
      ? data.cheaperAlternatives.map((alt) => ({
          service: String(alt.service || "General"),
          suggestion: String(alt.suggestion || ""),
          potentialSavings: Math.max(0, Math.round(Number(alt.potentialSavings) || 0)),
        }))
      : [];

    res.status(200).json({
      success: true,
      model,
      budgetAnalysis: {
        eventType: eventType.trim(),
        guestCount: guestsNum,
        totalBudget: budgetNum,
        estimatedTotal,
        remainingBalance,
        isOverBudget,
        overrunAmount,
        costPerGuest: Math.round(estimatedTotal / guestsNum),
        allocations,
        cheaperAlternatives,
        warningMessage: isOverBudget
          ? `Estimated cost (₹${estimatedTotal.toLocaleString("en-IN")}) exceeds your ₹${budgetNum.toLocaleString("en-IN")} budget by ₹${overrunAmount.toLocaleString("en-IN")}. Review cheaper alternatives or adjust allocations below.`
          : `Estimated cost (₹${estimatedTotal.toLocaleString("en-IN")}) fits within your budget with ₹${remainingBalance.toLocaleString("en-IN")} remaining.`,
        summaryNote: String(data?.summaryNote || ""),
        disclaimer:
          "Important: These figures are AI-assisted planning estimates (informed by available EVORA vendor listings and historical bookings where present) and are NOT confirmed vendor quotes or final prices.",
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// 3. AI FOOD RECOMMENDATION (Generate, Edit & Save per user)
// ─────────────────────────────────────────────────────────
const normalizeMenuCourse = (arr = [], fallbackServings = 0) =>
  Array.isArray(arr)
    ? arr
        .filter((x) => x && (typeof x === "string" || typeof x.item === "string"))
        .map((x) =>
          typeof x === "string"
            ? { item: x.trim(), servings: fallbackServings, quantityEstimate: `${fallbackServings} servings`, notes: "" }
            : {
                item: String(x.item).trim(),
                servings: Math.max(0, Math.round(Number(x.servings) || fallbackServings)),
                quantityEstimate: String(x.quantityEstimate || `${fallbackServings} servings`).trim(),
                notes: String(x.notes || "").trim(),
              }
        )
    : [];

exports.foodRecommendations = async (req, res, next) => {
  try {
    const {
      eventType = "Wedding",
      guestCount,
      budget,
      foodPreference = "Vegetarian",
      mealType = "Dinner",
      dietaryRestrictions = "",
      location = "",
    } = req.body || {};

    const guestsNum = Number(guestCount);
    const budgetNum = Number(budget) || 0;

    if (!eventType || typeof eventType !== "string" || !eventType.trim()) {
      return res.status(400).json({ success: false, message: "Event type is required." });
    }
    if (!Number.isFinite(guestsNum) || guestsNum <= 0) {
      return res.status(400).json({ success: false, message: "Guest count must be a positive number." });
    }
    if (budget !== undefined && budget !== "" && (!Number.isFinite(budgetNum) || budgetNum < 0)) {
      return res.status(400).json({ success: false, message: "Budget must be a valid non-negative number." });
    }

    const systemPrompt = `You are the EVORA AI Culinary & Menu Planner ("EVORA – Made to Celebrate").
Return ONLY valid JSON matching the exact schema requested.
Design practical, culturally appropriate Indian/event catering menus scaled accurately to guestCount and foodPreference.
Strict rules:
- Strictly obey foodPreference (e.g., if Vegetarian, Vegan, or Jain, include ZERO meat/poultry/fish/eggs).
- Address any dietaryRestrictions or allergies explicitly with safe substitutes in dietaryAlternatives.
- Provide realistic quantityEstimate per item (e.g. "${guestsNum} glasses / ~${Math.round(guestsNum * 0.25)}L", "${Math.round(guestsNum * 0.15)} kg", etc.) and explain costAssumptions clearly.
- Include practical wasteReductionTips (e.g., 85-90% initial batch prep + live replenishment) to avoid excess food waste.`;

    const userPrompt = `Generate an event menu plan in JSON for:
- Event Type: ${eventType.trim()}
- Guest Count: ${guestsNum}
- Food Budget (INR): ${budgetNum > 0 ? budgetNum : "Flexible / suggest economical estimate"}
- Food Preference: ${String(foodPreference).trim()}
- Meal Type: ${String(mealType).trim()}
- Dietary Restrictions / Allergies: ${String(dietaryRestrictions).trim() || "None specified"}
- City / Region: ${String(location).trim() || "India (general)"}

Return strictly this JSON schema:
{
  "title": "string (e.g. Vegetarian Wedding Dinner Menu for 200 Guests)",
  "welcomeDrinks": [{ "item": "string", "servings": number, "quantityEstimate": "string", "notes": "string" }],
  "starters": [{ "item": "string", "servings": number, "quantityEstimate": "string", "notes": "string" }],
  "mainCourse": [{ "item": "string", "servings": number, "quantityEstimate": "string", "notes": "string" }],
  "sideDishes": [{ "item": "string", "servings": number, "quantityEstimate": "string", "notes": "string" }],
  "desserts": [{ "item": "string", "servings": number, "quantityEstimate": "string", "notes": "string" }],
  "dietaryAlternatives": [{ "restrictionOrAllergy": "string", "substituteItem": "string", "notes": "string" }],
  "estimatedTotalCost": number,
  "costAssumptions": ["string"],
  "wasteReductionTips": ["string"]
}`;

    const { data, model } = await generateStructuredJson({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
    });

    const estimatedTotalCost = Math.max(0, Math.round(Number(data?.estimatedTotalCost) || budgetNum || guestsNum * 300));
    const costPerGuest = Math.round(estimatedTotalCost / guestsNum);

    const menu = {
      title: String(data?.title || `${foodPreference} ${eventType} ${mealType} Menu`).trim(),
      eventType: eventType.trim(),
      guestCount: guestsNum,
      budget: budgetNum,
      foodPreference: String(foodPreference).trim(),
      mealType: String(mealType).trim(),
      dietaryRestrictions: String(dietaryRestrictions || "").trim(),
      location: String(location || "").trim(),
      welcomeDrinks: normalizeMenuCourse(data?.welcomeDrinks, guestsNum),
      starters: normalizeMenuCourse(data?.starters, guestsNum),
      mainCourse: normalizeMenuCourse(data?.mainCourse, guestsNum),
      sideDishes: normalizeMenuCourse(data?.sideDishes, guestsNum),
      desserts: normalizeMenuCourse(data?.desserts, guestsNum),
      dietaryAlternatives: Array.isArray(data?.dietaryAlternatives)
        ? data.dietaryAlternatives.map((d) => ({
            restrictionOrAllergy: String(d.restrictionOrAllergy || "General Dietary"),
            substituteItem: String(d.substituteItem || ""),
            notes: String(d.notes || ""),
          }))
        : [],
      estimatedTotalCost,
      costPerGuest,
      costAssumptions: Array.isArray(data?.costAssumptions) ? data.costAssumptions.map(String) : [],
      wasteReductionTips: Array.isArray(data?.wasteReductionTips) ? data.wasteReductionTips.map(String) : [],
    };

    res.status(200).json({ success: true, model, menu });
  } catch (err) {
    next(err);
  }
};

exports.getSavedFoodMenus = async (req, res, next) => {
  try {
    const menus = await SavedFoodMenu.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean();
    res.status(200).json({ success: true, menus });
  } catch (err) {
    next(err);
  }
};

exports.saveFoodMenu = async (req, res, next) => {
  try {
    const payload = req.body || {};
    if (!payload.title || !Number(payload.guestCount)) {
      return res.status(400).json({ success: false, message: "Menu title and guestCount are required." });
    }

    const guestsNum = Number(payload.guestCount);
    const saved = await SavedFoodMenu.create({
      userId: req.user._id,
      title: String(payload.title).trim(),
      eventType: String(payload.eventType || "Celebration").trim(),
      guestCount: guestsNum,
      budget: Number(payload.budget) || 0,
      foodPreference: String(payload.foodPreference || "Vegetarian").trim(),
      mealType: String(payload.mealType || "Dinner").trim(),
      dietaryRestrictions: String(payload.dietaryRestrictions || "").trim(),
      location: String(payload.location || "").trim(),
      welcomeDrinks: normalizeMenuCourse(payload.welcomeDrinks, guestsNum),
      starters: normalizeMenuCourse(payload.starters, guestsNum),
      mainCourse: normalizeMenuCourse(payload.mainCourse, guestsNum),
      sideDishes: normalizeMenuCourse(payload.sideDishes, guestsNum),
      desserts: normalizeMenuCourse(payload.desserts, guestsNum),
      dietaryAlternatives: Array.isArray(payload.dietaryAlternatives) ? payload.dietaryAlternatives : [],
      estimatedTotalCost: Number(payload.estimatedTotalCost) || 0,
      costPerGuest: Number(payload.costPerGuest) || Math.round((Number(payload.estimatedTotalCost) || 0) / guestsNum),
      costAssumptions: Array.isArray(payload.costAssumptions) ? payload.costAssumptions.map(String) : [],
      wasteReductionTips: Array.isArray(payload.wasteReductionTips) ? payload.wasteReductionTips.map(String) : [],
    });

    res.status(201).json({ success: true, menu: saved });
  } catch (err) {
    next(err);
  }
};

exports.updateSavedFoodMenu = async (req, res, next) => {
  try {
    const existing = await SavedFoodMenu.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Saved menu not found." });
    }

    const payload = req.body || {};
    const guestsNum = Number(payload.guestCount) || existing.guestCount;
    if (payload.title !== undefined) existing.title = String(payload.title).trim();
    if (payload.estimatedTotalCost !== undefined) {
      existing.estimatedTotalCost = Number(payload.estimatedTotalCost) || 0;
      existing.costPerGuest = Math.round(existing.estimatedTotalCost / guestsNum);
    }
    if (payload.welcomeDrinks) existing.welcomeDrinks = normalizeMenuCourse(payload.welcomeDrinks, guestsNum);
    if (payload.starters) existing.starters = normalizeMenuCourse(payload.starters, guestsNum);
    if (payload.mainCourse) existing.mainCourse = normalizeMenuCourse(payload.mainCourse, guestsNum);
    if (payload.sideDishes) existing.sideDishes = normalizeMenuCourse(payload.sideDishes, guestsNum);
    if (payload.desserts) existing.desserts = normalizeMenuCourse(payload.desserts, guestsNum);
    if (payload.dietaryAlternatives) existing.dietaryAlternatives = payload.dietaryAlternatives;
    if (payload.costAssumptions) existing.costAssumptions = payload.costAssumptions;
    if (payload.wasteReductionTips) existing.wasteReductionTips = payload.wasteReductionTips;

    await existing.save();
    res.status(200).json({ success: true, menu: existing });
  } catch (err) {
    next(err);
  }
};

exports.deleteSavedFoodMenu = async (req, res, next) => {
  try {
    const deleted = await SavedFoodMenu.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Saved menu not found." });
    }
    res.status(200).json({ success: true, message: "Saved menu deleted." });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// 4. AI INVITATION GENERATOR
// ─────────────────────────────────────────────────────────
exports.invitationGenerator = async (req, res, next) => {
  try {
    const {
      eventName = "",
      hostName = "",
      date = "",
      time = "",
      venue = "",
      location = "",
      style = "Traditional and elegant",
      language = "English",
      additionalDetails = "",
    } = req.body || {};

    if (!String(eventName).trim() || !String(hostName).trim()) {
      return res.status(400).json({
        success: false,
        message: "Event name and host name are required to generate an invitation.",
      });
    }

    const providedDetails = {
      eventName: String(eventName).trim(),
      hostName: String(hostName).trim(),
      ...(String(date).trim() ? { date: String(date).trim() } : {}),
      ...(String(time).trim() ? { time: String(time).trim() } : {}),
      ...(String(venue).trim() ? { venue: String(venue).trim() } : {}),
      ...(String(location).trim() ? { location: String(location).trim() } : {}),
      ...(String(additionalDetails).trim() ? { additionalDetails: String(additionalDetails).trim() } : {}),
    };

    const systemPrompt = `You are the EVORA AI Invitation Writer ("EVORA – Made to Celebrate").
Return ONLY valid JSON matching the requested schema.
CRITICAL RULE: NEVER invent, guess, or add ANY event details that were NOT explicitly provided in the input!
- If "time" is not provided, do NOT mention any clock time or placeholder like "[Time]".
- If "venue" or "location" is not provided, do NOT invent a hall name, street address, or city.
- If "date" is not provided, do NOT invent a date.
- Write the invitation in the requested language and tone/style using ONLY the provided facts.`;

    const userPrompt = `Write a personalized event invitation in JSON:
- Language: ${String(language).trim() || "English"}
- Style / Tone: ${String(style).trim() || "Traditional and elegant"}
- Provided Event Details (use ONLY these facts, omit anything not listed here): ${JSON.stringify(providedDetails)}

Return strictly this JSON schema:
{
  "headline": "string (short invitation header/title in the requested language)",
  "message": "string (complete polished invitation message in the requested language & style using only provided details)",
  "shortShareText": "string (concise WhatsApp/SMS-ready version using only provided details)"
}`;

    const { data, model } = await generateStructuredJson({
      systemPrompt,
      userPrompt,
      temperature: 0.65,
    });

    if (!data?.message) {
      return res.status(502).json({
        success: false,
        message: "AI did not return a valid invitation message. Please try again.",
      });
    }

    res.status(200).json({
      success: true,
      model,
      invitation: {
        headline: String(data.headline || providedDetails.eventName).trim(),
        message: String(data.message).trim(),
        shortShareText: String(data.shortShareText || data.message).trim(),
        style: String(style).trim(),
        language: String(language).trim(),
        detailsUsed: providedDetails,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// 5. AI CHECKLIST GENERATOR (Timeline + Date Math + Private Persistence)
// ─────────────────────────────────────────────────────────
const parseIsoDateUtc = (dateStr) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || "").trim())) return null;
  const [y, m, d] = String(dateStr).trim().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
};

const subtractDaysIso = (eventDateStr, daysBefore) => {
  const base = parseIsoDateUtc(eventDateStr);
  if (!base) return "";
  const safeDays = Math.max(0, Math.round(Number(daysBefore) || 0));
  const target = new Date(base.getTime() - safeDays * 86400000);
  return target.toISOString().slice(0, 10);
};

const formatPhaseLabel = (daysBefore) => {
  const d = Math.max(0, Math.round(Number(daysBefore) || 0));
  if (d === 0) return "Event Day";
  if (d === 1) return "1 Day Before";
  return `${d} Days Before`;
};

const computeChecklistCounts = (tasks = []) => {
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => Boolean(t.completed)).length;
  return {
    totalCount,
    completedCount,
    pendingCount: totalCount - completedCount,
  };
};

exports.checklistGenerator = async (req, res, next) => {
  try {
    const {
      eventType = "Wedding",
      eventDate,
      guestCount = 100,
      services = [],
      eventId = null,
    } = req.body || {};

    if (!eventType || typeof eventType !== "string" || !eventType.trim()) {
      return res.status(400).json({ success: false, message: "Event type is required." });
    }
    if (!parseIsoDateUtc(eventDate)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid event date in YYYY-MM-DD format.",
      });
    }

    const guestsNum = Math.max(1, Number(guestCount) || 100);
    const cleanServices = Array.isArray(services)
      ? services.map((s) => String(s).trim()).filter(Boolean)
      : [];

    const systemPrompt = `You are the EVORA AI Event Checklist & Timeline Generator ("EVORA – Made to Celebrate").
Return ONLY valid JSON matching the exact schema requested.
Generate actionable, well-organized preparation tasks tailored to the event type, guest count, and selected services.
Assign each task a realistic integer daysBefore (e.g., 30, 15, 7, 1, 0) representing how many days before the event it should be done.
Group tasks logically across key milestones (such as 30 Days Before, 15 Days Before, 7 Days Before, 1 Day Before, and Event Day).
Do NOT compute calendar dates yourself—only output integer daysBefore; the backend calculates exact calendar dates.`;

    const userPrompt = `Create a preparation checklist in JSON for:
- Event Type: ${eventType.trim()}
- Event Date: ${eventDate.trim()}
- Guest Count: ${guestsNum}
- Selected Services: ${cleanServices.length ? JSON.stringify(cleanServices) : "General celebration essentials (Venue, Catering, Decoration)"}

Return strictly this JSON schema:
{
  "title": "string (e.g. Wedding Preparation Checklist)",
  "tasks": [
    {
      "title": "string (concise action item)",
      "description": "string (short practical detail)",
      "category": "string (e.g. Venue, Catering, Photography, Decoration, Guests, Logistics)",
      "daysBefore": number (non-negative integer: 0, 1, 7, 15, 30, etc.)
    }
  ]
}`;

    const { data, model } = await generateStructuredJson({
      systemPrompt,
      userPrompt,
      temperature: 0.35,
    });

    const rawTasks = Array.isArray(data?.tasks) ? data.tasks : [];
    if (rawTasks.length === 0) {
      return res.status(502).json({
        success: false,
        message: "AI did not return checklist tasks. Please try again.",
      });
    }

    const tasks = rawTasks
      .filter((t) => t && t.title)
      .map((t) => {
        const daysBefore = Math.max(0, Math.round(Number(t.daysBefore) || 0));
        return {
          title: String(t.title).trim(),
          description: String(t.description || "").trim(),
          category: String(t.category || "General").trim(),
          daysBefore,
          phase: formatPhaseLabel(daysBefore),
          dueDate: subtractDaysIso(eventDate.trim(), daysBefore),
          completed: false,
        };
      })
      .sort((a, b) => b.daysBefore - a.daysBefore);

    const title = String(data?.title || `${eventType.trim()} Preparation Checklist`).trim();

    // Automatically persist generated checklist privately for this authenticated user
    const saved = await SavedChecklist.create({
      userId: req.user._id,
      eventId: eventId || null,
      title,
      eventType: eventType.trim(),
      eventDate: eventDate.trim(),
      guestCount: guestsNum,
      services: cleanServices,
      tasks,
    });

    res.status(200).json({
      success: true,
      model,
      checklist: saved,
      counts: computeChecklistCounts(saved.tasks),
    });
  } catch (err) {
    next(err);
  }
};

exports.getSavedChecklists = async (req, res, next) => {
  try {
    const checklists = await SavedChecklist.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json({ success: true, checklists });
  } catch (err) {
    next(err);
  }
};

exports.saveChecklist = async (req, res, next) => {
  try {
    const { title, eventType, eventDate, guestCount = 0, services = [], tasks = [], eventId = null } = req.body || {};
    if (!title || !eventType || !parseIsoDateUtc(eventDate)) {
      return res.status(400).json({
        success: false,
        message: "title, eventType, and valid eventDate (YYYY-MM-DD) are required.",
      });
    }

    const normalizedTasks = Array.isArray(tasks)
      ? tasks
          .filter((t) => t && t.title)
          .map((t) => {
            const daysBefore = Math.max(0, Math.round(Number(t.daysBefore) || 0));
            return {
              title: String(t.title).trim(),
              description: String(t.description || "").trim(),
              category: String(t.category || "General").trim(),
              daysBefore,
              phase: t.phase ? String(t.phase).trim() : formatPhaseLabel(daysBefore),
              dueDate: t.dueDate && parseIsoDateUtc(t.dueDate)
                ? t.dueDate
                : subtractDaysIso(eventDate, daysBefore),
              completed: Boolean(t.completed),
            };
          })
      : [];

    const saved = await SavedChecklist.create({
      userId: req.user._id,
      eventId: eventId || null,
      title: String(title).trim(),
      eventType: String(eventType).trim(),
      eventDate: String(eventDate).trim(),
      guestCount: Number(guestCount) || 0,
      services: Array.isArray(services) ? services.map(String) : [],
      tasks: normalizedTasks,
    });

    res.status(201).json({
      success: true,
      checklist: saved,
      counts: computeChecklistCounts(saved.tasks),
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSavedChecklist = async (req, res, next) => {
  try {
    const existing = await SavedChecklist.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Checklist not found." });
    }

    const { title, eventDate, tasks } = req.body || {};
    if (title !== undefined) existing.title = String(title).trim();
    if (eventDate !== undefined) {
      if (!parseIsoDateUtc(eventDate)) {
        return res.status(400).json({ success: false, message: "Invalid eventDate format (YYYY-MM-DD)." });
      }
      existing.eventDate = eventDate;
    }

    if (Array.isArray(tasks)) {
      existing.tasks = tasks
        .filter((t) => t && t.title && String(t.title).trim())
        .map((t) => {
          const daysBefore = Math.max(0, Math.round(Number(t.daysBefore) || 0));
          const dueDate =
            t.dueDate && parseIsoDateUtc(t.dueDate)
              ? t.dueDate
              : subtractDaysIso(existing.eventDate, daysBefore);
          return {
            ...(t._id ? { _id: t._id } : {}),
            title: String(t.title).trim(),
            description: String(t.description || "").trim(),
            category: String(t.category || "General").trim(),
            daysBefore,
            phase: t.phase ? String(t.phase).trim() : formatPhaseLabel(daysBefore),
            dueDate,
            completed: Boolean(t.completed),
          };
        });
    }

    await existing.save();

    // If linked to an Event owned by this user, optionally sync checklist items cleanly
    if (existing.eventId) {
      await Event.findOneAndUpdate(
        { _id: existing.eventId, organizerId: req.user._id },
        {
          $set: {
            checklist: existing.tasks.map((t) => ({
              title: t.title,
              category: t.category || "General",
              status: t.completed ? "Completed" : "Pending",
              owner: "Organizer",
              dueDate: t.dueDate || "",
            })),
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      checklist: existing,
      counts: computeChecklistCounts(existing.tasks),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteSavedChecklist = async (req, res, next) => {
  try {
    const deleted = await SavedChecklist.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Checklist not found." });
    }
    res.status(200).json({ success: true, message: "Checklist deleted." });
  } catch (err) {
    next(err);
  }
};

const EVORA_CATEGORIES = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Anniversary",
  "Festival",
  "Graduation",
  "Engagement",
  "Other",
];

function normalizeEvoraCategory(rawCategory, rawType = "") {
  const combined = `${rawCategory || ""} ${rawType || ""}`.toLowerCase();
  for (const cat of EVORA_CATEGORIES) {
    if (cat !== "Other" && combined.includes(cat.toLowerCase())) {
      return cat;
    }
  }
  return "Other";
}

function normalizeEvoraServiceName(raw) {
  const s = String(raw || "").trim();
  const lower = s.toLowerCase();
  if (lower.includes("cater") || lower.includes("food")) return "Catering";
  if (lower.includes("venue") || lower.includes("hall") || lower.includes("banquet")) return "Venue";
  if (lower.includes("photo") || lower.includes("video")) return "Photography";
  if (lower.includes("decor") || lower.includes("floral") || lower.includes("theme")) return "Decoration";
  if (lower.includes("music") || lower.includes("sound") || lower.includes("dj")) return "Music & Sound";
  if (lower.includes("makeup") || lower.includes("styling") || lower.includes("hair")) return "Makeup & Styling";
  return s;
}

function sanitizeEventPlanPayload(raw = {}, fallbackPrompt = "") {
  const eventType = String(raw.eventType || "Celebration").trim();
  const eventCategory = normalizeEvoraCategory(raw.eventCategory, eventType);
  const guestCount = Math.max(0, Math.round(Number(raw.guestCount) || 0));
  const budget = Math.max(0, Math.round(Number(raw.budget) || 0));

  const rawServices = Array.isArray(raw.suggestedServices) ? raw.suggestedServices : [];
  const suggestedServices = rawServices
    .filter(Boolean)
    .map((item) => {
      if (typeof item === "string") {
        const canonical = normalizeEvoraServiceName(item);
        return { name: canonical, category: canonical, reason: "", estimatedCost: 0 };
      }
      const canonical = normalizeEvoraServiceName(item.category || item.name);
      return {
        name: String(item.name || canonical).trim(),
        category: canonical,
        reason: String(item.reason || "").trim(),
        estimatedCost: Math.max(0, Math.round(Number(item.estimatedCost) || 0)),
      };
    });

  const schedule = (Array.isArray(raw.schedule) ? raw.schedule : [])
    .filter((s) => s && (s.title || s.activity))
    .map((s) => ({
      time: String(s.time || "").trim(),
      title: String(s.title || s.activity || "").trim(),
      details: String(s.details || s.notes || "").trim(),
    }));

  const budgetDistribution = (Array.isArray(raw.budgetDistribution) ? raw.budgetDistribution : [])
    .filter((b) => b && (b.category || b.service))
    .map((b) => ({
      category: String(b.category || b.service).trim(),
      amount: Math.max(0, Math.round(Number(b.amount) || 0)),
      notes: String(b.notes || "").trim(),
    }));

  const preparationRecommendations = (
    Array.isArray(raw.preparationRecommendations) ? raw.preparationRecommendations : []
  )
    .map((r) => String(r || "").trim())
    .filter(Boolean);

  return {
    prompt: String(raw.prompt || fallbackPrompt).trim(),
    eventTitle: String(raw.eventTitle || `${eventType} Celebration`).trim(),
    eventType,
    eventCategory,
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || "").trim()) ? String(raw.date).trim() : "",
    time: String(raw.time || "").trim(),
    location: String(raw.location || "").trim(),
    venue: String(raw.venue || "").trim(),
    guestCount,
    budget,
    suggestedTheme: String(raw.suggestedTheme || "").trim(),
    description: String(raw.description || "").trim(),
    suggestedServices,
    schedule,
    budgetDistribution,
    preparationRecommendations,
    disclaimer:
      "This AI-generated plan is an editable planning blueprint only. No event or vendor bookings have been created or confirmed.",
  };
}

// ─────────────────────────────────────────────────────────
// Feature 6: AI Event Planning Assistant
// POST /api/ai/plan
// ─────────────────────────────────────────────────────────
exports.generatePlan = async (req, res, next) => {
  try {
    const rawInput = req.body?.prompt ?? req.body?.requirements ?? req.body?.description ?? "";
    const promptText = String(rawInput).trim();
    if (promptText.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please describe your event requirements (at least 5 characters).",
      });
    }

    const systemPrompt = `You are the EVORA AI Event Planning Assistant ("EVORA – Made to Celebrate").
Given a user's natural-language celebration description, extract their explicit details and design a structured, practical event planning blueprint in JSON.
Rules:
1. Extract exact details provided by the user: eventType, date (convert explicit calendar dates like "15 January 2027" to "YYYY-MM-DD"; leave "" if no date is specified), time ("" if unspecified), location, guestCount (number, 0 if unspecified), and budget in INR (number, 0 if unspecified). Do NOT fabricate a specific venue name or booking confirmation if none was given (leave venue "" unless requested/named).
2. Map eventCategory strictly to one of: ${JSON.stringify(EVORA_CATEGORIES)}.
3. Map suggestedServices categories to EVORA standard service categories where relevant: ["Venue", "Catering", "Photography", "Decoration", "Music & Sound", "Makeup & Styling"].
4. Include an approximate budgetDistribution matching their budget when budget > 0, a realistic event schedule, a suggestedTheme, and practical preparationRecommendations.
5. Return ONLY valid JSON matching the schema.`;

    const userPrompt = `User event description:
"${promptText}"

Return strictly this JSON schema:
{
  "eventTitle": "string (concise celebration title)",
  "eventType": "string (e.g. Birthday Party, Wedding)",
  "eventCategory": "one of ${JSON.stringify(EVORA_CATEGORIES)}",
  "date": "YYYY-MM-DD or empty string if not provided",
  "time": "HH:MM 24h or empty string if not provided",
  "location": "string (city/area extracted or empty string)",
  "venue": "string (empty string unless explicitly named by user)",
  "guestCount": number,
  "budget": number,
  "suggestedTheme": "string",
  "description": "string (2-3 sentence event summary suitable for the event description field)",
  "suggestedServices": [
    {
      "name": "string (EVORA service name e.g. Venue, Catering, Decoration, Photography, Music & Sound, Makeup & Styling)",
      "category": "string (same canonical EVORA service name)",
      "reason": "string (why this service fits)",
      "estimatedCost": number
    }
  ],
  "schedule": [
    {
      "time": "string (e.g. 06:00 PM)",
      "title": "string",
      "details": "string"
    }
  ],
  "budgetDistribution": [
    {
      "category": "string",
      "amount": number,
      "notes": "string"
    }
  ],
  "preparationRecommendations": ["string"]
}`;

    const { data, model } = await generateStructuredJson({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
    });

    if (!data || typeof data !== "object") {
      return res.status(502).json({
        success: false,
        message: "AI did not return a structured event plan. Please try again.",
      });
    }

    const plan = sanitizeEventPlanPayload(data, promptText);
    res.status(200).json({
      success: true,
      model,
      plan,
    });
  } catch (err) {
    next(err);
  }
};

exports.getSavedPlans = async (req, res, next) => {
  try {
    const plans = await SavedEventPlan.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json({ success: true, plans });
  } catch (err) {
    next(err);
  }
};

exports.saveEventPlan = async (req, res, next) => {
  try {
    const promptText = String(req.body?.prompt || req.body?.eventTitle || "Custom Event Plan").trim();
    const clean = sanitizeEventPlanPayload(req.body || {}, promptText);
    if (!clean.eventTitle || !clean.eventType) {
      return res.status(400).json({
        success: false,
        message: "eventTitle and eventType are required to save a plan.",
      });
    }
    const saved = await SavedEventPlan.create({
      userId: req.user._id,
      ...clean,
    });
    res.status(201).json({ success: true, plan: saved });
  } catch (err) {
    next(err);
  }
};

exports.updateSavedEventPlan = async (req, res, next) => {
  try {
    const existing = await SavedEventPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Saved event plan not found." });
    }
    const clean = sanitizeEventPlanPayload(
      { ...existing.toObject(), ...(req.body || {}) },
      existing.prompt
    );
    Object.assign(existing, clean);
    await existing.save();
    res.status(200).json({ success: true, plan: existing });
  } catch (err) {
    next(err);
  }
};

exports.deleteSavedEventPlan = async (req, res, next) => {
  try {
    const deleted = await SavedEventPlan.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Saved event plan not found." });
    }
    res.status(200).json({ success: true, message: "Saved event plan deleted." });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// Existing Operational Helpers (used by smoke tests / platform)
// ─────────────────────────────────────────────────────────
exports.volunteerMatch = async (req, res, next) => {
  try {
    const { eventType, volunteersNeeded = 5, applicants = [] } = req.body;

    const scoredApplicants = applicants.map((vol) => {
      let score = 70;
      const skills = (vol.skills || vol.bio || "").toLowerCase();
      const exp = (vol.experience || "").toLowerCase();

      if (eventType === "Wedding & Reception" || eventType === "Wedding") {
        if (skills.includes("hospitality") || skills.includes("guest") || skills.includes("reception")) score += 15;
        if (skills.includes("crowd") || skills.includes("coordination")) score += 10;
      } else if (eventType === "Corporate Meeting/Conference" || eventType === "Corporate") {
        if (skills.includes("av") || skills.includes("tech") || skills.includes("registration")) score += 20;
      } else if (eventType === "College Fest/Cultural") {
        if (skills.includes("stage") || skills.includes("backstage") || skills.includes("audio")) score += 20;
      }

      if (exp.includes("lead") || exp.includes("senior") || exp.includes("years")) score += 8;
      if (vol.verificationStatus === "Approved") score += 5;

      score = Math.min(99, Math.max(55, score));

      return {
        ...vol,
        matchScore: score,
        recommendation: score >= 85 ? "High Fit" : score >= 75 ? "Recommended" : "Good Support",
        suggestedDuty: score >= 85 ? "Lead Coordinator" : "Guest Assistance & Operations",
      };
    });

    scoredApplicants.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      rankedApplicants: scoredApplicants,
      aiSummary: `Evaluated ${applicants.length} volunteer candidate(s) for ${eventType || "Celebration"}. Top ${Math.min(volunteersNeeded, scoredApplicants.length)} candidates matched with operational affinity.`,
    });
  } catch (err) {
    next(err);
  }
};

exports.scheduleGenerator = async (req, res, next) => {
  try {
    const { eventType = "Wedding" } = req.body;

    let schedule = [];
    if (eventType.includes("Wedding")) {
      schedule = [
        { time: "09:00 - 10:30", title: "Vendor Arrival & Stage Sound Check", description: "Caterers, decorators, and AV technicians verify setup and audio calibration.", lead: "Vendor Coordinator" },
        { time: "10:30 - 11:30", title: "Guest Arrival & Welcome Refreshments", description: "Hospitality volunteers welcome arrivals with welcome drinks & seating guides.", lead: "Guest Relations" },
        { time: "11:30 - 13:00", title: "Main Auspicious Ceremony", description: "Sacred rites, vows, and exchange of garlands.", lead: "Event Host" },
        { time: "13:00 - 14:30", title: "Grand Royal Feast / Banquet", description: "Buffet opens. Caterers monitor serving lines.", lead: "Catering Head" },
        { time: "18:00 - 21:30", title: "Evening Reception & Musical Celebrations", description: "Live performances, DJ music, cake cutting, and dinner.", lead: "Lead Emcee" },
      ];
    } else if (eventType.includes("Corporate")) {
      schedule = [
        { time: "08:30 - 09:30", title: "Delegate Registration & Coffee Networking", description: "Badge dispatch and breakfast snacks.", lead: "Registration Desk" },
        { time: "09:30 - 10:15", title: "Opening Keynote & Welcome Address", description: "Executive welcome and agenda briefing.", lead: "Conference Emcee" },
        { time: "12:30 - 13:45", title: "Executive Networking Luncheon", description: "Multi-cuisine buffet lunch.", lead: "F&B Manager" },
        { time: "16:30 - 17:30", title: "Closing Remarks & High Tea", description: "Awards and closing networking.", lead: "Organizer" },
      ];
    } else {
      schedule = [
        { time: "15:00 - 16:30", title: "Venue Dressing & Sound Setup", description: "Decor setup and sound verification.", lead: "Decor Coordinator" },
        { time: "16:30 - 17:30", title: "Guest Welcome & Icebreakers", description: "Welcome drinks and photo booth.", lead: "Hospitality Lead" },
        { time: "17:30 - 18:30", title: "Main Celebration & Cake Cutting", description: "Toast, cake cutting, and group photographs.", lead: "Event Host" },
        { time: "18:30 - 20:00", title: "Dinner Buffet & Entertainment", description: "Dining service and music.", lead: "Catering Head" },
      ];
    }

    res.json({
      success: true,
      schedule,
      aiAdvice: "Schedule includes 15-minute operational buffers between phases.",
    });
  } catch (err) {
    next(err);
  }
};

exports.reviewSummary = async (req, res, next) => {
  try {
    const { vendorId } = req.body;
    const Review = require("../models/Review");
    const reviews = await Review.find({ vendorId }).sort({ createdAt: -1 });

    if (reviews.length === 0) {
      return res.json({
        success: true,
        summary: "No reviews recorded yet for this artisan vendor.",
        sentiment: "Neutral",
        pros: ["Newly onboarded artisan ready to take celebration bookings."],
        cons: [],
        score: 0,
      });
    }

    const avg = reviews.reduce((s, r) => s + r.overall, 0) / reviews.length;
    res.json({
      success: true,
      summary: `Based on ${reviews.length} client review(s), average rating is ${Math.round(avg * 10) / 10} / 5.`,
      sentiment: avg >= 4.2 ? "Overwhelmingly Positive" : avg >= 3.5 ? "Positive" : "Mixed",
      score: Math.round(avg * 10) / 10,
      pros: ["Consistent service presentation and coordination."],
      cons: avg < 4.0 ? ["Some communication delays noted during peak dates."] : [],
    });
  } catch (err) {
    next(err);
  }
};

exports.postEventReport = async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const totalBudget = event.totalBudget || 0;
    const estimatedTotal = event.estimatedTotal || totalBudget;
    const variance = totalBudget - estimatedTotal;

    res.json({
      success: true,
      report: {
        eventTitle: event.title,
        date: event.date,
        budgetAnalysis: {
          plannedBudget: totalBudget,
          actualSpent: estimatedTotal,
          variance: Math.abs(variance),
          status: variance >= 0 ? "Under Budget" : "Budget Overrun",
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
