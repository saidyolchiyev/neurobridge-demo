import OpenAI from "openai";
import { z } from "zod";

const intentSchema = z.object({
  origin: z.string().nullable().default(null),
  destination: z.string().nullable().default(null),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  departurePeriod: z.enum(["morning", "afternoon", "evening", "any"]).default("any"),
  maximumPrice: z.number().nonnegative().nullable().default(null),
  passengerCount: z.number().int().min(1).max(8).default(1),
});

const matchExplanationSchema = z.object({
  summary: z.string().min(1).max(500),
  rides: z.array(z.object({ id: z.string(), explanation: z.string().min(1).max(300) })).max(5),
});

const client = () => process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 8000, maxRetries: 0 })
  : null;

function fallbackIntent(text, availableCities, today) {
  const normalized = text.toLocaleLowerCase("az");
  const mentionedCities = availableCities
    .map((city) => ({ city, index: normalized.indexOf(city.toLocaleLowerCase("az")) }))
    .filter(({ index }) => index >= 0)
    .sort((first, second) => first.index - second.index)
    .map(({ city }) => city);
  const relativeDate = /\b(sabah|tomorrow)\b/i.test(text)
    ? new Date(`${today}T12:00:00`)
    : /\b(bu gün|bugün|today)\b/i.test(normalized) ? new Date(`${today}T12:00:00`) : null;
  if (relativeDate && /\b(sabah|tomorrow)\b/i.test(text)) relativeDate.setDate(relativeDate.getDate() + 1);
  const digitCount = text.match(/\b([1-8])\s*(nəfər|sərnişin|passenger)/i)?.[1];
  const wordCount = /bir nəfər|one passenger/i.test(text) ? 1 : /iki nəfər|two passengers/i.test(text) ? 2 : /üç nəfər|three passengers/i.test(text) ? 3 : /dörd nəfər|four passengers/i.test(text) ? 4 : null;
  const number = digitCount || wordCount;
  const price = text.match(/\b(\d+(?:[.,]\d{1,2})?)\s*(azn|manat)\b/i)?.[1];
  const departurePeriod = /səhər|morning/i.test(text) ? "morning" : /günorta|afternoon/i.test(text) ? "afternoon" : /axşam|evening/i.test(text) ? "evening" : "any";
  return {
    origin: mentionedCities[0] || null,
    destination: mentionedCities[1] || null,
    departureDate: relativeDate?.toISOString().slice(0, 10) || null,
    departurePeriod,
    maximumPrice: price ? Number(price.replace(",", ".")) : null,
    passengerCount: Number(number || 1),
  };
}

export async function parseTravelIntent(text, availableCities = [], today = new Date().toISOString().slice(0, 10)) {
  const fallbackPreferences = fallbackIntent(text, availableCities, today);
  const ai = client();
  if (!ai) return { available: false, preferences: fallbackPreferences };
  try {
    const completion = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Extract ride search preferences from Azerbaijani text. Return a JSON object with origin and destination (exactly as written in the provided allowed city list, or null if not specified), departureDate (YYYY-MM-DD or null), departurePeriod (morning|afternoon|evening|any), maximumPrice (number or null), and passengerCount (1-8). Resolve today/tomorrow relative to the supplied currentDate. Classify morning as 05:00-11:59, afternoon as 12:00-16:59, and evening as 17:00-23:59. Do not infer missing cities, dates, prices, or passenger counts. Allowed cities and current date are provided in the user message." },
        { role: "user", content: JSON.stringify({ request: text.slice(0, 1000), allowedCities: availableCities, currentDate: today }) },
      ],
      temperature: 0,
    });
    const parsed = intentSchema.parse(JSON.parse(completion.choices[0].message.content || "{}"));
    const cityByName = new Map(availableCities.map((city) => [city.toLocaleLowerCase("az"), city]));
    const preferences = {
      ...parsed,
      origin: parsed.origin ? cityByName.get(parsed.origin.toLocaleLowerCase("az")) || fallbackPreferences.origin : fallbackPreferences.origin,
      destination: parsed.destination ? cityByName.get(parsed.destination.toLocaleLowerCase("az")) || fallbackPreferences.destination : fallbackPreferences.destination,
    };
    return { available: true, preferences };
  } catch {
    return { available: false, preferences: fallbackPreferences };
  }
}

export async function explainGroundedMatches(matches) {
  const fallbackExplanations = Object.fromEntries(matches.map((ride) => [ride.id, `${ride.match.reasons.join(". ")}.`]));
  const fallback = {
    available: false,
    explanation: matches.length
      ? "Səfərlər marşrut uyğunluğu, götürülmə məsafəsi və boş yerlərə görə sıralanıb."
      : "Bu istiqamət və tarix üçün uyğun səfər tapılmadı.",
    explanations: fallbackExplanations,
  };
  const ai = client();
  if (!ai || !matches.length) return fallback;

  try {
    const grounded = matches.slice(0, 5).map(({ id, originName, destinationName, departureTime, price, availableSeats, match }) => ({
      id,
      originName,
      destinationName,
      departureTime,
      price: Number(price),
      availableSeats,
      score: match.score,
      pickupKm: match.pickupDistanceKm,
      detourKm: match.estimatedDetourKm,
    }));
    const response = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Azerbaijani language only. Return JSON with summary (one short sentence) and rides (array of id and explanation). Explain only supplied facts. Do not invent timing, prices, route stops, safety, or driver qualities. Never recommend a ride that is not in the input." },
        { role: "user", content: JSON.stringify(grounded) },
      ],
      temperature: 0.2,
    });
    const parsed = matchExplanationSchema.parse(JSON.parse(response.choices[0].message.content || "{}"));
    const validIds = new Set(grounded.map((ride) => ride.id));
    const explanations = {
      ...fallbackExplanations,
      ...Object.fromEntries(parsed.rides.filter((ride) => validIds.has(ride.id)).map(({ id, explanation }) => [id, explanation])),
    };
    return { available: true, explanation: parsed.summary, explanations };
  } catch {
    return fallback;
  }
}

export async function explainDetourProposal(facts) {
  const fallback = facts.feasible
    ? `Marşrut ${facts.additionalDistanceKm} km və ${facts.additionalDurationMinutes} dəqiqə uzanır. Yeni sərnişinin təklifi ${facts.proposedFare} AZN-dir; təsirlənən sərnişinlərin razılığı tələb olunur.`
    : "Hesablanmış qiymət və xərclərlə bu marşrut maliyyə baxımından uyğun deyil.";
  const ai = client();
  if (!ai) return { available: false, explanation: fallback };
  try {
    const response = await ai.chat.completions.create({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0,
      messages: [{ role: "system", content: "Azerbaijani only. Explain the supplied deterministic ride detour quote in at most two short sentences. Use only given figures and decisions. Never change/calculate prices, distance, duration, discounts, or claim safety. Do not recommend approval." }, { role: "user", content: JSON.stringify(facts) }] });
    const explanation = response.choices[0]?.message?.content?.trim();
    return explanation && explanation.length <= 500 ? { available: true, explanation } : { available: false, explanation: fallback };
  } catch { return { available: false, explanation: fallback }; }
}
