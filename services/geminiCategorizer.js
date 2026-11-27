const { GoogleGenAI, Type } = require("@google/genai");

const env = require("../config/env");

const MODEL = env.gemini.model;
const TIMEOUT_MS = 8000;

let client = null;
function getClient() {
  if (!env.gemini.apiKey) return null;
  if (!client) client = new GoogleGenAI({ apiKey: env.gemini.apiKey });
  return client;
}

function isConfigured() {
  return Boolean(env.gemini.apiKey);
}

/**
 * Ask Gemini to pick one category for an expense description.
 * Returns one of `categories`, or null if Gemini is unavailable or unsure.
 */
async function suggestCategory(description, categories) {
  const ai = getClient();
  if (!ai) return null;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Expense description: ${JSON.stringify(description)}`,
    config: {
      systemInstruction:
        "You categorize personal expense entries for an Indian expense tracker. " +
        "Pick the single best category for the description. " +
        "Restaurants, food delivery, groceries, snacks and drinks are Food. " +
        "Fuel, petrol, diesel and CNG are Petrol. " +
        "Electricity, water, phone, internet, rent and subscriptions are Bills. " +
        "Flights, trains, cabs, buses and hotels are Travel. " +
        "Movies, games, concerts and streaming events are Entertainment. " +
        "Medicine, doctor, hospital and gym are Health. " +
        "Income or pay received is Salary. " +
        "Use Other only when nothing else fits.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: categories },
        },
        required: ["category"],
      },
      temperature: 0,
      maxOutputTokens: 50,
      thinkingConfig: { thinkingLevel: "minimal" },
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    return null;
  }
  return categories.includes(parsed.category) ? parsed.category : null;
}

module.exports = { suggestCategory, isConfigured };
