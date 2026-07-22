import {
  isInStadiumFacilityQuery,
  isOutOfStadiumScope,
} from "./stadium-scope";

export type ClassifiedCategory = "A" | "B" | "C" | "D";

/**
 * Pure A–D heuristic (no LLM). Used by classifyMessage and unit tests.
 */
export function heuristicClassify(text: string): ClassifiedCategory | null {
  const t = text.toLowerCase();

  const serious = [
    "crush",
    "crushing",
    "overcrowd",
    "stampede",
    "crowd surge",
    "water main",
    "flooding",
    "pipe burst",
    "leaking onto",
    "medical emergency",
    "medical distress",
    "heart attack",
    "unconscious",
    "not breathing",
    "collapsed",
    "cpr",
    "fire",
    "structural",
    "collapse",
    "weapon",
    "active threat",
    "bomb",
    "missing child",
    "lost child",
    "lost kid",
    "missing kid",
    "can't find my child",
    "cant find my child",
    "cannot find my child",
    "can't find my kid",
    "child is missing",
    "kid is missing",
    "separated from my child",
    "child separated",
    "lost my daughter",
    "lost my son",
    "missing daughter",
    "missing son",
    "abduct",
    "kidnapped",
    "smoke",
    "evacuate",
    "evacuation",
    "unattended bag",
    "suspicious package",
    "suspicious bag",
    "abandoned bag",
    "fight",
    "fighting",
    "brawl",
    "assault",
    "pitch invasion",
    "field invasion",
    "active shooter",
    "lockdown",
    "bomb threat",
    "lightning",
    "severe weather",
    "weather delay",
    "heat stroke",
    "heatstroke",
    "railing broken",
    "barrier failure",
  ];
  if (serious.some((k) => t.includes(k))) return "D";

  if (isInStadiumFacilityQuery(text)) return "A";

  if (isOutOfStadiumScope(text)) return "B";

  const faq = [
    "where is",
    "where's",
    "policy",
    "ada",
    "elevator",
    "restroom",
    "bathroom",
    "lost ticket",
    "first aid",
    "medical post",
    "how do i",
    "what is the",
    "food",
    "concession",
    "merch",
    "guest services",
  ];
  if (faq.some((k) => t.includes(k))) return "A";

  const minor = [
    "cleanup",
    "spill",
    "brochure",
    "inventory",
    "out of stock",
    "low on",
    "trash",
    "needs restock",
    "broken printer",
    "missing supplies",
  ];
  if (minor.some((k) => t.includes(k))) return "C";

  // Question-shaped ops queries → FAQ path (A), not identical Cat-C incident acks
  if (looksLikeOpsQuestion(t)) return "A";

  return null;
}

/** Free-form questions should hit GenAI/FAQ, not default to Category C. */
export function looksLikeOpsQuestion(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!t) return false;
  if (/[?]/.test(t)) return true;
  if (
    /^(where|what|how|when|which|who|can i|do i|is there|are there|need to know|tell me|explain)\b/.test(
      t
    )
  ) {
    return true;
  }
  if (
    /\b(where is|where's|how do i|how can i|what is|what's|can you|please help|need (info|information|directions))\b/.test(
      t
    )
  ) {
    return true;
  }
  return false;
}
