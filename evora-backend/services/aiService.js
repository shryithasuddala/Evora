const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];

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
  timeoutMs = 15000,
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
  timeoutMs = 15000,
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

  // 2. Food Recommendation (Region & Place-Aware)
  if (combined.includes("welcomedrinks") || combined.includes("maincourse") || combined.includes("dietaryalternatives")) {
    const guestMatch = userPrompt.match(/Guest Count:\s*(\d+)/i);
    const guests = guestMatch ? parseInt(guestMatch[1], 10) : 100;

    const placeMatch = userPrompt.match(/(?:City \/ Region|Target Place \/ City \/ Cuisine Region|City \/ Cuisine Region|location):\s*([^\n\r]+)/i);
    const place = (placeMatch ? placeMatch[1].trim() : "Hyderabad").toLowerCase();

    // 1. Chennai / Tamil Nadu
    if (place.includes("chennai") || place.includes("tamil")) {
      return {
        title: `Authentic Chennai & Tamil Feast Menu for ${guests} Guests`,
        welcomeDrinks: [
          { item: "Chilled Nannari Sharbat", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Traditional herbal root cooler with basil seeds" },
          { item: "Madras Filter Kaapi Cooler / Panakam", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Traditional jaggery-dry ginger thirst quencher" },
        ],
        starters: [
          { item: "Crispy Medu Vada with Chutney Trio", servings: Math.round(guests * 1.5), quantityEstimate: `${Math.round(guests * 1.5)} pieces`, notes: "Golden lentil donuts served with coconut, tomato & mint chutneys" },
          { item: "Chettinad Paneer 65 & Babycorn Roast", servings: guests, quantityEstimate: `${Math.round(guests * 0.12)} kg`, notes: "Tossed in fiery curry leaves and Chettinad masala" },
        ],
        mainCourse: [
          { item: "Chettinad Style Vegetable Dum Biryani", servings: guests, quantityEstimate: `${Math.round(guests * 0.35)} kg`, notes: "Seeraga samba rice cooked with stone-ground spices" },
          { item: "Traditional Ennai Kathirikai (Baby Brinjal Curry)", servings: guests, quantityEstimate: `${Math.round(guests * 0.18)} kg`, notes: "Rich sesame-peanut tamarind gravy, Chennai wedding staple" },
          { item: "Authentic Madras Drumstick Sambhar & Mysore Rasam", servings: guests, quantityEstimate: `${Math.round(guests * 0.22)} Liters`, notes: "Simmered with shallots, drumsticks and freshly roasted spices" },
        ],
        sideDishes: [
          { item: "Appam with Coconut Milk & Malabar Parotta", servings: Math.round(guests * 2.5), quantityEstimate: `${Math.round(guests * 2.5)} pieces`, notes: "Freshly made on live counters" },
          { item: "Urulai Roast & Cabbage Poriyal", servings: guests, quantityEstimate: `${Math.round(guests * 0.10)} kg`, notes: "Crispy potato roast and coconut-tempered greens" },
        ],
        desserts: [
          { item: "Elaneer Payasam (Tender Coconut Pudding)", servings: guests, quantityEstimate: `${Math.round(guests * 0.15)} Liters`, notes: "Delicate tender coconut pulp in thickened cardamon-infused milk" },
          { item: "Warm Ghee Mysore Pak", servings: guests, quantityEstimate: `${guests} pieces`, notes: "Melt-in-mouth artisanal pure ghee delicacy" },
        ],
        dietaryAlternatives: [
          { restrictionOrAllergy: "Lactose Intolerant / Vegan", substituteItem: "Coconut Milk Poriyal & Steamed Idiyappam", notes: "100% dairy-free South Indian specialty" },
          { restrictionOrAllergy: "Gluten Free", substituteItem: "Steamed Ponni Rice, Rasam & Appam", notes: "Naturally gluten-free grain preparation" },
        ],
        estimatedTotalCost: guests * 420,
        costAssumptions: [
          "Curated based on authentic Chennai and Tamil Nadu wedding catering benchmarks (₹400 - ₹500/plate).",
          "Includes banana leaf or premium porcelain dinnerware, live Appam counter, and service staff.",
        ],
        wasteReductionTips: [
          "Live Appam and Parotta counters made-to-order to eliminate over-production.",
          "Coordinate untouched cooked feast portions with Chennai food bank networks.",
        ],
      };
    }

    // 2. Kerala
    if (place.includes("kerala") || place.includes("kochi") || place.includes("malabar")) {
      return {
        title: `Authentic Kerala Traditional Feast (Sadya Inspired) for ${guests} Guests`,
        welcomeDrinks: [
          { item: "Fresh Kulukki Sarbath", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Shaken iced lemon cooler with green chilli and basil seeds" },
          { item: "Tender Coconut & Mint Cooler", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Pure Elaneer water with mint essence" },
        ],
        starters: [
          { item: "Nendran Banana Chips & Jackfruit Crisps", servings: guests, quantityEstimate: `${Math.round(guests * 0.08)} kg`, notes: "Fried in pure coconut oil with sea salt" },
          { item: "Vazhaipoo (Banana Blossom) Cutlets & Parippu Vada", servings: guests, quantityEstimate: `${Math.round(guests * 1.5)} pieces`, notes: "Crunchy tea-time savory bites" },
        ],
        mainCourse: [
          { item: "Malabar Ghee Rice with Vegetable Kurma", servings: guests, quantityEstimate: `${Math.round(guests * 0.30)} kg`, notes: "Fragrant Kaima rice flavored with ghee and whole spices" },
          { item: "Traditional Avial & Beetroot Pachadi", servings: guests, quantityEstimate: `${Math.round(guests * 0.20)} kg`, notes: "Mixed garden vegetables in curd and coconut paste" },
          { item: "Kerala Varutharacha Sambar & Moru Curry", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Slow roasted coconut spice blend gravy" },
        ],
        sideDishes: [
          { item: "Fluffy Malabar Parotta & Idiyappam", servings: Math.round(guests * 2.5), quantityEstimate: `${Math.round(guests * 2.5)} pieces`, notes: "Flaky layered parottas and delicate rice string hoppers" },
          { item: "Cabbage Thoran & Inji Puli Pickle", servings: guests, quantityEstimate: `${Math.round(guests * 0.10)} kg`, notes: "Stir-fried coconut greens with tangy sweet-sour ginger dip" },
        ],
        desserts: [
          { item: "Traditional Ada Pradhaman", servings: guests, quantityEstimate: `${Math.round(guests * 0.15)} Liters`, notes: "Rice flakes slow-cooked in thick jaggery syrup and coconut milk" },
          { item: "Palada Payasam", servings: guests, quantityEstimate: `${Math.round(guests * 0.15)} Liters`, notes: "Pink sweet condensed milk payasam" },
        ],
        dietaryAlternatives: [
          { restrictionOrAllergy: "Vegan", substituteItem: "Coconut Milk Avial & Red Matta Rice", notes: "Zero dairy traditional preparation" },
          { restrictionOrAllergy: "Gluten Free", substituteItem: "Kerala Idiyappam & Stew", notes: "100% steamed rice flour base" },
        ],
        estimatedTotalCost: guests * 440,
        costAssumptions: [
          "Estimated at ₹400 - ₹500 per plate following standard Kerala celebration catering tariffs.",
          "Includes traditional plantain leaf presentation and trained service staff.",
        ],
        wasteReductionTips: [
          "Stage replenishment in 2 cycles to keep rice hot and avoid cold surplus.",
          "Leftover cooked Sadya staples safely donated through local volunteer networks.",
        ],
      };
    }

    // 3. Bangalore / Karnataka
    if (place.includes("bangalore") || place.includes("bengaluru") || place.includes("karnataka") || place.includes("mysore")) {
      return {
        title: `Royal Karnataka & Mysore Celebration Feast for ${guests} Guests`,
        welcomeDrinks: [
          { item: "Chilled Badam Milk with Saffron & Pistachio", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Rich almond cooler flavored with cardamom" },
          { item: "Belagavi Kokum & Jeera Punch", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Digestive tangy cooler" },
        ],
        starters: [
          { item: "Crispy Maddur Vada", servings: Math.round(guests * 1.5), quantityEstimate: `${Math.round(guests * 1.5)} pieces`, notes: "Karnataka's famous crunchy onion-semolina specialty" },
          { item: "Udupi Paneer Ghee Roast", servings: guests, quantityEstimate: `${Math.round(guests * 0.12)} kg`, notes: "Fiery red Byadagi chilli paste roasted in pure desi ghee" },
        ],
        mainCourse: [
          { item: "Authentic Karnataka Bisi Bele Bath", servings: guests, quantityEstimate: `${Math.round(guests * 0.35)} kg`, notes: "Served with spiced Kara Boondi and Potato Chips" },
          { item: "Badanekayi Yennegayi (Stuffed Brinjal)", servings: guests, quantityEstimate: `${Math.round(guests * 0.18)} kg`, notes: "North Karnataka specialty with peanut-sesame masala" },
          { item: "Udupi Pineapple Menaskai & Tovve Dal", servings: guests, quantityEstimate: `${Math.round(guests * 0.20)} Liters`, notes: "Sweet, tangy and spicy pineapple stew" },
        ],
        sideDishes: [
          { item: "Akki Roti & Poori with Mixed Vegetable Sagu", servings: Math.round(guests * 2.5), quantityEstimate: `${Math.round(guests * 2.5)} pieces`, notes: "Rice flour flatbread prepared on tawa" },
          { item: "Hesaru Bele Kosambari & Happala", servings: guests, quantityEstimate: `${Math.round(guests * 0.10)} kg`, notes: "Tempered split moong dal salad with grated carrot and cucumber" },
        ],
        desserts: [
          { item: "Authentic Soft Ghee Mysore Pak", servings: guests, quantityEstimate: `${guests} pieces`, notes: "Classic royal recipe with pure desi ghee" },
          { item: "Dharwad Peda & Chiroti with Badam Milk", servings: guests, quantityEstimate: `${guests} pieces`, notes: "Rich caramelized milk confection and layered pastry" },
        ],
        dietaryAlternatives: [
          { restrictionOrAllergy: "Gluten Free", substituteItem: "Akki Roti with Sagu & Bisi Bele Bath", notes: "Dedicated wheat-free preparation" },
          { restrictionOrAllergy: "Lactose Intolerant", substituteItem: "Vegetable Pulao & Yennegayi without Ghee", notes: "Prepared in cold-pressed sesame oil" },
        ],
        estimatedTotalCost: guests * 430,
        costAssumptions: [
          "Based on Bangalore / Karnataka caterer benchmarks at ₹400 - ₹500 per plate.",
          "Includes live counter tawa equipment, chaffing sets, and service staff.",
        ],
        wasteReductionTips: [
          "Fresh Akki Roti pressed on demand to avoid drying and excess waste.",
          "Surplus Bisi Bele Bath portions dispatched to food distribution charities within 2 hours.",
        ],
      };
    }

    // 4. North India / Punjab / Delhi
    if (place.includes("punjab") || place.includes("delhi") || place.includes("amritsar") || place.includes("north")) {
      return {
        title: `Royal North Indian & Punjabi Celebration Feast for ${guests} Guests`,
        welcomeDrinks: [
          { item: "Thick Amritsari Sweet Masala Lassi", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Served in earthen Kulhads with malai and crushed pistachio" },
          { item: "Rooh Afza Rose & Lemon Shikanji", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Refreshing summer rose cooler with mint" },
        ],
        starters: [
          { item: "Amritsari Paneer Tikka & Dahi Ke Sholay", servings: guests, quantityEstimate: `${Math.round(guests * 0.12)} kg`, notes: "Tandoori char-grilled cottage cheese and crispy hung-curd rolls" },
          { item: "Tandoori Soya Chaap & Corn Seekh Kebab", servings: guests, quantityEstimate: `${Math.round(guests * 0.12)} kg`, notes: "Served with mint chutney and laccha onion" },
        ],
        mainCourse: [
          { item: "Dal Makhani (Slow-Cooked 12 Hours)", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} kg`, notes: "Finished with white butter and aromatic kasuri methi" },
          { item: "Paneer Lababdar & Dum Aloo Kashmiri", servings: guests, quantityEstimate: `${Math.round(guests * 0.22)} kg`, notes: "Rich onion-tomato gravy with grated paneer garnish" },
          { item: "Shahi Jeera Pulao & Pindi Chole", servings: guests, quantityEstimate: `${Math.round(guests * 0.30)} kg`, notes: "Dark spiced chickpeas cooked with anardana" },
        ],
        sideDishes: [
          { item: "Amritsari Stuffed Kulcha & Garlic Butter Naan", servings: Math.round(guests * 2.5), quantityEstimate: `${Math.round(guests * 2.5)} pieces`, notes: "Crisp from live tandoor oven" },
          { item: "Boondi Raita & Sirka Pyaaz Platter", servings: guests, quantityEstimate: "Platter array", notes: "Pickled baby onions and roasted cumin curd" },
        ],
        desserts: [
          { item: "Hot Gulab Jamun with Rabdi", servings: guests, quantityEstimate: `${Math.round(guests * 1.5)} pieces`, notes: "Served steaming hot alongside creamy reduced milk" },
          { item: "Kesar Pista Matka Kulfi Falooda", servings: guests, quantityEstimate: `${guests} matkas`, notes: "Hand-churned saffron dry fruit kulfi" },
        ],
        dietaryAlternatives: [
          { restrictionOrAllergy: "Vegan", substituteItem: "Tofu Lababdar with Tandoori Roti without butter", notes: "Prepared with cashew-tomato base" },
          { restrictionOrAllergy: "Gluten Free", substituteItem: "Makki Di Roti & Steamed Rice", notes: "Cornmeal bread prepared separately" },
        ],
        estimatedTotalCost: guests * 460,
        costAssumptions: [
          "Standard North Indian premium catering range of ₹450 - ₹550 per plate.",
          "Covers live tandoor counters, copper chaffing dishes, and uniformed servers.",
        ],
        wasteReductionTips: [
          "Breads baked strictly in response to live buffet flow.",
          "EVORA surplus donation coordinated at end of feast.",
        ],
      };
    }

    // 5. Kolkata / Bengal
    if (place.includes("kolkata") || place.includes("bengal") || place.includes("calcutta")) {
      return {
        title: `Authentic Bengali Royal Celebration Feast for ${guests} Guests`,
        welcomeDrinks: [
          { item: "Gondhoraj Lebu Sharbat", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Scented with the famous royal Gondhoraj lime" },
          { item: "Aam Pora Shorbat", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Char-roasted green mango cooler with black salt" },
        ],
        starters: [
          { item: "Crispy Mochar Chop (Banana Blossom Cutlets)", servings: Math.round(guests * 1.5), quantityEstimate: `${Math.round(guests * 1.5)} pieces`, notes: "Crusted with breadcrumbs, served with Kasundi mustard" },
          { item: "Posto Boda & Paneer Kabiraji", servings: guests, quantityEstimate: `${Math.round(guests * 0.12)} kg`, notes: "Poppy seed patties and lace-fried cottage cheese" },
        ],
        mainCourse: [
          { item: "Kolkata Special Aromatic Vegetable Biryani", servings: guests, quantityEstimate: `${Math.round(guests * 0.35)} kg`, notes: "Cooked with ghee-roasted potatoes and saffron" },
          { item: "Chanar Dalna (Cottage Cheese Kofta Curry)", servings: guests, quantityEstimate: `${Math.round(guests * 0.20)} kg`, notes: "Soft handmade chhena cubes in a mild ginger-cumin gravy" },
          { item: "Dhokar Dalna & Narkel Diye Chholar Dal", servings: guests, quantityEstimate: `${Math.round(guests * 0.22)} kg`, notes: "Lentil cakes and Bengal gram simmered with coconut slices" },
        ],
        sideDishes: [
          { item: "Golden Luchi & Koraishutir Kochuri", servings: Math.round(guests * 3), quantityEstimate: `${Math.round(guests * 3)} pieces`, notes: "Puffed deep-fried bread and green pea stuffed pastries" },
          { item: "Plastic Chutney (Raw Papaya) & Papad", servings: guests, quantityEstimate: `${Math.round(guests * 0.10)} kg`, notes: "Sweet translucent winter chutney" },
        ],
        desserts: [
          { item: "Authentic Nolen Gur Mishti Doi", servings: guests, quantityEstimate: `${guests} earthen pots`, notes: "Clay pot cultured yogurt sweetened with date palm jaggery" },
          { item: "Warm Spongy Rosogolla & Kanchagolla Sandesh", servings: guests, quantityEstimate: `${Math.round(guests * 1.5)} pieces`, notes: "Classic Bengal chhena confections" },
        ],
        dietaryAlternatives: [
          { restrictionOrAllergy: "Gluten Free", substituteItem: "Steamed Gobindobhog Rice with Chholar Dal", notes: "Gluten-free traditional rice specialty" },
          { restrictionOrAllergy: "Vegan", substituteItem: "Aloo Posto with Steamed Rice", notes: "Dairy-free poppy seed potato dish" },
        ],
        estimatedTotalCost: guests * 450,
        costAssumptions: [
          "Based on Kolkata wedding caterer rates (₹420 - ₹520 per plate).",
          "Includes traditional clay handis, Kasundi dips, and buffet service staff.",
        ],
        wasteReductionTips: [
          "Luchis fried in rolling batches directly at the counter.",
          "Surplus desserts securely packed for local distribution.",
        ],
      };
    }

    // 6. Rajasthan
    if (place.includes("rajasthan") || place.includes("jaipur") || place.includes("udaipur") || place.includes("marwar")) {
      return {
        title: `Royal Marwari & Rajasthani Celebration Feast for ${guests} Guests`,
        welcomeDrinks: [
          { item: "Bikaneri Jaljeera Cooler with Boondi", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Tangy mint-cumin cooler" },
          { item: "Royal Masala Chaas with Roasted Cumin", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Tempered churned buttermilk" },
        ],
        starters: [
          { item: "Mini Jodhpuri Pyaaz Ki Kachori", servings: Math.round(guests * 1.5), quantityEstimate: `${Math.round(guests * 1.5)} pieces`, notes: "Flaky pastry stuffed with spiced onion filling and tamarind chutney" },
          { item: "Rajasthani Mirchi Vada Bites & Sangri Tikki", servings: guests, quantityEstimate: `${Math.round(guests * 0.12)} kg`, notes: "Mild Bhavnagri peppers stuffed with spiced potato" },
        ],
        mainCourse: [
          { item: "Traditional Dal Baati Churma", servings: guests, quantityEstimate: `${Math.round(guests * 0.35)} kg`, notes: "Panchmel dal, oven-baked wheat baatis with pure ghee, and sweet churma" },
          { item: "Authentic Ker Sangri & Gatte Ki Sabzi", servings: guests, quantityEstimate: `${Math.round(guests * 0.20)} kg`, notes: "Desert beans-berries and gram flour dumplings in curd gravy" },
          { item: "Govind Gatta & Jodhpuri Kabuli Pulao", servings: guests, quantityEstimate: `${Math.round(guests * 0.22)} kg`, notes: "Stuffed gatta curry and royal layered rice" },
        ],
        sideDishes: [
          { item: "Bajre Ki Roti & Missi Roti with Desi Makhan", servings: Math.round(guests * 2), quantityEstimate: `${Math.round(guests * 2)} pieces`, notes: "Millet and chickpea flatbreads served with fresh white butter" },
          { item: "Spicy Lehsun Ki Chutney & Kachumber", servings: guests, quantityEstimate: "Platter array", notes: "Fiery red garlic paste and fresh cucumber salad" },
        ],
        desserts: [
          { item: "Royal Malai Ghevar with Rabdi", servings: guests, quantityEstimate: `${guests} pieces`, notes: "Honeycomb disc soaked in saffron syrup topped with thick rabdi" },
          { item: "Moong Dal Halwa with Khoya", servings: guests, quantityEstimate: `${Math.round(guests * 0.10)} kg`, notes: "Slow-roasted yellow lentil pudding with toasted dry fruits" },
        ],
        dietaryAlternatives: [
          { restrictionOrAllergy: "Gluten Free", substituteItem: "Bajre Ki Roti with Dal & Gatte Ki Sabzi", notes: "Millet bread prepared without wheat" },
          { restrictionOrAllergy: "Vegan", substituteItem: "Ker Sangri & Steamed Pulao without Ghee", notes: "Prepared with mustard oil" },
        ],
        estimatedTotalCost: guests * 480,
        costAssumptions: [
          "Estimated at ₹450 - ₹550 per plate following Rajasthani royal banquet standards.",
          "Includes pure desi ghee allocations and traditional brass/copper chaffing service.",
        ],
        wasteReductionTips: [
          "Baatis kept in warming ovens and broken with ghee per table request.",
          "Remaining feast components donated via EVORA Charity integration.",
        ],
      };
    }

    // 7. Gujarat
    if (place.includes("gujarat") || place.includes("ahmedabad") || place.includes("surat")) {
      return {
        title: `Authentic Gujarati & Kathiyawadi Celebration Feast for ${guests} Guests`,
        welcomeDrinks: [
          { item: "Keri No Panna (Raw Mango Cooler)", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Spiced with roasted cumin and mint" },
          { item: "Chilled Masala Chhas with Coriander", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Light digestive buttermilk" },
        ],
        starters: [
          { item: "Nylon Khaman Dhokla with Fried Green Chillies", servings: Math.round(guests * 1.5), quantityEstimate: `${Math.round(guests * 1.5)} pieces`, notes: "Steamed fluffy gram flour cakes tempered with mustard seeds" },
          { item: "Khandvi Rolls & Lilva Kachori", servings: guests, quantityEstimate: `${Math.round(guests * 0.12)} kg`, notes: "Silky rolled savory gram flour bites with fresh coconut garnish" },
        ],
        mainCourse: [
          { item: "Authentic Surti Undhiyu", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} kg`, notes: "Seasonal winter vegetables and fenugreek muthiyas slow cooked with spices" },
          { item: "Sweet & Tangy Gujarati Kadhi", servings: guests, quantityEstimate: `${Math.round(guests * 0.22)} Liters`, notes: "Yogurt and gram flour soup seasoned with cinnamon and cloves" },
          { item: "Kathiyawadi Sev Tameta & Gujarati Dal-Bhat", servings: guests, quantityEstimate: `${Math.round(guests * 0.30)} kg`, notes: "Crisp sev in juicy tomato curry and aromatic sweet dal with rice" },
        ],
        sideDishes: [
          { item: "Soft Phulka Rotli with Desi Ghee & Puri", servings: Math.round(guests * 3), quantityEstimate: `${Math.round(guests * 3)} pieces`, notes: "Ultra-thin whole wheat rotlis smeared with ghee" },
          { item: "Sambharo (Warm Cabbage-Carrot Stir Fry) & Chhundo", servings: guests, quantityEstimate: `${Math.round(guests * 0.10)} kg`, notes: "Sweet mango pickle and crunchy mustard salad" },
        ],
        desserts: [
          { item: "Kesar Pista Shrikhand with Warm Puri", servings: guests, quantityEstimate: `${Math.round(guests * 0.12)} kg`, notes: "Strained yogurt infused with saffron strands and crushed pistachios" },
          { item: "Traditional Dudhi No Halwa / Mohanthal", servings: guests, quantityEstimate: `${guests} pieces`, notes: "Rich fudge sweetened with cardamom and mawa" },
        ],
        dietaryAlternatives: [
          { restrictionOrAllergy: "Jain", substituteItem: "Jain Undhiyu (without root veggies) & Jain Kadhi", notes: "Strictly zero onion/garlic/potatoes" },
          { restrictionOrAllergy: "Vegan", substituteItem: "Sev Tameta & Rotli without Ghee", notes: "Dairy-free Gujarati preparation" },
        ],
        estimatedTotalCost: guests * 410,
        costAssumptions: [
          "Estimated at ₹380 - ₹460 per plate reflecting traditional Gujarati caterer packages.",
          "Includes continuous hot Phulka service from live rotli chulhas.",
        ],
        wasteReductionTips: [
          "Phulkas rolled and puffed live on table-side request to minimize cold rotli waste.",
          "Surplus dal and sabzi quickly coordinated with regional hunger relief teams.",
        ],
      };
    }

    // 8. Mumbai / Maharashtra
    if (place.includes("mumbai") || place.includes("maharashtra") || place.includes("pune")) {
      return {
        title: `Authentic Maharashtrian Celebration Feast for ${guests} Guests`,
        welcomeDrinks: [
          { item: "Authentic Solkadhi", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Tangy kokum juice infused with fresh coconut milk and garlic" },
          { item: "Kokum Sharbat with Sabja Seeds", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Sweet and sour cooling coastal beverage" },
        ],
        starters: [
          { item: "Crispy Kothimbir Vadi with Green Chutney", servings: Math.round(guests * 1.5), quantityEstimate: `${Math.round(guests * 1.5)} pieces`, notes: "Steamed and fried coriander-gram flour cakes" },
          { item: "Mini Batata Vada & Sabudana Vada", servings: guests, quantityEstimate: `${Math.round(guests * 0.12)} kg`, notes: "Golden potato fritters and tapioca peanut patties" },
        ],
        mainCourse: [
          { item: "Bharli Vangi (Maharashtrian Stuffed Eggplant)", servings: guests, quantityEstimate: `${Math.round(guests * 0.22)} kg`, notes: "Cooked in roasted Goda masala, peanuts and grated coconut" },
          { item: "Katachi Amti (Spiced Chana Dal Soup)", servings: guests, quantityEstimate: `${Math.round(guests * 0.20)} Liters`, notes: "Thin tempered dal with sweet and spicy flavor profile" },
          { item: "Maharashtrian Masale Bhaat", servings: guests, quantityEstimate: `${Math.round(guests * 0.32)} kg`, notes: "Spiced rice cooked with Ivy gourd (tindora) and cashews" },
        ],
        sideDishes: [
          { item: "Hot Poli (Chapati) & Poori Basket", servings: Math.round(guests * 2.5), quantityEstimate: `${Math.round(guests * 2.5)} pieces`, notes: "Soft wheat flatbreads with ghee" },
          { item: "Khamang Kakdi Salad & Mirchi Cha Thecha", servings: guests, quantityEstimate: `${Math.round(guests * 0.10)} kg`, notes: "Cucumber peanut salad with fiery crushed green chilli relish" },
        ],
        desserts: [
          { item: "Warm Puran Poli with Desi Ghee & Milk", servings: guests, quantityEstimate: `${Math.round(guests * 1.2)} pieces`, notes: "Sweet flatbread stuffed with jaggery and cardamom chana dal" },
          { item: "Ukadiche Modak / Mango Shrikhand", servings: guests, quantityEstimate: `${guests} pieces`, notes: "Steamed rice flour dumplings stuffed with coconut and jaggery" },
        ],
        dietaryAlternatives: [
          { restrictionOrAllergy: "Vegan", substituteItem: "Bharli Vangi & Steamed Rice without Ghee", notes: "Prepared with cold-pressed groundnut oil" },
          { restrictionOrAllergy: "Gluten Free", substituteItem: "Jowar Bhakri with Katachi Amti", notes: "Traditional sorghum millet bread" },
        ],
        estimatedTotalCost: guests * 430,
        costAssumptions: [
          "Estimated at ₹400 - ₹480 per plate adhering to Mumbai/Pune event catering standards.",
          "Includes live Puran Poli hot plate and trained hospitality personnel.",
        ],
        wasteReductionTips: [
          "Hot poli and modak served in controlled buffet runs.",
          "Food rescue volunteers notified for prompt surplus pickup.",
        ],
      };
    }

    // Default: Royal Hyderabad & Deccan Menu
    return {
      title: `Royal Nizami & Hyderabadi Celebration Feast for ${guests} Guests`,
      welcomeDrinks: [
        { item: "Royal Rose Falooda Sharbat with Basil Seeds", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Traditional cooling rose cooler garnished with slivered pistachios" },
        { item: "Fresh Mint & Lychee Cooler", servings: guests, quantityEstimate: `${Math.round(guests * 0.25)} Liters`, notes: "Refreshing welcome beverage served chilled at entrance" },
      ],
      starters: [
        { item: "Paneer Tikka Angara", servings: guests, quantityEstimate: `${Math.round(guests * 0.12)} kg paneer`, notes: "Live skewer charcoal counter with spicy mint dip" },
        { item: "Crispy Corn & Water Chestnut Salt-and-Pepper", servings: guests, quantityEstimate: `${Math.round(guests * 0.10)} kg`, notes: "Golden wok tossed with scallions and crushed pepper" },
      ],
      mainCourse: [
        { item: "Authentic Hyderabadi Shahi Dum Biryani", servings: guests, quantityEstimate: `${Math.round(guests * 0.35)} kg`, notes: "Cooked in 'Dum' with saffron, served with spicy Mirchi Ka Salan & Burrani Raita" },
        { item: "Paneer Butter Masala", servings: guests, quantityEstimate: `${Math.round(guests * 0.18)} kg`, notes: "Rich cashew-tomato gravy simmered with fresh cream" },
        { item: "Dal Makhani", servings: guests, quantityEstimate: `${Math.round(guests * 0.20)} kg`, notes: "Slow-cooked overnight with white butter and aromatic spices" },
      ],
      sideDishes: [
        { item: "Butter Naan & Tandoori Roti Basket", servings: Math.round(guests * 2.5), quantityEstimate: `${Math.round(guests * 2.5)} pieces`, notes: "Fresh from live clay tandoor" },
        { item: "Mixed Green Salad & Achar Platter", servings: guests, quantityEstimate: "Platter array", notes: "Fresh farm greens with lemon wedges" },
      ],
      desserts: [
        { item: "Royal Double Ka Meetha with Rabdi", servings: guests, quantityEstimate: `${Math.round(guests * 1.5)} pieces`, notes: "Hyderabadi bread pudding soaked in saffron milk and cardamom" },
        { item: "Kesar Pista Kulfi Sticks", servings: guests, quantityEstimate: `${guests} sticks`, notes: "Artisanal dry-fruit kulfi on sticks" },
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
