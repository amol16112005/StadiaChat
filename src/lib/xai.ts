import OpenAI from "openai";
import { isInStadiumFacilityQuery } from "./stadium-scope";

const OUT_OF_SCOPE_TEMPLATE =
  "I can only assist with internal stadium operations under this Stadium ID. For external city or tourist inquiries, please refer to the official Fan Guide application.";

export { OUT_OF_SCOPE_TEMPLATE };

/**
 * LLM provider order:
 * 1) Google AI Studio — tries ANY Gemini model with quota left (not pinned to one)
 * 2) SpaceXAI / xAI via XAI_API_KEY
 * 3) null → callers use heuristics
 *
 * Put your key in `.env.local` (project root):
 *   GOOGLE_AI_API_KEY=your_google_ai_studio_key
 * Get a key: https://aistudio.google.com/apikey
 *
 * Optional: GOOGLE_AI_MODELS=comma,separated,preferred,order
 * If unset, models are discovered from the API + a free-tier-friendly default list.
 */

function googleApiKey(): string | undefined {
  return (
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  );
}

/** Fallback order when ListModels is unavailable — free/flash first */
const DEFAULT_GEMINI_CANDIDATES = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-2.0-pro",
  "gemini-2.5-pro",
  "gemini-pro",
];

/** Models that recently hit quota/rate limits — skip for a short TTL */
const exhaustedModels = new Map<string, number>();
const EXHAUST_TTL_MS = 5 * 60 * 1000;

let cachedModelList: { models: string[]; fetchedAt: number } | null = null;
const MODEL_LIST_TTL_MS = 10 * 60 * 1000;
let lastWorkingModel: string | null = null;

function isExhausted(model: string): boolean {
  const until = exhaustedModels.get(model);
  if (!until) return false;
  if (Date.now() > until) {
    exhaustedModels.delete(model);
    return false;
  }
  return true;
}

function markExhausted(model: string): void {
  exhaustedModels.set(model, Date.now() + EXHAUST_TTL_MS);
  if (lastWorkingModel === model) lastWorkingModel = null;
}

function looksLikeQuotaOrUnavailable(status: number, body: string): boolean {
  const t = body.toLowerCase();
  if (status === 429) return true;
  if (status === 503) return true;
  if (status === 404) return true; // model not found for this key — try next
  return (
    t.includes("resource_exhausted") ||
    t.includes("quota") ||
    t.includes("rate limit") ||
    t.includes("rate_limit") ||
    t.includes("too many requests") ||
    t.includes("exceeded") ||
    t.includes("not found") ||
    t.includes("is not found") ||
    t.includes("not supported")
  );
}

function preferFlashFirst(a: string, b: string): number {
  const score = (m: string) => {
    const x = m.toLowerCase();
    if (x.includes("flash-lite") || x.includes("flash-8b")) return 0;
    if (x.includes("flash")) return 1;
    if (x.includes("pro")) return 3;
    return 2;
  };
  return score(a) - score(b);
}

/** Discover generateContent-capable models from Google AI Studio for this key */
async function listGoogleModels(key: string): Promise<string[]> {
  if (
    cachedModelList &&
    Date.now() - cachedModelList.fetchedAt < MODEL_LIST_TTL_MS
  ) {
    return cachedModelList.models;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[google-ai] ListModels failed", res.status);
      return [];
    }
    const data = (await res.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    const models = (data.models || [])
      .filter((m) =>
        (m.supportedGenerationMethods || []).includes("generateContent")
      )
      .map((m) => (m.name || "").replace(/^models\//, ""))
      .filter((name) => {
        const n = name.toLowerCase();
        // skip embedding / vision-only / audio specialty models
        if (!name) return false;
        if (n.includes("embed")) return false;
        if (n.includes("aqa")) return false;
        if (n.includes("imagen")) return false;
        if (n.includes("tts")) return false;
        if (n.includes("robotics")) return false;
        return true;
      })
      .sort(preferFlashFirst);

    cachedModelList = { models, fetchedAt: Date.now() };
    return models;
  } catch (err) {
    console.warn("[google-ai] ListModels error", err);
    return [];
  }
}

function envPreferredModels(): string[] {
  const raw =
    process.env.GOOGLE_AI_MODELS ||
    process.env.GOOGLE_AI_MODEL ||
    process.env.GEMINI_MODEL ||
    "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function resolveGoogleModelCandidates(key: string): Promise<string[]> {
  const preferred = envPreferredModels();
  const listed = await listGoogleModels(key);
  const defaults = DEFAULT_GEMINI_CANDIDATES;

  // Merge: last-working first, then preferred, then API list, then defaults (unique)
  const ordered: string[] = [];
  const push = (m: string) => {
    if (m && !ordered.includes(m) && !isExhausted(m)) ordered.push(m);
  };

  if (lastWorkingModel) push(lastWorkingModel);
  for (const m of preferred) push(m);
  for (const m of listed) push(m);
  for (const m of defaults) push(m);

  // If everything was marked exhausted, retry all (quotas may have reset)
  if (ordered.length === 0) {
    exhaustedModels.clear();
    if (lastWorkingModel) ordered.push(lastWorkingModel);
    for (const m of [...preferred, ...listed, ...defaults]) {
      if (m && !ordered.includes(m)) ordered.push(m);
    }
  }

  return ordered;
}

type ModelAttempt =
  | { status: "ok"; text: string; model: string }
  | { status: "skip" }
  | { status: "fail" };

async function tryGoogleModel(
  key: string,
  model: string,
  system: string,
  user: string,
  options?: { json?: boolean; temperature?: number }
): Promise<ModelAttempt> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.2,
      ...(options?.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (looksLikeQuotaOrUnavailable(res.status, errText)) {
        console.warn(
          `[google-ai] model ${model} unavailable/quota (${res.status}) — trying next`
        );
        markExhausted(model);
        return { status: "skip" };
      }
      console.error(
        "[google-ai] HTTP",
        res.status,
        model,
        errText.slice(0, 300)
      );
      // hard auth errors should not burn through every model
      if (res.status === 400 && errText.toLowerCase().includes("api key")) {
        return { status: "fail" };
      }
      if (res.status === 403) {
        markExhausted(model);
        return { status: "skip" };
      }
      markExhausted(model);
      return { status: "skip" };
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      promptFeedback?: { blockReason?: string };
    };

    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim();

    if (!text) {
      console.warn(`[google-ai] model ${model} returned empty — trying next`);
      return { status: "skip" };
    }

    lastWorkingModel = model;
    console.info(`[google-ai] using model: ${model}`);
    return { status: "ok", text, model };
  } catch (err) {
    console.warn(`[google-ai] model ${model} error — trying next`, err);
    markExhausted(model);
    return { status: "skip" };
  }
}

async function completeGoogle(
  system: string,
  user: string,
  options?: { json?: boolean; temperature?: number }
): Promise<string | null> {
  const key = googleApiKey();
  if (!key) return null;

  const candidates = await resolveGoogleModelCandidates(key);
  if (!candidates.length) {
    console.error("[google-ai] no model candidates");
    return null;
  }

  for (const model of candidates) {
    const result = await tryGoogleModel(key, model, system, user, options);
    if (result.status === "ok") return result.text;
    if (result.status === "fail") return null;
  }

  console.error(
    "[google-ai] all models exhausted or failed:",
    candidates.join(", ")
  );
  return null;
}

function getXaiClient(): OpenAI | null {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  return new OpenAI({
    apiKey: key,
    baseURL: "https://api.x.ai/v1",
  });
}

async function completeXai(
  system: string,
  user: string,
  options?: { json?: boolean; temperature?: number }
): Promise<string | null> {
  const client = getXaiClient();
  if (!client) return null;

  try {
    const resp = await client.chat.completions.create({
      model: process.env.XAI_MODEL || "grok-4.5",
      temperature: options?.temperature ?? 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(options?.json
        ? { response_format: { type: "json_object" as const } }
        : {}),
    });
    return resp.choices[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error("[xai] completion failed:", err);
    return null;
  }
}

export async function complete(
  system: string,
  user: string,
  options?: { json?: boolean; temperature?: number }
): Promise<string | null> {
  // Prefer Google AI Studio when configured
  const google = await completeGoogle(system, user, options);
  if (google) return google;
  return completeXai(system, user, options);
}

export function getLlmProviderStatus(): {
  google: boolean;
  xai: boolean;
  active: "google" | "xai" | "heuristics";
} {
  const google = Boolean(googleApiKey());
  const xai = Boolean(process.env.XAI_API_KEY);
  return {
    google,
    xai,
    active: google ? "google" : xai ? "xai" : "heuristics",
  };
}

export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  if (!targetLanguage || targetLanguage === sourceLanguage) return text;

  const system = `You are a precise operational translator for FIFA World Cup 2026 stadium staff communications.
Translate the message into language code "${targetLanguage}".
STRICT RULES:
- Preserve unique nouns, token numbers, stadium location IDs, gate numbers, section numbers, radio channels, and codes as literals (do not translate them).
- Do not add pleasantries or extra content.
- Output only the translated text.`;

  const result = await complete(system, text, { temperature: 0 });
  return result || text;
}

export type { ClassifiedCategory } from "./heuristic-classify";
export { heuristicClassify } from "./heuristic-classify";
import type { ClassifiedCategory } from "./heuristic-classify";
import { heuristicClassify } from "./heuristic-classify";

export async function classifyMessage(
  text: string,
  faqTitles: string[]
): Promise<ClassifiedCategory> {
  // Hard rules first — never send in-stadium facilities to Category B
  if (isInStadiumFacilityQuery(text)) {
    return "A";
  }

  const heuristic = heuristicClassify(text);
  if (heuristic) return heuristic;

  const system = `You classify stadium volunteer messages for StadiaChat (FIFA WC 2026 ops).
Return JSON only: {"category":"A"|"B"|"C"|"D"}

A = In-stadium operational FAQs and facility questions: restrooms, ADA/elevators, medical posts, tickets, seating, WAYFINDING, FOOD STALLS / CONCESSIONS / snacks / drinks INSIDE the venue, merch shops, ATMs, Wi‑Fi, prayer rooms, guest services, lockers, bag check, water fountains — anything about amenities INSIDE the stadium perimeter.
B = ONLY true out-of-stadium / city scope: hotels, city tourism, transit OUTSIDE the venue, restaurants/bars in the city (not stadium concessions), personal chat, off-tournament.
C = Unresolved minor floor incidents with no SOP (cleanup, low inventory, minor equipment).
D = Critical safety: medical emergency, heat stroke, missing/lost child, crowd crush, fire/smoke/evacuate, unattended/suspicious bag, fight/assault, pitch invasion, active threat/lockdown, severe weather hold, structural/barrier failure, water leak on pathways.

CRITICAL: "food stalls", "where to eat in the stadium", "concessions", "drinks on concourse" = A, NEVER B.
CRITICAL: City restaurants / hotels = B.
CRITICAL: "missing child", "lost child", "fire", "unattended bag", "fight", "pitch invasion", "lockdown" = D, NEVER C.

Available FAQ protocol titles at this stadium: ${faqTitles.join("; ") || "(none)"}`;

  const result = await complete(system, text, { json: true, temperature: 0 });
  if (result) {
    try {
      const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned) as { category?: string };
      if (
        parsed.category === "A" ||
        parsed.category === "B" ||
        parsed.category === "C" ||
        parsed.category === "D"
      ) {
        // Safety net: never allow facility queries to become B
        if (parsed.category === "B" && isInStadiumFacilityQuery(text)) {
          return "A";
        }
        return parsed.category;
      }
    } catch {
      /* fall through */
    }
  }

  // Prefer FAQ/GenAI path for question-shaped text; only default floor unknowns to C
  const fallback = heuristicClassify(text);
  if (fallback) return fallback;
  const t = text.toLowerCase();
  if (
    /[?]/.test(t) ||
    /^(where|what|how|when|which|who|can i|do i|is there|are there)\b/.test(t) ||
    /\b(where is|how's|how do i|what is|need (info|directions))\b/.test(t)
  ) {
    return "A";
  }
  return "C";
}

/**
 * Generate a contextual GenAI reply for the volunteer chat timeline.
 * Returns null when no LLM is available (callers must supply a fallback).
 */
export async function generateVolunteerChatReply(input: {
  stadiumId: string;
  language: string;
  query: string;
  /** Official protocol text to ground the answer (Category A) */
  protocolTitle?: string;
  protocolBody?: string;
  protocolTitles?: string[];
  memoryBlock?: string;
  mode: "faq" | "incident_ack" | "serious_ack";
  hasPhoto?: boolean;
}): Promise<string | null> {
  const {
    stadiumId,
    language,
    query,
    protocolTitle,
    protocolBody,
    protocolTitles,
    memoryBlock,
    mode,
    hasPhoto,
  } = input;

  if (mode === "faq") {
    const grounded = protocolBody
      ? `SOURCE OF TRUTH (official stadium protocol — do not contradict; you may rephrase and apply to the volunteer's exact question):\nTitle: ${protocolTitle || "Protocol"}\n${protocolBody}`
      : `No exact protocol matched. Use general FIFA WC 2026 stadium ops knowledge for this venue. Known protocol titles: ${(protocolTitles || []).join("; ") || "(none)"}. Prefer concrete locations, signs, and next actions.`;

    return complete(
      `You are StadiaChat Core for FIFA World Cup 2026 stadium volunteers.
Answer the volunteer's operational question in chat.
Rules:
- Reply in language code: ${language}
- Concise, action-oriented, no pleasantries or filler
- Preserve gate/section/radio IDs as literals
- Never invent a different stadium
- Never answer only about restrooms unless asked
- Never refuse in-stadium facilities as tourism
- 2–6 short sentences or tight bullets max
- Make the answer specific to THIS question — do not paste a generic template`,
      `Stadium: ${stadiumId}
${grounded}
${memoryBlock ? `Recent context:\n${memoryBlock}` : ""}
Volunteer question: ${query}`,
      { temperature: 0.35 }
    );
  }

  if (mode === "incident_ack") {
    return complete(
      `You are StadiaChat Core. A minor floor incident was just logged to the Stadium Operations Lead.
Write a short volunteer-facing acknowledgment (language: ${language}).
Rules:
- Confirm the issue was logged with Ops Lead
- Briefly restate what was reported (paraphrase, 1 clause)
- Tell them to hold position / keep radio ready for Lead direction
- ${hasPhoto ? "Acknowledge photo evidence was attached." : "No photo was attached."}
- 2–4 sentences max, no fluff, unique to this report`,
      `Stadium: ${stadiumId}\nIncident report: ${query}`,
      { temperature: 0.4 }
    );
  }

  // serious_ack
  return complete(
    `You are StadiaChat Core. A SERIOUS unresolved incident was escalated to the Stadium Operations Lead with a safety timer.
Write a short volunteer-facing acknowledgment (language: ${language}).
Rules:
- Confirm SERIOUS escalation to Ops Lead
- Briefly restate the hazard reported
- Give 2–3 immediate on-scene safety holds (defensive, no heroics)
- Note Ops Lead or automated GenAI safety directive will follow shortly if Lead does not respond in time
- ${hasPhoto ? "Acknowledge photo evidence." : ""}
- 3–6 short sentences or numbered steps, specific to this report`,
    `Stadium: ${stadiumId}\nSerious report: ${query}`,
    { temperature: 0.3 }
  );
}

export async function generateRemediationOptions(
  text: string,
  severity: "normal" | "serious",
  context?: { stadiumId?: string; reporterName?: string; hasPhoto?: boolean }
): Promise<string[]> {
  const system = `You generate exactly 3 DISTINCT remediation options for a stadium Operations Lead (FIFA WC 2026).
Severity: ${severity}
Return JSON only: {"options":["...","...","..."]}
Each option is one short actionable directive the Lead can authorize (max 14 words).
Options MUST be specific to THIS incident (locations, hazard type) — never generic clones.
No filler. Operational language only.`;

  const result = await complete(
    system,
    `Stadium: ${context?.stadiumId || "unknown"}
Reporter: ${context?.reporterName || "volunteer"}
Photo evidence: ${context?.hasPhoto ? "yes" : "no"}
Incident: ${text}`,
    { json: true, temperature: 0.45 }
  );
  if (result) {
    try {
      const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned) as { options?: string[] };
      if (Array.isArray(parsed.options) && parsed.options.length >= 3) {
        return parsed.options.slice(0, 3);
      }
    } catch {
      /* fall through */
    }
  }

  const loc = extractLocation(text);
  if (severity === "serious") {
    return [
      `Cordon ${loc} and halt non-essential traffic`,
      `Dispatch medical/security team to ${loc}`,
      `Hold adjacent sections; radio Command with status`,
    ];
  }
  return [
    `Send cleanup/support kit to ${loc}`,
    `Restock or fix issue at ${loc}; confirm complete`,
    `Reassign nearest steward to cover ${loc} until resolved`,
  ];
}

/**
 * GenAI briefing shown on the Operations Lead master terminal for an incident.
 */
export async function generateOpsIncidentBriefing(input: {
  stadiumId: string;
  opsLanguage: string;
  reporterName: string;
  incidentText: string;
  severity: "normal" | "serious";
  hasPhoto?: boolean;
  protocolTitle?: string;
  remediationOptions?: string[];
}): Promise<string | null> {
  const {
    stadiumId,
    opsLanguage,
    reporterName,
    incidentText,
    severity,
    hasPhoto,
    protocolTitle,
    remediationOptions,
  } = input;

  return complete(
    `You are StadiaChat Core — GenAI co-pilot for the Stadium Operations Lead (FIFA World Cup 2026).
Write an OPS LEAD briefing for the master terminal (not the volunteer).
Language: ${opsLanguage}
Rules:
- Lead with severity tag: ${severity === "serious" ? "[SERIOUS / UNRESOLVED]" : "[INCIDENT]"}
- State who reported, what happened, where (preserve gate/section IDs)
- ${hasPhoto ? "Note photo evidence is attached." : "No photo attached."}
- Give 2–4 immediate Lead decision points (authorize / dispatch / escalate)
- If remediation options exist, reference them briefly without copying verbatim
- ${protocolTitle ? `Protocol already auto-relevant: ${protocolTitle}` : "No emergency SOP auto-deployed yet."}
- Concise, scannable, no fluff — this is matchday Command
- Unique to THIS report — never a generic template`,
    `Stadium: ${stadiumId}
Reporter: ${reporterName}
Report: ${incidentText}
Suggested remediation options: ${(remediationOptions || []).join(" | ") || "(none yet)"}`,
    { temperature: 0.4 }
  );
}

/**
 * Expand Ops Lead resolve choice into a full GenAI directive for the volunteer.
 */
export async function generateLeadResolutionDirective(input: {
  stadiumId: string;
  volunteerLanguage: string;
  leadLanguage: string;
  incidentText: string;
  severity: string;
  leadOption?: string;
  customInstruction?: string;
  leadName: string;
}): Promise<string | null> {
  const instruction =
    input.customInstruction?.trim() ||
    input.leadOption?.trim() ||
    "Proceed per Operations Lead direction.";

  return complete(
    `You are StadiaChat Core. The Stadium Operations Lead just authorized a response.
Write the DIRECTIVE the reporting volunteer will read in chat.
Language: ${input.volunteerLanguage}
Rules:
- Open with clear ownership: Ops Lead ${input.leadName} instruction
- Restate the incident briefly so the volunteer knows which report is closed
- Expand the Lead's choice into concrete on-floor steps (2–5 bullets or short sentences)
- Preserve gate/section/radio IDs as literals
- Close with: report completion / radio when done
- Action-oriented, no fluff, unique to this incident + instruction
- Do not invent facts not implied by the incident or Lead instruction`,
    `Stadium: ${input.stadiumId}
Severity: ${input.severity}
Original incident: ${input.incidentText}
Lead authorized option: ${input.leadOption || "(none)"}
Lead custom instruction: ${input.customInstruction || "(none)"}
Core instruction to expand: ${instruction}`,
    { temperature: 0.35 }
  );
}

/**
 * GenAI task card content when Ops Lead assigns work to a volunteer.
 */
export async function generateOpsTaskBriefing(input: {
  stadiumId: string;
  volunteerLanguage: string;
  command: string;
  locationTag?: string;
  locationDetail?: string;
  priority?: string;
  planTitle?: string;
}): Promise<{ task_title: string; task_body: string; location_tag: string } | null> {
  const place =
    input.locationDetail?.trim() ||
    input.locationTag?.trim() ||
    extractLocation(input.command);

  const result = await complete(
    `You are StadiaChat Core GenAI for Operations Lead task assignment (FIFA WC 2026).
Turn the Lead command into a clear volunteer task card.
Return JSON only:
{"task_title":"short imperative title max 12 words","task_body":"2-4 short sentences or numbered steps the volunteer must do","location_tag":"gate/section/place"}
Rules:
- Language of task_title and task_body: ${input.volunteerLanguage}
- Preserve gate/section IDs as literals
- task_body must be actionable and specific to THIS command — not a generic template
- Include priority awareness if critical/high
- location_tag should be concrete place of assistance`,
    `Stadium: ${input.stadiumId}
Priority: ${input.priority || "medium"}
Place of assistance: ${place}
Plan context: ${input.planTitle || "(ad-hoc task)"}
Lead command: ${input.command}`,
    { json: true, temperature: 0.35 }
  );

  if (!result) return null;
  try {
    const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      task_title?: string;
      task_body?: string;
      location_tag?: string;
    };
    if (!parsed.task_title) return null;
    return {
      task_title: parsed.task_title,
      task_body: parsed.task_body || parsed.task_title,
      location_tag: parsed.location_tag || place,
    };
  } catch {
    return null;
  }
}

/**
 * When emergency SOP matches, GenAI personalizes steps for the volunteer
 * and writes an Ops awareness brief.
 */
export async function generateEmergencyProtocolDeploy(input: {
  stadiumId: string;
  volunteerLanguage: string;
  opsLanguage: string;
  reporterName: string;
  incidentText: string;
  protocolTitle: string;
  protocolBody: string;
  hasPhoto?: boolean;
}): Promise<{ volunteerSteps: string | null; opsBrief: string | null }> {
  const volunteerSteps = await complete(
    `You are StadiaChat Critical Response GenAI for FIFA WC 2026.
An emergency SOP matched. Deploy clear steps for the REPORTING VOLUNTEER.
Language: ${input.volunteerLanguage}
SOURCE OF TRUTH (do not contradict; adapt to this exact report):
${input.protocolTitle}
${input.protocolBody}
Rules:
- Numbered steps, life-safety first
- Tie steps to the volunteer's report (location, condition)
- Preserve gate/section IDs
- No fluff, no heroics`,
    `Stadium: ${input.stadiumId}
Report: ${input.incidentText}
Photo: ${input.hasPhoto ? "yes" : "no"}`,
    { temperature: 0.25 }
  );

  const opsBrief = await complete(
    `You are StadiaChat Core for the Operations Lead master terminal.
An emergency protocol AUTO-DEPLOYED to a volunteer. Brief the Lead.
Language: ${input.opsLanguage}
Rules:
- Tag [PROTOCOL AUTO-DEPLOYED]
- Who reported, what, where
- Which protocol deployed
- What Lead should monitor / backstop
- ${input.hasPhoto ? "Photo attached." : ""}
- Concise, unique to this event`,
    `Stadium: ${input.stadiumId}
Reporter: ${input.reporterName}
Protocol: ${input.protocolTitle}
Report: ${input.incidentText}`,
    { temperature: 0.35 }
  );

  return { volunteerSteps, opsBrief };
}

export async function generateSafetyDirective(
  text: string,
  context?: { stadiumId?: string; language?: string }
): Promise<string> {
  const system = `You are the StadiaChat Critical Threat GenAI safety override for FIFA World Cup 2026.
Ops Lead did not respond within 300 seconds. Produce a defensive, high-caution safety directive for the reporting volunteer.
Language: ${context?.language || "en"}
Rules: concise numbered steps, no fluff, life safety and scene containment first, specific to THIS incident (location/hazard). Output plain text only.`;

  const result = await complete(
    system,
    `Stadium: ${context?.stadiumId || "unknown"}\nIncident report: ${text}`,
    { temperature: 0.15 }
  );

  const loc = extractLocation(text);
  return (
    result ||
    `SAFETY OVERRIDE — UNRESOLVED CRITICAL INCIDENT (${loc}):\n1. Prioritize life safety. Do not put yourself at risk.\n2. Create a clear buffer zone at ${loc}; divert non-essential foot traffic.\n3. Keep radio channel open; state section and condition every 60 seconds.\n4. Request nearest trained medical/security support on channel 1.\n5. Hold position until Operations Lead or Command issues new orders.\n6. Do not leave injured persons unattended if safe to remain.`
  );
}

export async function summarizeTask(command: string): Promise<{
  task_title: string;
  location_tag: string;
}> {
  const system = `Summarize an Operations Lead workflow command for a volunteer task card.
Return JSON: {"task_title":"short summary","location_tag":"section/gate or General"}
Preserve gate/section IDs as literals. Make title specific to this command.`;

  const result = await complete(system, command, { json: true, temperature: 0.2 });
  if (result) {
    try {
      const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned) as {
        task_title?: string;
        location_tag?: string;
      };
      if (parsed.task_title) {
        return {
          task_title: parsed.task_title,
          location_tag: parsed.location_tag || extractLocation(command),
        };
      }
    } catch {
      /* fall through */
    }
  }

  return {
    task_title: command.slice(0, 120),
    location_tag: extractLocation(command),
  };
}

function extractLocation(text: string): string {
  const m = text.match(
    /\b(gate\s*\d+|section\s*\d+|row\s*\d+|concourse\s*[a-z0-9]+|plaza\s*[a-z0-9]*)\b/i
  );
  return m ? m[0] : "General";
}
