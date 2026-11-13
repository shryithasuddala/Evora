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

  return callGemini({
    systemInstruction: systemPrompt,
    contents,
    temperature,
  });
};

/**
 * Structured JSON generation for analytical EVORA AI modules.
 */
const generateStructuredJson = async ({ systemPrompt, userPrompt, temperature = 0.35 }) => {
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

  try {
    const parsed = JSON.parse(cleaned);
    return { data: parsed, model };
  } catch {
    throw new AIServiceError(
      "AI returned an invalid structured response. Please try generating again.",
      502
    );
  }
};

module.exports = {
  AIServiceError,
  generateChat,
  generateStructuredJson,
};
