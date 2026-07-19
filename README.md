# StadiaChat

Secure operational communication for **FIFA World Cup 2026** stadium volunteers and venue staff.

The **AI Core Orchestrator** classifies every volunteer message into categories A–D, enforces stadium tenancy (`stadium_id` / PIN / role), routes incidents to the Operations Lead, deploys emergency protocols, and runs a **300s safety override** when critical incidents go unanswered.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Google AI Studio (recommended)

Put your key in **`.env.local`** at the project root (same folder as `package.json`):

```bash
# copy template
copy .env.example .env.local
```

```env
GOOGLE_AI_API_KEY=your_key_from_https://aistudio.google.com/apikey
```

The AI Core (`src/lib/xai.ts`) uses **Google AI Studio first** and **does not pin one model**. It discovers available Gemini models and tries each until one with remaining quota replies (then remembers that model). Optional preferred order: `GOOGLE_AI_MODELS=...`. Optional fallback: `XAI_API_KEY`. Without any key, heuristics + protocol library still work.

### Stadium credentials

All demo stadium IDs, volunteer PINs, and Ops credentials:  
**[docs/STADIUM_CREDENTIALS.md](./docs/STADIUM_CREDENTIALS.md)**

- **Register:** no PIN  
- **Volunteer login (after approval):** requires stadium PIN  
- **Ops Lead:** master credential + preferred language on home page

## Demo credentials

| Role | Stadium ID | Secret |
|------|------------|--------|
| Volunteer (approved) | `metlife_2026` | Name `Alex Rivera`, PIN `WC26-MET` |
| Volunteer (ES) | `metlife_2026` | Name `Maria Santos`, PIN `WC26-MET` |
| Operations Lead | `metlife_2026` | Credential `ops_metlife_2026` |

Also seeded: `sofi_2026` / `WC26-SOFI` / `ops_sofi_2026`, `att_2026` / `WC26-ATT` / `ops_att_2026`.

## Message categories

| Cat | Meaning | Action |
|-----|---------|--------|
| **A** | Protocol FAQ | Answer from local stadium doc library in volunteer language |
| **B** | Out of scope | Fixed Fan Guide rejection string |
| **C** | Minor unresolved | Lead alert + 3 remediation checkboxes |
| **D** | Critical | Emergency protocol if known (bypass Lead); else Lead alert + 300s timer + safety override |

## API surface

- `POST /api/auth/register` — volunteer registration → `pending`
- `POST /api/auth/login` — volunteer or ops modes
- `POST /api/chat` — volunteer message → orchestrator
- `GET /api/messages` — tenancy-scoped feed (+ timer tick)
- `POST /api/tasks` — Lead → volunteer task card JSON
- `POST /api/incidents/resolve` — Lead checkbox / manual override
- `POST /api/ops/approve` — approve/reject volunteers
- `POST /api/admin/reset` — reseed local JSON DB

## System prompt

Canonical rules: [`prompts/system-prompt.md`](./prompts/system-prompt.md)

## Protocols (all stadiums)

Every seeded stadium gets the **same FIFA volunteer SOP topics** via `src/lib/protocol-pack.ts` (venues only differ by landmarks/gates). Includes facilities FAQs + Cat D emergencies (medical, missing child, crush, fire, unattended bag, fight, pitch invasion, active threat, weather, structural, water hazard) plus policies (prohibited items, re-entry, smoking, queues, accessibility, radio, shift, zones).

After pulling: `POST /api/admin/reset` or delete `data/db.json` and restart.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- File-backed JSON store (`data/db.json`) for local ops demo — **gitignored**
- Google AI Studio multi-model cascade (+ optional xAI) via `.env.local`

## MongoDB memory layer

Optional persistent store + long-term event memory:

```env
# .env.local
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/
MONGODB_DB=stadiachat
```

| Without `MONGODB_URI` | With `MONGODB_URI` |
|----------------------|--------------------|
| `data/db.json` file | `app_state` + mirrored collections in Mongo |
| No long-term AI memory | `memory_events` used for AI context |

Check status: `GET /api/health/storage`  
Recent memory (auth): `GET /api/memory`

Collections: `app_state`, `stadiums`, `users`, `protocols`, `messages`, `incidents`, `ops_plans`, `memory_events`.

## Keeping GitHub under ~10 MB

Do **not** commit: `node_modules/`, `.next/`, `data/`, `public/uploads/`, `.env*`, large media.  
Source-only clone stays small; run `npm install` after clone.
