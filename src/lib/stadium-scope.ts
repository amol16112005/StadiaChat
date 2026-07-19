/**
 * In-stadium facilities are ALWAYS in scope (Category A / Fan Assist FAQ).
 * Only city/tourism/outside-venue requests are out of scope (Category B).
 */

/** Tokens that mean the question is about something INSIDE the venue */
const INSIDE_VENUE_MARKERS = [
  "inside",
  "in the stadium",
  "in stadium",
  "in the venue",
  "on concourse",
  "concourse",
  "section",
  "gate",
  "here",
  "this stadium",
  "en el estadio",
  "dentro",
  "dans le stade",
  "no estádio",
  "im stadion",
];

/** In-stadium facility / amenity topics (FAQ Category A) */
export const FACILITY_KEYWORDS = [
  "food",
  "food stall",
  "food stalls",
  "food stand",
  "food court",
  "concession",
  "concessions",
  "snack",
  "snacks",
  "eat",
  "eating",
  "hungry",
  "drink",
  "drinks",
  "beverage",
  "water",
  "water fountain",
  "coffee",
  "pizza",
  "burger",
  "hot dog",
  "halal",
  "vegan",
  "vegetarian",
  "allergen",
  "menu",
  "comida",
  "puesto",
  "puestos",
  "alimento",
  "beber",
  "agua",
  "restaurant inside",
  "stadium restaurant",
  "stadium food",
  "merch",
  "merchandise",
  "shop",
  "store",
  "souvenir",
  "jersey",
  "gift shop",
  "atm",
  "cash",
  "wifi",
  "wi-fi",
  "charging",
  "charger",
  "phone charge",
  "prayer",
  "mosque",
  "chapel",
  "nursing",
  "baby changing",
  "family room",
  "lost and found",
  "lost & found",
  "guest services",
  "information desk",
  "info desk",
  "customer service",
  "smoking",
  "smoke free",
  "bag check",
  "locker",
  "lockers",
  "coat check",
  "water refill",
  "first aid",
  "medical post",
  "aid station",
  "restroom",
  "bathroom",
  "toilet",
  "washroom",
  "ada",
  "elevator",
  "lift",
  "wheelchair",
  "accessible",
  "seating",
  "seat",
  "wayfinding",
  "directions to",
  "where is",
  "where's",
  "donde",
  "dónde",
  "où est",
  "onde fica",
];

/** True city/outside tourism — NOT stadium concessions */
const CITY_ONLY_PATTERNS = [
  /\b(hotel|airbnb|hostel)\b/i,
  /\b(tourist|tourism|sightseeing|museum outside|city tour)\b/i,
  /\b(uber|lyft|taxi|subway to|bus to downtown|airport)\b/i,
  /\b(nightlife|club outside|bar near the city|best bar in)\b/i,
  /\bwhat to do in (the )?city\b/i,
  /\bhow is the weather\b/i,
  /\b(restaurant|cafe|café|bar|diner)\b(?!.*\b(stadium|venue|inside|concourse|gate|section)\b)/i,
  /\b(near the stadium|around the stadium|outside the stadium|after the match in town)\b/i,
];

/** Explicit in-stadium food/facility even if they say "restaurant" */
const STADIUM_FACILITY_OVERRIDE = [
  /\b(inside|in(-| )?stadium|in the stadium|on (the )?concourse|at (the )?gate|section \d+)\b/i,
  /\b(food stall|food stand|concession|concessions|stadium food|stadium restaurant|vendor|kiosk)\b/i,
  /\b(merch|merchandise|gift shop|jersey shop|atm|wifi|wi-?fi|prayer room|nursing room|locker)\b/i,
  /\b(guest services|information desk|lost and found|bag check|water fountain)\b/i,
  /\b(comida|puesto de comida|dentro del estadio|concessões|lanchonete do estádio)\b/i,
];

export function isInStadiumFacilityQuery(text: string): boolean {
  const t = text.toLowerCase();
  if (STADIUM_FACILITY_OVERRIDE.some((p) => p.test(text))) return true;
  if (FACILITY_KEYWORDS.some((k) => t.includes(k))) {
    // If clearly city-only with no inside markers, not facility
    if (
      CITY_ONLY_PATTERNS.some((p) => p.test(text)) &&
      !INSIDE_VENUE_MARKERS.some((m) => t.includes(m))
    ) {
      return false;
    }
    return true;
  }
  return false;
}

export function isOutOfStadiumScope(text: string): boolean {
  // Never mark true in-stadium facilities as out of scope
  if (isInStadiumFacilityQuery(text)) return false;
  return CITY_ONLY_PATTERNS.some((p) => p.test(text));
}

/** Extra keyword aliases used when matching protocols */
export const FACILITY_SYNONYMS: Record<string, string[]> = {
  food: [
    "food",
    "food stall",
    "food stand",
    "concession",
    "snack",
    "eat",
    "hungry",
    "comida",
    "puesto",
    "vendor",
    "kiosk",
    "restaurant",
    "pizza",
    "burger",
    "drink",
    "beverage",
  ],
  water: ["water", "fountain", "refill", "agua", "bottle"],
  merch: ["merch", "merchandise", "shop", "store", "jersey", "souvenir", "gift"],
  restroom: ["restroom", "bathroom", "toilet", "washroom", "baño", "wc"],
  medical: ["medical", "first aid", "aid station", "enfermería"],
  prayer: ["prayer", "mosque", "chapel", "multifaith"],
  atm: ["atm", "cash", "money machine"],
  wifi: ["wifi", "wi-fi", "internet", "network"],
  guest: ["guest services", "information", "info desk", "help desk"],
  lost: ["lost and found", "lost & found"],
};

export function expandQueryTokens(text: string): string[] {
  const t = text.toLowerCase();
  const tokens = new Set<string>(
    t
      .split(/[^a-z0-9áéíóúüñàâçèêëîïôùûœ]+/i)
      .filter((w) => w.length > 2)
  );
  for (const [canonical, alts] of Object.entries(FACILITY_SYNONYMS)) {
    if (alts.some((a) => t.includes(a))) {
      tokens.add(canonical);
      for (const a of alts) tokens.add(a);
    }
  }
  return [...tokens];
}
