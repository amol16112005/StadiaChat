import { addMessage, getStadiumProtocols } from "./db";
import { newId } from "./id";
import type { AuthSession, ChatMessage, Protocol } from "./types";
import {
  expandQueryTokens,
  isInStadiumFacilityQuery,
  isOutOfStadiumScope,
} from "./stadium-scope";
import { formatMemoryForAi, appendMemory } from "./memory";
import {
  OUT_OF_SCOPE_TEMPLATE,
  complete,
  translateText,
} from "./xai";

export interface FanAssistResult {
  transcript: string;
  detected_language: string;
  answer: string;
  answer_language: string;
  category: "A" | "B" | "faq_miss";
  protocol_title?: string;
  speak: boolean;
  /** True when on-ground volunteer action is required beyond speaking the answer */
  volunteer_assist_required: boolean;
  /** Coaching for the volunteer (their language) — shown in chat, not spoken to fan */
  volunteer_instructions?: string;
  coaching_steps?: string[];
  messages: ChatMessage[];
}

const LANG_HINTS: { code: string; patterns: RegExp[] }[] = [
  {
    code: "es",
    patterns: [
      /\b(dónde|donde|baño|ascensor|boleto|entrada|gracias|hola|ayuda|qué|que|está|esta)\b/i,
      /[¿¡]/,
    ],
  },
  {
    code: "fr",
    patterns: [
      /\b(où|toilette|ascenseur|billet|bonjour|merci|aide|s'il vous plaît|comment)\b/i,
      /[àâçéèêëîïôùûü]/i,
    ],
  },
  {
    code: "pt",
    patterns: [
      /\b(onde|banheiro|elevador|ingresso|obrigado|olá|ajuda|como|está)\b/i,
      /[ãõçáéíóú]/i,
    ],
  },
  {
    code: "de",
    patterns: [
      /\b(wo|toilette|aufzug|ticket|danke|hilfe|bitte|wie|ist)\b/i,
      /[äöüß]/i,
    ],
  },
  { code: "ar", patterns: [/[\u0600-\u06FF]/] },
  {
    code: "ja",
    patterns: [/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/],
  },
  { code: "ko", patterns: [/[\uac00-\ud7af]/] },
  { code: "zh", patterns: [/[\u4e00-\u9fff]/] },
  { code: "hi", patterns: [/[\u0900-\u097F]/] },
  {
    code: "it",
    patterns: [/\b(dove|bagno|ascensore|biglietto|grazie|aiuto|come|è)\b/i],
  },
];

/** Situations where a spoken FAQ alone is not enough — volunteer must act. */
const ASSIST_REQUIRED_PATTERNS = [
  /\b(lost child|missing child|separated from|can't find (my )?(seat|section|gate|family|friends?))\b/i,
  /\b(wheelchair|mobility|cannot walk|can't walk|need escort|need help (getting|finding|reaching))\b/i,
  /\b(fell|fallen|injured|bleeding|dizzy|faint|nausea|sick|ill|hurt)\b/i,
  /\b(lost ticket|ticket (won't|does not|doesn't) (scan|work)|denied entry|wrong ticket)\b/i,
  /\b(need (a )?translator|don't speak|no english|cannot understand)\b/i,
  /\b(stuck|blocked|can't get through|crowd|overcrowd)\b/i,
  /\b(help me|please help|need assistance|urgent)\b/i,
  /\b(pregnant|elderly|senior|blind|deaf|service animal)\b/i,
  /\b(where (do i|should i) go).*(lost|ticket|medical|help)/i,
];

function heuristicDetectLanguage(text: string): string {
  for (const { code, patterns } of LANG_HINTS) {
    if (patterns.some((p) => p.test(text))) return code;
  }
  return "en";
}

export async function detectLanguage(
  text: string,
  preferred?: string
): Promise<string> {
  if (preferred && preferred !== "auto")
    return preferred.slice(0, 2).toLowerCase();

  const heuristic = heuristicDetectLanguage(text);

  const result = await complete(
    `Detect the language of the user text. Return JSON only: {"language":"<ISO 639-1 code>"}.
Common WC2026 codes: en, es, fr, pt, de, ar, ja, ko, zh, it, hi.
If mixed, pick the dominant language of the question.`,
    text,
    { json: true, temperature: 0 }
  );

  if (result) {
    try {
      const parsed = JSON.parse(result) as { language?: string };
      if (parsed.language && /^[a-z]{2}$/i.test(parsed.language)) {
        return parsed.language.toLowerCase();
      }
    } catch {
      /* fall through */
    }
  }

  return heuristic;
}

function protocolBody(protocol: Protocol, lang: string): string {
  return (
    protocol.body[lang] ||
    protocol.body.en ||
    Object.values(protocol.body)[0] ||
    protocol.title
  );
}

function matchProtocol(text: string, protocols: Protocol[]): Protocol | null {
  const t = text.toLowerCase();
  const tokens = expandQueryTokens(text);
  const pool = protocols.filter((p) => p.category === "faq");
  let best: Protocol | null = null;
  let bestScore = 0;
  for (const p of pool) {
    let score = 0;
    for (const kw of p.keywords) {
      const k = kw.toLowerCase();
      if (t.includes(k)) score += Math.max(k.length, 4) * 2;
      // multi-token keyword partials
      for (const part of k.split(/\s+/)) {
        if (part.length > 3 && tokens.includes(part)) score += part.length;
      }
    }
    for (const part of p.title.toLowerCase().split(/[\s—\-/]+/)) {
      if (part.length > 3 && t.includes(part)) score += 3;
    }
    // Boost facility protocols when query is facility-related
    if (
      isInStadiumFacilityQuery(text) &&
      /food|concession|merch|restroom|water|guest|prayer|atm|wifi|shop|facility/i.test(
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
  // Require a minimum score so weak wrong matches (e.g. restroom) don't win
  return bestScore >= 6 ? best : null;
}

export interface AssistAssessment {
  required: boolean;
  reason: string;
  steps: string[];
  summary: string;
}

/**
 * Decide if the volunteer must take hands-on action, and draft coaching steps
 * in the volunteer's language.
 */
export async function assessVolunteerAssistNeed(input: {
  fanText: string;
  matchText: string;
  answer: string;
  category: string;
  protocolTitle?: string;
  volunteerLang: string;
  fanLang: string;
}): Promise<AssistAssessment> {
  const heuristicHit = ASSIST_REQUIRED_PATTERNS.some(
    (p) => p.test(input.fanText) || p.test(input.matchText)
  );

  // Pure out-of-scope: point fan to Fan Guide; volunteer may still redirect politely
  const isOutOfScope = input.category === "B";

  const llm = await complete(
    `You are StadiaChat Fan Assist coaching engine for FIFA World Cup 2026 stadium volunteers.
Decide if the VOLUNTEER must take hands-on action beyond playing an audio FAQ answer.

Return JSON only:
{
  "required": true|false,
  "reason": "one short sentence",
  "steps": ["step 1", "step 2", "step 3"],
  "summary": "brief instruction block for the volunteer"
}

Rules:
- required=true when: mobility escort, lost child/family, medical concern, ticket resolution desk escort, language barrier needing human mediation, safety, fan is distressed/confused and needs guiding, accessibility, faq_miss with operational ambiguity.
- required=false when: simple location FAQ that speaking the answer fully resolves (e.g. restroom direction only).
- If required=true, steps must be 2-5 concrete actions the volunteer does NOW (walk, radio, escort, show, confirm). No fluff.
- summary and steps must be in language code: ${input.volunteerLang}
- Preserve Gate/Section IDs as literals.
- Out-of-scope tourism: required can be true only as "politely redirect to Fan Guide app; do not leave post for city tourism."`,
    `Fan language: ${input.fanLang}
Category: ${input.category}
Protocol: ${input.protocolTitle || "none"}
Fan said: ${input.fanText}
English gloss: ${input.matchText}
Fan-facing answer already prepared: ${input.answer}
Heuristic assist flag: ${heuristicHit}`,
    { json: true, temperature: 0.15 }
  );

  if (llm) {
    try {
      const parsed = JSON.parse(llm) as {
        required?: boolean;
        reason?: string;
        steps?: string[];
        summary?: string;
      };
      if (typeof parsed.required === "boolean") {
        const steps = Array.isArray(parsed.steps)
          ? parsed.steps.filter(Boolean).slice(0, 6)
          : [];
        return {
          required: parsed.required,
          reason: parsed.reason || "",
          steps,
          summary:
            parsed.summary ||
            (steps.length ? steps.map((s, i) => `${i + 1}. ${s}`).join("\n") : ""),
        };
      }
    } catch {
      /* fall through */
    }
  }

  // Heuristic fallback coaching
  if (isOutOfScope) {
    return {
      required: true,
      reason: "Out-of-stadium request — redirect only.",
      steps: [
        "Do not leave your post for city tourism questions.",
        "Show the fan the official Fan Guide app QR or download link at your desk if available.",
        "If they need stadium facilities, re-ask for gate/section and use Fan Voice again.",
      ],
      summary:
        "VOLUNTEER ACTION: Politely redirect to Fan Guide for city questions. Stay on post. Offer stadium help only if they rephrase an on-venue need.",
    };
  }

  if (heuristicHit || input.category === "faq_miss") {
    const steps = buildHeuristicSteps(input.matchText, input.protocolTitle);
    return {
      required: true,
      reason: heuristicHit
        ? "Fan situation needs hands-on volunteer support."
        : "No exact protocol — guide the fan in person.",
      steps,
      summary: `VOLUNTEER ACTION REQUIRED\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    };
  }

  // Simple FAQ only — still offer light optional tip for ADA/ticket protocols
  if (
    input.protocolTitle &&
    /ada|ticket|medical|elevator/i.test(input.protocolTitle)
  ) {
    const steps = buildHeuristicSteps(input.matchText, input.protocolTitle);
    return {
      required: true,
      reason: "Protocol benefits from volunteer confirmation/escort.",
      steps,
      summary: `VOLUNTEER ACTION RECOMMENDED\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    };
  }

  return {
    required: false,
    reason: "Spoken answer sufficient.",
    steps: [],
    summary: "",
  };
}

function buildHeuristicSteps(
  matchText: string,
  protocolTitle?: string
): string[] {
  const t = matchText.toLowerCase();
  if (/child|family|friends?|separated/.test(t)) {
    return [
      "Stay with the fan; do not send them alone through crowds.",
      "Radio Guest Services / missing persons protocol with description and last known section.",
      "Escort to the nearest Family Reunion / Guest Services point.",
      "Confirm fan is handed to authorized staff before leaving them.",
    ];
  }
  if (/wheelchair|mobility|escort|cannot walk|can't walk|elderly|blind/.test(t)) {
    return [
      "Offer arm/escort if trained; do not push mobility devices unless authorized.",
      "Use the nearest ADA route (elevator banks per protocol).",
      "Clear a path; radio for mobility assist if distance is long.",
      "Confirm they reach the destination and know the return path.",
    ];
  }
  if (/ticket|entry|scan|denied/.test(t) || /ticket/i.test(protocolTitle || "")) {
    return [
      "Do not force entry without authorization.",
      "Escort fan to Ticket Resolution Desk (Gate 1 west plaza on MetLife protocols).",
      "Advise them photo ID matching purchaser name is required.",
      "Stay until they join the resolution queue if they are distressed.",
    ];
  }
  if (/medical|fell|hurt|sick|bleed|faint|dizzy|unconscious/.test(t)) {
    return [
      "Do not move an injured person unless immediate danger.",
      "Radio medical channel 3 with exact section/row.",
      "Clear a 3m area; send one person to guide medics from the nearest gate.",
      "Keep the fan calm; report condition changes on radio.",
    ];
  }
  if (/food|concession|snack|eat|drink|merch|shop|atm|wifi|prayer|guest services/.test(t)) {
    return [
      "Point or walk the fan to the nearest matching facility on this concourse.",
      "Use gate/section landmarks; show the answer on-screen if language is a barrier.",
      "For dietary needs (halal/allergen), direct to Guest Services or labeled concession boards.",
      "Confirm they can see the destination before returning to post.",
    ];
  }
  if (/restroom|bathroom|elevator|ada|where/.test(t)) {
    return [
      "Point or walk with the fan to the location while facing the correct direction.",
      "Use landmarks (Guest Services, section numbers) — not only gestures.",
      "If language barrier remains, show the written answer on screen.",
      "Confirm they understood before returning to post.",
    ];
  }
  return [
    "Confirm the fan’s need in simple words or with the on-screen answer.",
    "Escort or point clearly using gate/section landmarks.",
    "If unresolved in 2 minutes, walk them to Guest Services.",
    "Radio Ops Lead only if safety or entry is blocked.",
  ];
}

function buildFacilityFallback(matchText: string, stadiumId: string): string {
  const t = matchText.toLowerCase();
  if (/food|concession|snack|eat|hungry|drink|comida|puesto|vendor|stall/.test(t)) {
    return `FOOD & CONCESSIONS (${stadiumId}):
1. Concession stands and food stalls are on the main concourses, typically near even-numbered sections and major gates.
2. Look for overhead "Food / Concessions" signs; many stands accept card and mobile pay.
3. For dietary needs (halal, vegetarian, allergens), check the stand menu board or ask Guest Services.
4. Nearest help: Guest Services / information desk if you cannot locate a stall from your section.
5. Volunteers may escort fans one concourse segment; do not leave your post unattended during peak ingress.`;
  }
  if (/merch|shop|jersey|souvenir|store/.test(t)) {
    return `MERCHANDISE (${stadiumId}): Official team/tournament shops are on the main plaza and primary concourse. Follow "Team Store / Merchandise" signs. Queues peak at halftime and full-time.`;
  }
  if (/water|fountain|refill/.test(t)) {
    return `WATER (${stadiumId}): Water fountains and bottle-refill points are near restrooms and first-aid posts on the main concourse. Sealed bottles are sold at concessions.`;
  }
  if (/atm|cash/.test(t)) {
    return `ATMs (${stadiumId}): ATMs are near main gates and Guest Services. Most concessions accept card — cash is optional.`;
  }
  if (/wifi|wi-?fi|internet/.test(t)) {
    return `Wi‑Fi (${stadiumId}): Connect to the official venue guest network posted on concourse signage and the Fan Guide app. Avoid unofficial open networks.`;
  }
  if (/prayer|mosque|chapel|faith/.test(t)) {
    return `PRAYER / MULTI-FAITH (${stadiumId}): Multi-faith / prayer room is signed from Guest Services. Ask any steward for the nearest quiet room route.`;
  }
  if (/guest services|information|info desk|help desk/.test(t)) {
    return `GUEST SERVICES (${stadiumId}): Primary Guest Services desks are at main gates / west or south plaza depending on venue. Stewards can point to the nearest desk from your section.`;
  }
  return `IN-STADIUM FACILITY (${stadiumId}): Use concourse wayfinding signs for the amenity requested. If unclear from this section, escort or direct the fan to the nearest Guest Services / information desk for a full venue map.`;
}

/**
 * Fan Assist: volunteer holds device, fan speaks, Core answers in fan language for TTS.
 * When hands-on help is needed, also posts volunteer coaching steps in chat.
 */
export async function processFanAssist(
  session: AuthSession,
  transcript: string,
  options?: { preferred_language?: string }
): Promise<FanAssistResult> {
  const text = transcript.trim();
  if (!text) {
    throw new Error("Empty transcript");
  }

  const detected = await detectLanguage(text, options?.preferred_language);
  const answerLang = detected;
  const volunteerLang = session.preferred_language || "en";

  let matchText = text;
  if (detected !== "en") {
    matchText = await translateText(text, "en", detected);
  }

  const protocols = await getStadiumProtocols(session.stadium_id);
  const now = new Date().toISOString();
  const memoryBlock = await formatMemoryForAi({
    stadium_id: session.stadium_id,
    user_id: session.user_id,
    limit: 8,
  });

  const inbound: ChatMessage = {
    id: newId("msg"),
    stadium_id: session.stadium_id,
    sender_id: session.user_id,
    sender_name: `${session.name} (Fan Assist)`,
    sender_role: "Volunteer",
    recipient_id: "broadcast_ops",
    text: `[FAN VOICE · ${detected}] ${text}`,
    original_text: text,
    language: detected,
    category: "A",
    ui_component: "text",
    created_at: now,
  };

  let answer: string;
  let category: FanAssistResult["category"] = "A";
  let protocol_title: string | undefined;

  // City-only questions → Fan Guide. In-stadium food/facilities are NEVER B.
  const outOfScope =
    !isInStadiumFacilityQuery(matchText) &&
    !isInStadiumFacilityQuery(text) &&
    (isOutOfStadiumScope(matchText) || isOutOfStadiumScope(text));

  if (outOfScope) {
    category = "B";
    answer = await translateText(OUT_OF_SCOPE_TEMPLATE, answerLang, "en");
  } else {
    const matched =
      matchProtocol(matchText, protocols) || matchProtocol(text, protocols);
    if (matched) {
      protocol_title = matched.title;
      category = "A";
    } else {
      category = "faq_miss";
    }

    const protocolSource = matched
      ? protocolBody(matched, "en")
      : undefined;
    const facilityHint = isInStadiumFacilityQuery(matchText)
      ? `This is an IN-STADIUM facility question (food, concessions, shops, amenities, wayfinding). You MUST give a helpful on-venue answer — never refuse as tourism. Cover typical locations on main concourses, near gates/sections, Guest Services, and payment (card usually accepted). If exact stall map is unknown, give general stadium ops guidance and offer to escort to nearest concession / Guest Services.`
      : `Answer with internal stadium operational info only.`;

    // Always try GenAI so spoken answers are contextual — not the same canned SOP every time.
    const llmAnswer = await complete(
      `You are StadiaChat Fan Assist for FIFA World Cup 2026 stadium volunteers helping fans on the floor.
${facilityHint}
${
  protocolSource
    ? `SOURCE OF TRUTH (official protocol — do not contradict; rephrase for this fan's exact question):\nTitle: ${protocol_title}\n${protocolSource}`
    : "No exact protocol matched — use sound stadium ops guidance."
}
Be concise, spoken-friendly (short sentences), no filler, no apologies monologue.
Reply in language code: ${answerLang}.
Preserve gate/section IDs as literals.
Do NOT talk only about restrooms unless the fan asked about restrooms.
Do NOT say you can only help with restrooms.
Do NOT redirect to city Fan Guide for in-stadium food or facilities.
Make the answer specific to THIS fan question — do not paste a generic template.
Use recent memory only if relevant; do not invent past events.`,
      `Stadium ID: ${session.stadium_id}
Known protocol titles: ${protocols.map((p) => p.title).join("; ") || "(none)"}
${memoryBlock || "(no prior memory)"}
Fan said: ${text}
English gloss: ${matchText}`,
      { temperature: 0.35 }
    );

    if (llmAnswer) {
      answer = llmAnswer;
    } else if (matched) {
      // Offline fallback: localized protocol body
      if (matched.body[answerLang]) {
        answer = matched.body[answerLang];
      } else {
        answer = await translateText(
          protocolBody(matched, "en"),
          answerLang,
          "en"
        );
      }
    } else {
      const facilityFallbackEn = isInStadiumFacilityQuery(matchText)
        ? buildFacilityFallback(matchText, session.stadium_id)
        : "I could not find a matching stadium protocol. Please ask Guest Services at the nearest information desk.";
      answer = await translateText(facilityFallbackEn, answerLang, "en");
    }
  }

  inbound.category = category === "faq_miss" ? "A" : category;

  const assessment = await assessVolunteerAssistNeed({
    fanText: text,
    matchText,
    answer,
    category,
    protocolTitle: protocol_title,
    volunteerLang,
    fanLang: answerLang,
  });

  // Localize heuristic English coaching if volunteer language differs
  let coachingSummary = assessment.summary;
  let coachingSteps = assessment.steps;
  if (
    assessment.required &&
    volunteerLang !== "en" &&
    assessment.summary &&
    !assessment.summary.match(/[\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF]/)
  ) {
    // If summary looks English-only and volunteer wants another language, translate
    const translated = await translateText(
      assessment.summary,
      volunteerLang,
      "en"
    );
    coachingSummary = translated;
    if (coachingSteps.length) {
      const stepsJoined = coachingSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      const stepsTr = await translateText(stepsJoined, volunteerLang, "en");
      coachingSteps = stepsTr
        .split(/\n+/)
        .map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter(Boolean);
    }
  }

  const reply: ChatMessage = {
    id: newId("msg"),
    stadium_id: session.stadium_id,
    sender_id: "system",
    sender_name: "StadiaChat Fan Assist",
    sender_role: "System",
    recipient_id: session.user_id,
    text: answer,
    original_text: answer,
    language: answerLang,
    category: inbound.category,
    ui_component: "fan_voice_reply",
    created_at: new Date().toISOString(),
  };

  const messages: ChatMessage[] = [inbound, reply];
  await addMessage(inbound);
  await addMessage(reply);

  if (assessment.required && coachingSummary) {
    const coachText =
      coachingSteps.length > 0
        ? `VOLUNTEER ASSIST REQUIRED\n${assessment.reason ? `Why: ${assessment.reason}\n` : ""}${coachingSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
        : coachingSummary;

    const coachMsg: ChatMessage = {
      id: newId("msg"),
      stadium_id: session.stadium_id,
      sender_id: "system",
      sender_name: "StadiaChat Core",
      sender_role: "System",
      recipient_id: session.user_id,
      text: coachText,
      language: volunteerLang,
      category: inbound.category,
      ui_component: "volunteer_coaching",
      coaching_steps: coachingSteps,
      task_title: "How to help this fan",
      created_at: new Date().toISOString(),
    };
    await addMessage(coachMsg);
    messages.push(coachMsg);
  }

  return {
    transcript: text,
    detected_language: detected,
    answer,
    answer_language: answerLang,
    category,
    protocol_title,
    speak: true,
    volunteer_assist_required: assessment.required,
    volunteer_instructions: assessment.required ? coachingSummary : undefined,
    coaching_steps: assessment.required ? coachingSteps : undefined,
    messages,
  };
}
