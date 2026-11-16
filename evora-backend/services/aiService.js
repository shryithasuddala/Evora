const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

class AIServiceError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "AIServiceError";
    this.statusCode = statusCode;
  }
}

const getGeminiConfig = () => {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  if (!apiKey) {
    throw new AIServiceError(
      "AI service is not configured on the server. Please configure GEMINI_API_KEY in backend environment.",
      503
    );
  }
  return { apiKey, model };
};

const callSingleModel = async ({
  model,
  apiKey,
  systemInstruction,
  contents,
  responseMimeType,
  temperature = 0.7,
  timeoutMs = 18000,
}) => {
  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`;

  // Disable deep thinking latency for 3.7 / 3.8 models to ensure instant responses
  const generationConfig = {
    temperature,
    ...(responseMimeType ? { responseMimeType } : {}),
  };

  if (model.includes("3.7") || model.includes("3.8")) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const body = {
    contents,
    generationConfig,
    ...(systemInstruction
      ? {
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
        }
      : {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const apiStatus = data?.error?.status || `HTTP_${response.status}`;
      const apiMsg = data?.error?.message || "Unable to generate response.";
      if (response.status === 401 || response.status === 403) {
        throw new AIServiceError(
          "AI provider authentication failed. Please check server API key configuration.",
          502
        );
      }
      if (response.status === 429) {
        throw new AIServiceError(
          "AI service rate limit reached. Please wait a moment and try again.",
          429
        );
      }
      if (response.status === 404) {
        throw new AIServiceError(`Model ${model} not available: ${apiMsg}`, 404);
      }
      throw new AIServiceError(`AI provider error (${apiStatus}): ${apiMsg}`, 502);
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts
      .map((p) => p?.text || "")
      .join("")
      .trim();

    if (!text) {
      throw new AIServiceError(
        "AI provider returned an empty response. Please refine your input and try again.",
        502
      );
    }

    return { text, model };
  } catch (err) {
    if (err instanceof AIServiceError) throw err;
    if (err.name === "AbortError") {
      throw new AIServiceError(`AI request to ${model} timed out.`, 504);
    }
    throw new AIServiceError(
      `Unable to reach AI provider: ${err.message || "Network error"}`,
      502
    );
  } finally {
    clearTimeout(timer);
  }
};

const callGemini = async ({
  systemInstruction,
  contents,
  responseMimeType,
  temperature = 0.7,
  timeoutMs = 18000,
}) => {
  const { apiKey, model: configuredModel } = getGeminiConfig();

  // Deduplicated candidate models to ensure seamless failover
  const candidateModels = [
    configuredModel,
    ...FALLBACK_MODELS,
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastError = null;

  for (const candModel of candidateModels) {
    try {
      const result = await callSingleModel({
        model: candModel,
        apiKey,
        systemInstruction,
        contents,
        responseMimeType,
        temperature,
        timeoutMs,
      });
      return result;
    } catch (err) {
      console.warn(`[EVORA AI] Model "${candModel}" encounter: ${err.message}. Trying failover model...`);
      lastError = err;
      // If authentication failed permanently, fail early
      if (err.statusCode === 502 && err.message.includes("authentication failed")) {
        throw err;
      }
    }
  }

  // If all candidates failed
  if (lastError?.statusCode === 504) {
    throw new AIServiceError(
      "AI request timed out due to high network traffic. Please try again in a few moments.",
      504
    );
  }

  throw lastError || new AIServiceError("All AI model gateways are currently unavailable.", 503);
};

/**
 * Multi-turn conversational generation for EVORA AI Chatbot.
 */
const generateChat = async ({ systemPrompt, history = [], message, temperature = 0.7 }) => {
  const sanitizedHistory = Array.isArray(history)
    ? history
        .filter((h) => h && typeof h.text === "string" && h.text.trim().length > 0)
        .slice(-12)
        .map((h) => ({
          role: h.sender === "ai" || h.sender === "model" || h.role === "model" ? "model" : "user",
          parts: [{ text: h.text.trim() }],
        }))
    : [];

  // Gemini requires contents to start with a user turn when possible
  while (sanitizedHistory.length > 0 && sanitizedHistory[0].role === "model") {
    sanitizedHistory.shift();
  }

  const contents = [
    ...sanitizedHistory,
    { role: "user", parts: [{ text: message.trim() }] },
  ];

  try {
    return await callGemini({
      systemInstruction: systemPrompt,
      contents,
      temperature,
    });
  } catch (err) {
    console.warn(`[EVORA AI] Live Gemini API error: ${err.message}. Activating intelligent offline fallback.`);
    return {
      text: generateOfflineChatReply(message),
      model: "evora-intelligence-engine (offline simulation)",
    };
  }
};

/**
 * Structured JSON generation for analytical EVORA AI modules.
 */
const generateStructuredJson = async ({ systemPrompt, userPrompt, temperature = 0.35 }) => {
  try {
    const { text, model } = await callGemini({
      systemInstruction: systemPrompt,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      responseMimeType: "application/json",
      temperature,
    });

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return { data: parsed, model };
  } catch (err) {
    console.warn(`[EVORA AI] Live Gemini structured generation failed: ${err.message}. Serving intelligent structured fallback.`);
    const fallbackData = generateOfflineStructuredFallback(userPrompt, systemPrompt);
    return {
      data: fallbackData,
      model: "evora-intelligence-engine (offline simulation)",
    };
  }
};

/**
 * Offline Chatbot Fallback Engine
 */
function generateOfflineChatReply(userMessage = "") {
  const q = userMessage.toLowerCase();

  if (q.includes("create event") || q.includes("how to create") || q.includes("new event")) {
    return `### How to Create an Event in EVORA 🎉
To plan and launch a celebration in EVORA:
1. Navigate to **Create Event** in your organizer sidebar (\`/user/events/create\`).
2. Provide your **Celebration Title**, **Category** (e.g. Wedding, Birthday, Corporate), **Date**, **Time**, and **Venue Address**.
3. Set your target **Total Budget** and estimated **Guest Count**.
4. Select the vendor services you need (Catering, Decoration, Photography, Sound & DJ, Venue) and define target budgets for each.
5. Click **Submit Event Request** so our coordination engine verifies vendor availability and dispatches proposals to your dashboard!`;
  }

  if (q.includes("budget") || q.includes("cost") || q.includes("price") || q.includes("cheap")) {
    return `### EVORA Celebration Budgeting Insights 💰
Planning a balanced event budget involves standard allocation guidelines:
- **Catering & Feasts**: ~35% – 45% (often the largest guest experience factor)
- **Venue & Halls**: ~25% – 30% (capacity plus a 15% buffer)
- **Decoration & Styling**: ~10% – 15% (stage, backdrops, entrance arches)
- **Photography & Videography**: ~10% – 12% (traditional + candid coverage)
- **Sound, DJ & Entertainment**: ~5% – 8%

Use our **AI Budget Assistant** in the AI Suite to automatically balance your specific budget with overrun prevention and cheaper vendor alternatives!`;
  }

  if (q.includes("charity") || q.includes("leftover") || q.includes("surplus") || q.includes("food waste") || q.includes("donate")) {
    return `### Surplus Food Rescue with Charity AI 🍲
Never let fresh event food go to waste! EVORA includes built-in **Charity AI**:
1. Open **Charity AI / Donate Food** from your Event Dashboard or sidebar (\`/user/charity-ai\`).
2. Enter your leftover food dishes, approximate quantities (plates or kg), and safe-until consumption time.
3. Our geospatial engine maps nearby verified orphanages, old-age homes, and community shelters across Hyderabad.
4. AI ranks the nearest matches based on daily intake capacity and transport turnaround, and volunteers coordinate direct pickup!`;
  }

  if (q.includes("service") || q.includes("vendor") || q.includes("photograph") || q.includes("cater")) {
    return `### Available Artisan Services in EVORA ✨
We coordinate verified professionals across core celebration categories:
- **Catering**: Regional, multi-cuisine, vegetarian/non-vegetarian menus, live counters, and high-tea.
- **Venue & Halls**: Banquets, convention halls, lawn resorts, and boutique spaces.
- **Decoration**: Royal floral themes, contemporary stage lighting, and entrance decor.
- **Photography & 4K Video**: Candid photography, cinematic wedding reels, and drone coverage.
- **Sound & DJ**: High-fidelity sound systems, microphones, and stage lighting.
- **Makeup & Styling**: Bridal styling, saree draping, and mehendi artists.

You can request these directly while creating your event or explore the **Services & Bookings** tab.`;
  }

  return `### Hello from EVORA AI Assistant! 🌟
I'm here to help you plan an unforgettable celebration on **EVORA – Made to Celebrate**.

Here is what I can assist you with:
- **Service Selection & Planning**: Choosing the right artisans (Catering, Venue, Decoration, Photography, Music).
- **Budgeting & Cost Estimation**: Allocating targets and discovering cost-saving alternatives.
- **Menu Curation**: Designing appetizing menus scaled to guest counts and dietary requirements.
- **Surplus Food Rescue**: Using **Charity AI** to connect with nearby orphanages and shelters in Hyderabad.
- **Timeline & Checklists**: Staying ahead with structured preparation milestones.

What celebration are you planning today? Tell me your event type, guest count, or budget, and I'll guide you step by step!`;
}

/**
 * Offline Structured JSON Fallback Generator for analytical AI features
 */
function generateOfflineStructuredFallback(userPrompt = "", systemPrompt = "") {
  const combined = (userPrompt + " " + systemPrompt).toLowerCase();

  // 1. Budget Assistant
  if (combined.includes("allocations") || combined.includes("cheaperalternatives") || combined.includes("suggestedbudget")) {
    const budgetMatch = userPrompt.match(/Total Budget \(INR\):\s*(\d+)/i);
    const totalBudget = budgetMatch ? parseInt(budgetMatch[1], 10) : 250000;

    return {
      allocations: [
        {
          service: "Catering",
          suggestedBudget: Math.round(totalBudget * 0.40),
          pricingSource: "EVORA benchmark estimate",
          notes: "Allocated for multi-course meals, welcome beverages, and live counters.",
        },
        {
          service: "Venue & Halls",
          suggestedBudget: Math.round(totalBudget * 0.25),
          pricingSource: "EVORA benchmark estimate",
          notes: "Covers banquet rental with standard AC and stage furniture buffer.",
        },
        {
          service: "Decoration",
          suggestedBudget: Math.round(totalBudget * 0.15),
          pricingSource: "EVORA benchmark estimate",
          notes: "Stage backdrop, entrance floral arch, and ambient lighting.",
        },
        {
          service: "Photography & Videography",
          suggestedBudget: Math.round(totalBudget * 0.12),
          pricingSource: "EVORA benchmark estimate",
          notes: "1 candid photographer and 1 traditional videographer coverage.",
        },
        {
          service: "Sound & DJ",
          suggestedBudget: Math.round(totalBudget * 0.08),
          pricingSource: "EVORA benchmark estimate",
          notes: "PA audio system with wireless mics and background music console.",
        },
      ],
      cheaperAlternatives: [
        {
          service: "Decoration",
          suggestion: "Opt for seasonal local blooms combined with fabric drapes instead of imported exotic flowers.",
          potentialSavings: Math.round(totalBudget * 0.04),
        },
        {
          service: "Catering",
          suggestion: "Streamline dessert counters to 2 premium signature sweets rather than 5 generic options to cut wastage.",
          potentialSavings: Math.round(totalBudget * 0.05),
        },
      ],
      summaryNote: "Budget balanced within platform benchmarks. 40% reserved for catering to ensure high guest satisfaction.",
    };
  }

  // 2. Food Recommendation
  if (combined.includes("welcomedrinks") || combined.includes("maincourse") || combined.includes("dietaryalternatives")) {
    const guestMatch = userPrompt.match(/Guest Count:\s*(\d+)/i);
    const guests = guestMatch ? parseInt(guestMatch[1], 10) : 100;

    return {
      title: "Celebration Feast Menu & Catering Plan",
      welcomeDrinks: [
        { item: "Fresh Mint & Lychee Cooler", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Served chilled at welcome counter" },
        { item: "Spiced Masala Buttermilk", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Digestive cooler option" },
      ],
      starters: [
        { item: "Paneer Tikka Angara", servings: guests, quantityEstimate: `${Math.round(guests * 0.12)} kg paneer`, notes: "Live skewer counter" },
        { item: "Crispy Corn & Water Chestnut Salt-and-Pepper", servings: guests, quantityEstimate: `${Math.round(guests * 0.10)} kg`, notes: "Golden tossed with fresh scallions" },
      ],
      mainCourse: [
        { item: "Hyderabadi Shahi Dum Biryani", servings: guests, quantityEstimate: `${Math.round(guests * 0.35)} kg`, notes: "Served with Mirchi Ka Salan and creamy Burrani Raita" },
        { item: "Paneer Butter Masala", servings: guests, quantityEstimate: `${Math.round(guests * 0.18)} kg`, notes: "Rich cashew-tomato gravy" },
        { item: "Dal Makhani", servings: guests, quantityEstimate: `${Math.round(guests * 0.20)} kg`, notes: "Slow-cooked overnight with white butter" },
      ],
      sideDishes: [
        { item: "Butter Naan & Tandoori Roti Basket", servings: Math.round(guests * 2.5), quantityEstimate: `${Math.round(guests * 2.5)} pieces`, notes: "Fresh from live tandoor" },
        { item: "Mixed Green Salad & Achar Platter", servings: guests, quantityEstimate: "Platter array", notes: "Fresh farm greens" },
      ],
      desserts: [
        { item: "Warm Gulab Jamun with Rabdi", servings: guests, quantityEstimate: `${Math.round(guests * 1.5)} pieces`, notes: "Garnished with toasted pistachios" },
        { item: "Kesar Pista Kulfi Sticks", servings: guests, quantityEstimate: `${guests} sticks`, notes: "Rich artisanal dry-fruit kulfi" },
      ],
      dietaryAlternatives: [
        { restrictionOrAllergy: "Vegan / Lactose Intolerant", substituteItem: "Tofu Makhani & Olive Oil Roti", notes: "Separate preparation station" },
        { restrictionOrAllergy: "Gluten Free", substituteItem: "Steamed Basmati Rice & Corn Roti", notes: "Dedicated gluten-free portions" },
      ],
      estimatedTotalCost: guests * 450,
      costAssumptions: [
        "Based on premium caterer pricing benchmark of ₹450 - ₹550 per plate in Hyderabad.",
        "Includes cutlery, live service staff, chaffing dishes, and beverage glasses.",
      ],
      wasteReductionTips: [
        "Prepare 85% batch initially; keep remaining 15% in cold holding to reheat only if replenishment is demanded.",
        "Utilize EVORA Charity AI to dispatch untouched feast surplus to local shelters within 2 hours.",
      ],
    };
  }

  // 3. Invitation Generator
  if (combined.includes("headline") || combined.includes("shortsharetext")) {
    return {
      headline: "Cordially Invited to Celebrate With Us",
      message: "With immense joy and gratitude in our hearts, we warmly invite you and your family to join us in celebrating this auspicious milestone. Your gracious presence and heartfelt blessings will make this celebration truly complete and memorable for us all.",
      shortShareText: "✨ You are cordially invited to celebrate with us! We look forward to your warm presence and blessings. Please join us for this joyous celebration.",
    };
  }

  // 4. Checklist Generator
  if (combined.includes("tasks") || combined.includes("daysbefore")) {
    return {
      title: "Celebration Milestone & Preparation Checklist",
      tasks: [
        { title: "Finalize & Secure Venue Booking", category: "Venue", daysBefore: 45, description: "Confirm hall capacity, parking buffer, and paid advance." },
        { title: "Select Catering Menu & Tasting Session", category: "Catering", daysBefore: 30, description: "Approve welcome drinks, main course items, and dietary substitutes." },
        { title: "Book Photography & Cinematography Crew", category: "Photography", daysBefore: 28, description: "Brief team on key family portraits and highlight reel timings." },
        { title: "Finalize Stage Decor & Floral Themes", category: "Decoration", daysBefore: 21, description: "Confirm backdrop dimensions, entrance arch, and lighting palette." },
        { title: "Send Formal Digital Invitations & Track RSVPs", category: "General", daysBefore: 18, description: "Share personalized invitation links with guest list." },
        { title: "Coordinate Sound, DJ & Audio Equipment", category: "Music & Sound", daysBefore: 14, description: "Check wireless microphones, speaker output, and playlists." },
        { title: "Confirm Final Headcount with Caterer", category: "Catering", daysBefore: 5, description: "Lock in final plates count to prevent unnecessary wastage." },
        { title: "Event Day Rehearsal & Coordination Briefing", category: "General", daysBefore: 1, description: "Review timeline with family leads and on-ground coordinators." },
      ],
    };
  }

  // 5. Event Planning Assistant (Blueprint)
  return {
    eventTitle: "Grand Celebrations Blueprint",
    eventType: "Celebration",
    eventCategory: "Wedding",
    date: "",
    time: "18:00",
    location: "Hyderabad",
    venue: "Boutique Banquet Hall",
    guestCount: 150,
    budget: 350000,
    suggestedTheme: "Royal Nizami & Contemporary Floral",
    description: "An elegant gathering combining warm traditional hospitality with modern entertainment, featuring curated dining and ambient decor.",
    suggestedServices: [
      { name: "Venue", category: "Venue", reason: "Spacious banquet with comfortable seating and valet parking.", estimatedCost: 90000 },
      { name: "Catering", category: "Catering", reason: "Multi-course regional dinner menu with live dessert counters.", estimatedCost: 140000 },
      { name: "Decoration", category: "Decoration", reason: "Floral stage backdrop, entrance arch, and warm LED fairy lights.", estimatedCost: 55000 },
      { name: "Photography", category: "Photography", reason: "Comprehensive traditional and candid high-definition coverage.", estimatedCost: 40000 },
      { name: "Music & Sound", category: "Sound & DJ", reason: "Acoustic setup, background lounge music, and master of ceremonies mic.", estimatedCost: 25000 },
    ],
    schedule: [
      { time: "18:00 - 19:00", activity: "Guest arrival, welcome coolers & live instrumental music" },
      { time: "19:00 - 20:30", activity: "Main ceremony, felicitations & photography portraits" },
      { time: "20:30 - 22:30", activity: "Grand celebratory dinner buffet & dessert counters" },
      { time: "22:30 - 23:00", activity: "Farewell & surplus food rescue coordination" },
    ],
  };
}

/**
 * Charity AI: Generates a concise reason why a charity is recommended for surplus donation.
 */
const generateCharityRecommendationExplanation = async ({ charity, surplusDetails }) => {
  const dist = charity.distanceKm !== undefined ? charity.distanceKm : "approx. 4";
  const capacity = charity.capacityPerDay || 150;
  const acceptsCooked = charity.acceptsCookedFood ? "Yes" : "No";
  const qty = surplusDetails?.quantity || 100;
  const unit = surplusDetails?.unit || "plates";
  const timeRemaining = charity.remainingMins !== undefined ? `${charity.remainingMins} mins` : "under 4 hours";

  const systemPrompt = `You are EVORA Charity AI, an intelligent event food-rescue coordinator in Hyderabad.
Write a concise, compelling 2-sentence explanation of why this charity was selected as the optimal match for surplus food donation.
Cover: proximity/transit time, willingness to accept cooked food, and capacity alignment vs surplus quantity.
Keep it strictly under 50 words, warm, professional, and factual.`;

  const userPrompt = `Charity Name: ${charity.name} (${charity.type})
Distance: ${dist} km
Accepts Cooked Food: ${acceptsCooked}
Daily Capacity: ${capacity} people
Surplus Available: ${qty} ${unit}
Time remaining before safe limit: ${timeRemaining}
Operating hours: ${charity.operatingHours || "08:00 - 22:00"}`;

  try {
    const { text } = await callGemini({
      systemInstruction: systemPrompt,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      temperature: 0.4,
    });
    return text.trim();
  } catch (err) {
    // Deterministic fallback explanation if LLM is unavailable or key is unconfigured
    return `Optimal match located ${dist} km away (~${Math.round(Number(dist) * 3 + 25)} mins transit). ${
      charity.acceptsCookedFood ? "Accepts freshly prepared cooked meals" : "Equipped for rapid redistribution"
    } with daily capacity for ${capacity} individuals, fitting this ${qty} ${unit} donation before safety cutoff.`;
  }
};

/**
 * Charity AI: Drafts an urgent, respectful donation pickup notification message for charity volunteers.
 */
const generateDonationRequestMessage = async ({ charity, surplusDetails, organizerName, eventName }) => {
  const systemPrompt = `You are EVORA Charity AI. Draft a concise 2-sentence urgent pickup dispatch message from the event organizer to the charity/shelter coordinator. Mention the event name, quantity of meals, and pickup location clearly.`;

  const userPrompt = `Event: "${eventName || "Celebration Feast"}"
Organizer: ${organizerName || "Organizer"}
Food: ${surplusDetails?.quantity || 50} ${surplusDetails?.unit || "plates"} (${(surplusDetails?.foodItems || []).map((f) => f.name).join(", ") || "Fresh Cooked Meals"})
Pickup Venue: ${surplusDetails?.pickupAddress || "Event Venue, Hyderabad"}
Safe Until: ${surplusDetails?.safeUntil ? new Date(surplusDetails.safeUntil).toLocaleTimeString() : "Within 3 hours"}`;

  try {
    const { text } = await callGemini({
      systemInstruction: systemPrompt,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      temperature: 0.3,
    });
    return text.trim();
  } catch {
    return `Surplus food donation from "${eventName || "Celebration Feast"}": ${surplusDetails?.quantity || 50} ${
      surplusDetails?.unit || "plates"
    } prepared fresh. Ready for pickup at ${surplusDetails?.pickupAddress || "Venue"} before safe consumption window expires.`;
  }
};

module.exports = {
  AIServiceError,
  generateChat,
  generateStructuredJson,
  generateCharityRecommendationExplanation,
  generateDonationRequestMessage,
};
