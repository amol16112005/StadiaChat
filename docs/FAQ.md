# StadiaChat — FAQ (product + construction)

Long-form answers that match the **Quick FAQs** section on the home page.  
Also see: [SETUP.md](./SETUP.md) · [DEPLOY_RENDER.md](./DEPLOY_RENDER.md) · [PROTOCOL_PACK.md](./PROTOCOL_PACK.md) · [STADIUM_CREDENTIALS.md](./STADIUM_CREDENTIALS.md)

---

## For judges / product

### What problem does StadiaChat solve?

World Cup venues run thousands of multilingual volunteers. Radio and ad-hoc chat are noisy, unsafe for emergencies, and can leak data across sites. StadiaChat is a **tenancy-safe AI ops channel**: official SOP answers instantly, escalates only what needs a human Lead, deploys emergency protocols under pressure, and helps volunteers assist fans in their language via **Fan Voice**.

### Who is it for?

- **Stadium volunteers** (after Ops approval + PIN login)
- **One Operations Lead per stadium** (master credential)

Not a public fan chatbot. Fans are helped through the volunteer’s device (mic + speaker).  
Six demo venues: MetLife, SoFi, AT&T, BC Place, Azteca, Hard Rock.

### What should I demo in 2 minutes?

1. Volunteer: `Alex Rivera` · `metlife_2026` · PIN `WC26-MET`
2. Ask: “Where is the ADA elevator to Gate 3?” → **Cat A** protocol FAQ  
3. Report: “Low brochure inventory at Gate 1” → **Cat C** to Ops Lead  
4. Ops Lead: `metlife_2026` · `ops_metlife_2026` — approve remediations  
5. **Fan Voice**: Spanish facility question → spoken answer + coaching when needed  

### How does safety work (Category D)?

| Case | Behavior |
|------|----------|
| Matching emergency protocol | Deploy to volunteer **immediately** (bypass Lead) |
| No matching protocol | Lead gets critical alert + 3 options + **300s** timer |
| Lead does not act in time | Automatic safety directive to the volunteer |

Emergencies include medical, missing child, crush, fire, unattended bag, fight, pitch invasion, active threat, weather hold, structural failure, water hazard.

### What stadium protocol FAQs exist?

**16 Cat A** topics per stadium (landmarks differ by venue) and **11 Cat D** emergencies.  
Full list + sample questions: [PROTOCOL_PACK.md](./PROTOCOL_PACK.md).

### Where does it run? Is data durable?

| Environment | Host | Data |
|-------------|------|------|
| Local | `npm run dev` | `data/db.json` or optional Mongo |
| Production | **Render** Web Service | **MongoDB Atlas** via `MONGODB_URI` |

Health: `GET /api/health/storage` → `"active_backend": "mongodb"` when Atlas is connected.

---

## For developers / construction

### How do I run it locally?

Full steps: [SETUP.md](./SETUP.md).

```bash
git clone https://github.com/amol16112005/StadiaChat.git
cd StadiaChat
npm install
copy .env.example .env.local   # then add keys
npm run dev
```

- **Node 20+**
- `GOOGLE_AI_API_KEY` recommended  
- `MONGODB_URI` optional locally  
- Without AI key: heuristics + protocol library still work  

### Demo credentials?

[STADIUM_CREDENTIALS.md](./STADIUM_CREDENTIALS.md)

| Role | Stadium | Secret |
|------|---------|--------|
| Volunteer | `metlife_2026` | Name `Alex Rivera`, PIN `WC26-MET` |
| Ops Lead | `metlife_2026` | `ops_metlife_2026` |

Register: no PIN. Login after approval: PIN required.

### Where is the AI Core?

| Path | Role |
|------|------|
| `src/lib/orchestrator.ts` | A–D routing |
| `src/lib/fan-assist.ts` | Fan Voice + coaching |
| `src/lib/xai.ts` | Google AI Studio multi-model |
| `src/lib/protocol-pack.ts` | Seeded FAQ + emergency SOPs |
| `src/lib/memory.ts` | Mongo long-term memory |
| `prompts/system-prompt.md` | Canonical AI rules |

### Key API routes?

| Method | Path |
|--------|------|
| POST | `/api/chat`, `/api/fan-assist`, `/api/tasks`, `/api/incidents/resolve`, `/api/ops/approve`, `/api/auth/login`, `/api/auth/register`, `/api/admin/reset` |
| GET | `/api/messages`, `/api/stadiums`, `/api/memory`, `/api/health/storage` |

### How is data stored?

| Mode | When | Store |
|------|------|--------|
| File | No `MONGODB_URI` | `data/db.json` (gitignored) |
| MongoDB | `MONGODB_URI` set | `app_state`, `memory_events`, mirrored collections |

Always filtered by `stadium_id`. Reseed: `POST /api/admin/reset`.

### Sample messages (A–D)

| Cat | Example |
|-----|---------|
| **A** | Where is the nearest ADA elevator to Gate 3? / Where can I buy food near section 110? |
| **B** | Best restaurants near the stadium downtown? → Fan Guide reject |
| **C** | Low brochure inventory at Gate 1 |
| **D** | Missing child near Gate 3 / medical distress section 112 / unattended bag by restrooms |

### How do I deploy to Render?

Full steps: [DEPLOY_RENDER.md](./DEPLOY_RENDER.md).

```text
Runtime:        Node
Build:          npm install && npm run build
Start:          npm start
Branch:         main

Env (minimum):
  MONGODB_URI=mongodb+srv://...
  GOOGLE_AI_API_KEY=...
  MONGODB_DB=stadiachat
```

Atlas Network Access: `0.0.0.0/0` for Render. Not a Static Site.

### Where are the construction docs?

| Doc | Purpose |
|-----|---------|
| [SETUP.md](./SETUP.md) | Local install & env |
| [DEPLOY_RENDER.md](./DEPLOY_RENDER.md) | Render deploy |
| [FAQ.md](./FAQ.md) | This file |
| [STADIUM_CREDENTIALS.md](./STADIUM_CREDENTIALS.md) | Demo logins |
| [PROTOCOL_PACK.md](./PROTOCOL_PACK.md) | Protocol FAQ topics |
| [../README.md](../README.md) | Project overview |

Secrets only in `.env.local` or Render **Environment** — never commit to GitHub.
