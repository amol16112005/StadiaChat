import type { Protocol } from "./types";
import { expandQueryTokens, isInStadiumFacilityQuery } from "./stadium-scope";

/**
 * Score keyword/title overlap against a protocol pool.
 * Pure — unit-tested. Threshold 6 avoids weak false matches.
 */
export function matchProtocol(
  text: string,
  protocols: Protocol[],
  category: "faq" | "emergency"
): Protocol | null {
  const t = text.toLowerCase();
  const tokens = expandQueryTokens(text);
  const pool = protocols.filter((p) => p.category === category);
  let best: Protocol | null = null;
  let bestScore = 0;
  for (const p of pool) {
    let score = 0;
    for (const kw of p.keywords) {
      const k = kw.toLowerCase();
      if (t.includes(k)) score += Math.max(k.length, 4) * 2;
      for (const part of k.split(/\s+/)) {
        if (part.length > 3 && tokens.includes(part)) score += part.length;
      }
    }
    for (const part of p.title.toLowerCase().split(/[\s—\-/]+/)) {
      if (part.length > 3 && t.includes(part)) score += 3;
    }
    if (
      isInStadiumFacilityQuery(text) &&
      /food|concession|merch|restroom|water|guest|prayer|atm|wifi|shop/i.test(
        p.title + " " + p.keywords.join(" ")
      )
    ) {
      score += 5;
    }
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 6 ? best : null;
}

export function protocolBody(protocol: Protocol, lang: string): string {
  return (
    protocol.body[lang] ||
    protocol.body.en ||
    Object.values(protocol.body)[0] ||
    protocol.title
  );
}
