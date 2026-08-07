const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

/**
 * @typedef {Object} SpeciesGuess
 * @property {string} species             - common name, e.g. "Largemouth Bass"
 * @property {string} confidence          - "high" | "medium" | "low"
 * @property {string} notes               - short reasoning / distinguishing features
 * @property {number | null} estimatedLengthIn - estimated length in inches, or null
 *   if the photo gives Claude no way to judge scale
 * @property {string} sizeConfidence      - "high" | "medium" | "low" | "none"
 */

function dataUrlToParts(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("Photo isn't in the expected format.");
  return { mediaType: match[1], base64: match[2] };
}

function extractJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Sends the staged photo to Claude for a species guess and a rough size
 * estimate. Never auto-saves — callers are expected to show both as
 * editable suggestions, per the "manual confirm/edit before anything
 * saves" decision from session 1.
 *
 * @param {string} photoDataUrl
 * @param {string} apiKey
 * @returns {Promise<SpeciesGuess>}
 */
export async function identifySpecies(photoDataUrl, apiKey) {
  if (!apiKey) throw new Error("Add your Anthropic API key first.");
  const { mediaType, base64 } = dataUrlToParts(photoDataUrl);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system:
        "You identify fish species from angler photos for a catch-logging app. " +
        "Respond with ONLY a JSON object, no prose, no code fences: " +
        '{"species": string, "confidence": "high" | "medium" | "low", "notes": string, ' +
        '"estimatedLengthIn": number | null, "sizeConfidence": "high" | "medium" | "low" | "none"}. ' +
        '"species" is a common name (e.g. "Largemouth Bass"). If you genuinely cannot ' +
        "tell, set species to \"Unknown\" and explain briefly in notes. " +
        'For "estimatedLengthIn", estimate the fish\'s length in inches using any visible ' +
        "scale reference in the photo (a hand, rod, ruler, cooler edge, boat deck, etc.) " +
        "together with typical proportions for the species. If nothing in the photo gives " +
        'you a way to judge scale, set "estimatedLengthIn" to null and "sizeConfidence" to "none".',
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "What species is this fish, and about how long is it?" },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("That API key was rejected.");
    if (response.status === 429) throw new Error("Rate limited — try again in a moment.");
    throw new Error(`Identification failed (${response.status}).`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block) => block.type === "text");
  if (!textBlock) throw new Error("No response from Claude.");

  try {
    const parsed = extractJson(textBlock.text);
    const estimatedLengthIn =
      typeof parsed.estimatedLengthIn === "number" && Number.isFinite(parsed.estimatedLengthIn)
        ? parsed.estimatedLengthIn
        : null;
    return {
      species: parsed.species || "Unknown",
      confidence: parsed.confidence || "low",
      notes: parsed.notes || "",
      estimatedLengthIn,
      sizeConfidence: estimatedLengthIn === null ? "none" : parsed.sizeConfidence || "low",
    };
  } catch {
    throw new Error("Couldn't parse the identification result.");
  }
}
