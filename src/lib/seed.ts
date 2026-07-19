import type { Database, Stadium, User } from "./types";
import { buildAllProtocols, VENUE_LANDMARKS } from "./protocol-pack";

const STADIUM_META: {
  id: string;
  name: string;
  pin: string;
  ops_credential: string;
  city: string;
  opsName: string;
  opsLang: string;
  demoVol?: { id: string; name: string; lang: string };
}[] = [
  {
    id: "metlife_2026",
    name: "MetLife Stadium",
    pin: "WC26-MET",
    ops_credential: "ops_metlife_2026",
    city: "East Rutherford",
    opsName: "MetLife Operations Lead",
    opsLang: "en",
    demoVol: { id: "vol-demo", name: "Alex Rivera", lang: "en" },
  },
  {
    id: "sofi_2026",
    name: "SoFi Stadium",
    pin: "WC26-SOFI",
    ops_credential: "ops_sofi_2026",
    city: "Inglewood",
    opsName: "SoFi Operations Lead",
    opsLang: "en",
    demoVol: { id: "vol-sofi", name: "Jordan Lee", lang: "en" },
  },
  {
    id: "att_2026",
    name: "AT&T Stadium",
    pin: "WC26-ATT",
    ops_credential: "ops_att_2026",
    city: "Arlington",
    opsName: "AT&T Operations Lead",
    opsLang: "en",
    demoVol: { id: "vol-att", name: "Sam Ortiz", lang: "en" },
  },
  {
    id: "bcplace_2026",
    name: "BC Place",
    pin: "WC26-BCP",
    ops_credential: "ops_bcplace_2026",
    city: "Vancouver",
    opsName: "BC Place Operations Lead",
    opsLang: "en",
    demoVol: { id: "vol-bcp", name: "Casey Nguyen", lang: "en" },
  },
  {
    id: "azteca_2026",
    name: "Estadio Azteca",
    pin: "WC26-AZT",
    ops_credential: "ops_azteca_2026",
    city: "Mexico City",
    opsName: "Azteca Operations Lead",
    opsLang: "es",
    demoVol: { id: "vol-azt", name: "Diego Morales", lang: "es" },
  },
  {
    id: "hardrock_2026",
    name: "Hard Rock Stadium",
    pin: "WC26-HRK",
    ops_credential: "ops_hardrock_2026",
    city: "Miami Gardens",
    opsName: "Hard Rock Operations Lead",
    opsLang: "en",
    demoVol: { id: "vol-hrk", name: "Riley Costa", lang: "pt" },
  },
];

export function seedDatabase(): Database {
  const now = new Date().toISOString();

  // Sanity: landmarks cover every seeded stadium
  const landmarkIds = new Set(VENUE_LANDMARKS.map((v) => v.id));
  for (const s of STADIUM_META) {
    if (!landmarkIds.has(s.id)) {
      throw new Error(`Missing protocol landmarks for ${s.id}`);
    }
  }

  const stadiums: Stadium[] = STADIUM_META.map((s) => ({
    id: s.id,
    name: s.name,
    pin: s.pin,
    ops_credential: s.ops_credential,
    city: s.city,
  }));

  const users: User[] = [];
  for (const s of STADIUM_META) {
    users.push({
      id: `ops-${s.id.replace(/_2026$/, "")}`,
      name: s.opsName,
      preferred_language: s.opsLang,
      stadium_id: s.id,
      role: "Operations_Lead",
      status: "approved",
      password: s.ops_credential,
      created_at: now,
    });
    if (s.demoVol) {
      users.push({
        id: s.demoVol.id,
        name: s.demoVol.name,
        preferred_language: s.demoVol.lang,
        stadium_id: s.id,
        role: "Volunteer",
        status: "approved",
        created_at: now,
      });
    }
  }

  // Extra MetLife Spanish demo volunteer
  users.push({
    id: "vol-es",
    name: "Maria Santos",
    preferred_language: "es",
    stadium_id: "metlife_2026",
    role: "Volunteer",
    status: "approved",
    created_at: now,
  });

  // Universal FIFA volunteer SOP pack — same topics for ALL stadiums
  const protocols = buildAllProtocols();

  return {
    stadiums,
    users,
    protocols,
    messages: [],
    incidents: [],
    ops_plans: [],
  };
}
