import type { Protocol } from "./types";

export type VenueLandmarks = {
  id: string;
  short: string;
  guestServices: string;
  familyReunion: string;
  ticketDesk: string;
  medicalPosts: string;
  aed: string;
  adaElevator: string;
  foodZones: string;
  merch: string;
  plaza: string;
  radioCmd: string;
  radioMed: string;
  radioFac: string;
};

/** Compact FIFA WC2026-style volunteer SOP pack — applied to EVERY stadium. */
export function buildUniversalProtocols(v: VenueLandmarks): Protocol[] {
  const sid = v.id;
  const S = v.short;

  const faq = (
    key: string,
    keywords: string[],
    title: string,
    en: string,
    es?: string
  ): Protocol => ({
    id: `faq-${key}-${sid}`,
    stadium_id: sid,
    category: "faq",
    keywords,
    title: `${title} — ${S}`,
    body: es ? { en, es } : { en },
  });

  const emg = (
    key: string,
    keywords: string[],
    title: string,
    en: string,
    es?: string
  ): Protocol => ({
    id: `emg-${key}-${sid}`,
    stadium_id: sid,
    category: "emergency",
    keywords,
    title: `${title} — ${S}`,
    body: es ? { en, es } : { en },
  });

  return [
    // ── Facilities (Cat A) ──────────────────────────────────────────
    faq(
      "ada",
      ["ada", "elevator", "accessible", "wheelchair", "lift", "mobility"],
      "ADA / Elevators",
      `ADA ACCESS (${S}): ${v.adaElevator}. Escort mobility devices at peak ingress (T-60 to kickoff). Guest Services: ${v.guestServices}.`
    ),
    faq(
      "restroom",
      ["restroom", "bathroom", "toilet", "washroom", "baño"],
      "Restrooms",
      `RESTROOMS (${S}): Public restrooms on main concourse (odd/even section banks). Family/ADA restrooms marked on maps at ${v.guestServices}. Staff restrooms require badge.`
    ),
    faq(
      "tickets",
      ["lost ticket", "ticket", "missing ticket", "ticket policy", "boleto", "entrada"],
      "Lost / Ticket Resolution",
      `TICKETS (${S}): Lost/invalid tickets → ${v.ticketDesk}. Photo ID matching purchaser required. No entry without resolution authorization code. Escalate disputes to Ops Lead.`
    ),
    faq(
      "food",
      [
        "food",
        "food stall",
        "concession",
        "snack",
        "eat",
        "hungry",
        "drink",
        "comida",
        "puesto",
        "vendor",
        "restaurant",
        "where to eat",
      ],
      "Food & Concessions",
      `FOOD (${S}): ${v.foodZones}. Follow Food/Concessions signs. Card/mobile pay common. Dietary/allergen labels on boards; ${v.guestServices} for help.`
    ),
    faq(
      "merch",
      ["merch", "merchandise", "shop", "store", "jersey", "souvenir", "gift shop"],
      "Merchandise",
      `MERCH (${S}): ${v.merch}. Peak queues at half-time and full-time.`
    ),
    faq(
      "guest",
      [
        "guest services",
        "information desk",
        "info desk",
        "help desk",
        "information",
        "lost and found",
        "lost & found",
      ],
      "Guest Services / Lost & Found",
      `GUEST SERVICES (${S}): ${v.guestServices}. Lost & found, maps, accessibility escorts, language help. Do not leave post unattended without relief.`
    ),
    faq(
      "water-atm-wifi",
      ["water", "fountain", "atm", "wifi", "wi-fi", "charging", "charger", "prayer", "mosque"],
      "Water, ATM, Wi‑Fi, Prayer",
      `AMENITIES (${S}): Water refill near restrooms/first aid. ATMs near main gates and Guest Services. Official guest Wi‑Fi on concourse signage only. Multi-faith/prayer room via ${v.guestServices}.`
    ),
    faq(
      "medical-post",
      ["first aid", "medical post", "aid station", "where is medical", "enfermería"],
      "Medical Post Locations",
      `MEDICAL POSTS (${S}): ${v.medicalPosts}. Mobile response: radio ${v.radioMed}. Do not move injured persons unless immediate danger. AED: ${v.aed}.`
    ),
    faq(
      "prohibited",
      [
        "prohibited",
        "banned items",
        "flare",
        "firework",
        "vuvuzela",
        "professional camera",
        "outside food",
        "weapons",
        "bag policy",
        "clear bag",
      ],
      "Prohibited Items",
      `PROHIBITED (${S}): No weapons, flares, fireworks, laser pointers, professional cameras without media credential, large umbrellas, or outside alcohol. Bag policy per FIFA venue rules (clear bag limits). Refuse entry and radio Security if confrontation escalates.`
    ),
    faq(
      "reentry",
      ["re-entry", "reentry", "leave and return", "exit and come back"],
      "Re-entry Policy",
      `RE-ENTRY (${S}): Re-entry only if stadium policy allows and ticket is scanned out/in per gate procedure. No re-entry after full-time unless Ops directs. Direct fans to ${v.ticketDesk} for exceptions.`
    ),
    faq(
      "smoking",
      ["smoking", "smoke", "vape", "cigarette", "e-cigarette"],
      "Smoking / Vaping",
      `SMOKING (${S}): Venue is non-smoking including e-cigarettes except marked outdoor zones if any. Politely direct to designated area or outside re-entry rules. Escalate aggressive non-compliance to Security radio.`
    ),
    faq(
      "queue",
      ["queue", "line", "late arrival", "standing", "blocked view", "crowd line"],
      "Queues & Viewing",
      `QUEUES (${S}): Keep queues orderly; one steward facing fans. Late arrivals: hold until safe gap, then escort. Standing/blocked view: de-escalate, offer alternate view tips, escalate persistent issues to Ops.`
    ),
    faq(
      "accessibility-plus",
      [
        "quiet room",
        "sensory",
        "companion seat",
        "service animal",
        "wheelchair seating",
        "accessible seating",
      ],
      "Accessibility Plus",
      `ACCESSIBILITY (${S}): Wheelchair/companion seating via ushers + ${v.guestServices}. Sensory/quiet room directions from Guest Services. Service animals allowed per policy. Never separate companion without consent.`
    ),
    faq(
      "radio",
      ["radio channel", "radio channels", "what channel", "call sign"],
      "Radio Channels",
      `RADIO (${S}): Command ${v.radioCmd}; Medical ${v.radioMed}; Facilities ${v.radioFac}. State: callsign, location (gate/section), nature, need. Keep transmissions short. Emergency: clear the channel for Command.`
    ),
    faq(
      "shift",
      [
        "check in",
        "check-in",
        "checkout",
        "check out",
        "shift start",
        "break",
        "uniform",
        "credential",
        "badge",
      ],
      "Shift / Credential",
      `SHIFT (${S}): Check in at volunteer hub with credential visible. Wear issued uniform/PPE. Breaks only with relief steward. Checkout at end of shift. Lost credential → Security immediately.`
    ),
    faq(
      "zones",
      ["credential zone", "red zone", "blue zone", "vvip", "hospitality", "media zone"],
      "Zone Access",
      `ZONES (${S}): Only enter zones matching your credential color. VVIP/hospitality/media: escort paths only if assigned. Unauthorized access → stop, radio Security, do not chase into restricted areas alone.`
    ),

    // ── Emergencies (Cat D) ─────────────────────────────────────────
    emg(
      "medical",
      [
        "medical emergency",
        "medical distress",
        "heart attack",
        "unconscious",
        "not breathing",
        "collapsed",
        "cpr",
        "heat stroke",
        "heatstroke",
        "allergic",
        "epipen",
        "seizure",
      ],
      "Medical Emergency",
      `MEDICAL EMERGENCY (${S}):\n1. Radio ${v.radioMed} — section/row + condition.\n2. AED if cardiac: ${v.aed}.\n3. Clear 3m; begin CPR if trained and indicated.\n4. No food/water/meds unless trained and directed.\n5. Guide medics from nearest gate.\n6. Heat illness: shade, cool, radio medical immediately.`
    ),
    emg(
      "missing-child",
      [
        "missing child",
        "lost child",
        "lost kid",
        "missing kid",
        "can't find my child",
        "cant find my child",
        "child is missing",
        "lost my daughter",
        "lost my son",
        "separated from my child",
        "niño perdido",
        "niña perdida",
      ],
      "Missing / Lost Child",
      `MISSING CHILD (${S}) — Cat D:\n1. Stay with reporting adult.\n2. Radio ${v.radioCmd} — MISSING CHILD + last section/gate + time.\n3. Collect name, age, clothing, photo if any, guardian phone.\n4. No full-name PA unless Command orders.\n5. Escort guardian to ${v.familyReunion} if safe.\n6. Found child → Security/Guest Services only, never unverified adult.`
    ),
    emg(
      "overcrowd",
      ["crush", "crushing", "overcrowd", "overcrowding", "crowd surge", "stampede"],
      "Crowd Crush / Overcrowding",
      `CROWD CRUSH (${S}):\n1. Stop additional ingress to zone.\n2. Radio ${v.radioCmd} — OVERCROWD + section.\n3. Open relief gates only if trained.\n4. Direct to secondary egress; hold post until Command clears.\n5. Protect fallen persons if safe.`
    ),
    emg(
      "water-leak",
      ["water main", "leak", "flooding", "water leaking", "pipe burst"],
      "Water Hazard / Pathway Leak",
      `WATER HAZARD (${S}):\n1. Cordon wet path with cones.\n2. Divert foot traffic; steward both ends.\n3. Radio ${v.radioFac} — section + severity.\n4. No valve shutoff unless Facilities directs.\n5. Flag electrical near water as no-go.`
    ),
    emg(
      "fire",
      ["fire", "smoke", "burning", "evacuate", "evacuation", "alarm"],
      "Fire / Smoke / Evacuate",
      `FIRE/SMOKE (${S}):\n1. Radio ${v.radioCmd} — FIRE/SMOKE + exact location.\n2. Do not use elevators for evacuation.\n3. Direct fans to nearest marked EXIT; stay calm, no running.\n4. Assist mobility-impaired to refuge/ADA route.\n5. Do not re-enter smoky areas.\n6. Account for your zone when Command asks.`
    ),
    emg(
      "unattended-bag",
      [
        "unattended bag",
        "suspicious package",
        "suspicious bag",
        "abandoned bag",
        "unattended package",
      ],
      "Unattended / Suspicious Bag",
      `UNATTENDED BAG (${S}):\n1. Do NOT touch, open, or move the item.\n2. Create a clear buffer; keep fans away.\n3. Radio ${v.radioCmd} — SUSPICIOUS/UNATTENDED BAG + exact location.\n4. Note description, when first seen, nearby CCTV landmarks.\n5. Wait for Security/EOD; do not use radio jargon that panics public PA.`
    ),
    emg(
      "fight",
      [
        "fight",
        "fighting",
        "assault",
        "violent",
        "punch",
        "brawl",
        "fan fight",
      ],
      "Violent Incident / Fight",
      `FIGHT/ASSAULT (${S}):\n1. Do not physically intervene alone if unsafe.\n2. Radio ${v.radioCmd}/Security — FIGHT + section + number of persons.\n3. Move bystanders back; clear space.\n4. Request medical if injuries.\n5. Identify witnesses for Security; do not confiscate weapons yourself.`
    ),
    emg(
      "pitch-invasion",
      ["pitch invasion", "field invasion", "ran on the field", "on the pitch"],
      "Pitch Invasion",
      `PITCH INVASION (${S}):\n1. Radio ${v.radioCmd} immediately — PITCH INVASION + gate/section entry point.\n2. Do not chase onto the field unless trained and ordered.\n3. Hold perimeter; assist Security in identifying exit routes used.\n4. Protect technical areas if nearby without engaging the invader alone.`
    ),
    emg(
      "active-threat",
      [
        "active threat",
        "active shooter",
        "weapon",
        "gun",
        "knife attack",
        "lockdown",
        "bomb threat",
      ],
      "Active Threat / Lockdown",
      `ACTIVE THREAT (${S}):\n1. Follow Run–Hide–Tell / venue active-threat training.\n2. Radio ${v.radioCmd} only if safe — location + threat description.\n3. Move fans away from danger; lockdown doors if protocol allows.\n4. Silence phones; do not pull fire alarm unless directed.\n5. Obey Security/law enforcement only; wait for all-clear from Command.`
    ),
    emg(
      "weather",
      [
        "lightning",
        "severe weather",
        "weather delay",
        "storm",
        "tornado",
        "shelter",
      ],
      "Severe Weather Hold",
      `WEATHER HOLD (${S}):\n1. Follow Command weather delay instructions only.\n2. Move fans from open upper decks/plazas to designated shelter zones.\n3. Radio ${v.radioCmd} for crushed queues or medical from heat/storm.\n4. Do not resume normal ops until Command all-clear.`
    ),
    emg(
      "structural",
      [
        "structural",
        "collapse",
        "ceiling falling",
        "barrier failure",
        "railing broken",
      ],
      "Structural / Barrier Failure",
      `STRUCTURAL (${S}):\n1. Evacuate immediate area of failure.\n2. Radio ${v.radioCmd} + ${v.radioFac} — STRUCTURAL + location.\n3. Cordon hazard; stop traffic under/near failure.\n4. Medical if injuries; do not re-enter until Facilities/Command clear.`
    ),
  ];
}

export const VENUE_LANDMARKS: VenueLandmarks[] = [
  {
    id: "metlife_2026",
    short: "MetLife",
    guestServices: "Gate 1 west plaza (+ secondary Gates 3/5)",
    familyReunion: "Family Reunion / Guest Services Gate 1 west plaza",
    ticketDesk: "Ticket Resolution Desk Gate 1 west plaza",
    medicalPosts: "Primary posts Section 112 (south) and 148 (north)",
    aed: "Sections 110, 130, 150",
    adaElevator: "Nearest ADA to Gate 3: concourse left past Guest Services, bank ADA-G3",
    foodZones: "100-level concourse clusters ~110–118 and 140–148; plaza vendors Gates 1–3",
    merch: "Team Store west plaza Gate 1 + concourse kiosks",
    plaza: "West plaza Gate 1",
    radioCmd: "channel 1",
    radioMed: "channel 3",
    radioFac: "channel 5",
  },
  {
    id: "sofi_2026",
    short: "SoFi",
    guestServices: "Plaza Level Guest Services near Gates 2–3",
    familyReunion: "Family Reunion via Plaza Guest Services",
    ticketDesk: "Ticket Resolution Plaza Level main entry",
    medicalPosts: "Plaza and Club medical rooms per section map",
    aed: "Sections 104, 122, 140, 218",
    adaElevator: "Plaza banks A/D; Club B/C; Gate 3 → Plaza Bank A blue markers",
    foodZones: "Plaza and Club concourses; densest near Gates 2–4",
    merch: "Official store Plaza Level + satellite kiosks",
    plaza: "Main plaza Gates 2–4",
    radioCmd: "channel 1",
    radioMed: "channel 3",
    radioFac: "channel 5",
  },
  {
    id: "att_2026",
    short: "AT&T",
    guestServices: "Guest Services Gate A plaza",
    familyReunion: "Family Reunion Gate A Guest Services",
    ticketDesk: "Box Office Resolution Gate A plaza",
    medicalPosts: "Main bowl first-aid rooms per usher map",
    aed: "Distributed on main and club levels (see usher map)",
    adaElevator: "ADA elevators at main plazas and club transfers (blue signage)",
    foodZones: "Every quadrant concourse; large court near Gate A",
    merch: "Team Store Gate A plaza + bowl kiosks",
    plaza: "Gate A plaza",
    radioCmd: "channel 1",
    radioMed: "channel 3",
    radioFac: "channel 5",
  },
  {
    id: "bcplace_2026",
    short: "BC Place",
    guestServices: "Guest Services main concourse information desks",
    familyReunion: "Family Reunion at main Guest Services",
    ticketDesk: "Ticket Resolution main box office plaza",
    medicalPosts: "Bowl first-aid posts per section map",
    aed: "Sections 105, 118, 130",
    adaElevator: "ADA elevators each ring; follow blue floor markers",
    foodZones: "Main bowl concourse clusters ~110–120 and 130–140",
    merch: "Official store main plaza + concourse",
    plaza: "Main plaza",
    radioCmd: "channel 1",
    radioMed: "channel 3",
    radioFac: "channel 5",
  },
  {
    id: "azteca_2026",
    short: "Azteca",
    guestServices: "Guest Services Puerta 1",
    familyReunion: "Family Reunion Puerta 1 Guest Services",
    ticketDesk: "Resolution booth Puerta 1",
    medicalPosts: "Medical posts on main ring (see steward map)",
    aed: "Main ring AED cabinets (steward map)",
    adaElevator: "ADA routes from Puertas 1/4/7/10 — follow accessible signage",
    foodZones: "Main ring + near Puertas 1, 4, 7, 10",
    merch: "Official shops near Puerta 1 and main ring",
    plaza: "Puerta 1 plaza",
    radioCmd: "channel 1",
    radioMed: "channel 3",
    radioFac: "channel 5",
  },
  {
    id: "hardrock_2026",
    short: "Hard Rock",
    guestServices: "Guest Services near Gates B/E plaza",
    familyReunion: "Family Reunion Guest Services Gates B/E",
    ticketDesk: "Ticket Resolution main box office plaza",
    medicalPosts: "First-aid on main and upper concourses",
    aed: "Sections 106, 124, 142",
    adaElevator: "ADA elevators Gates B and E plaza; club banks blue marked",
    foodZones: "Main and upper concourses; larger clusters Gates B and E",
    merch: "Team Store plaza + bowl kiosks",
    plaza: "Gates B/E plaza",
    radioCmd: "channel 1",
    radioMed: "channel 3",
    radioFac: "channel 5",
  },
];

export function buildAllProtocols(): Protocol[] {
  return VENUE_LANDMARKS.flatMap((v) => buildUniversalProtocols(v));
}
