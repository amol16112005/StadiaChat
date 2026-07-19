# StadiaChat

Secure operational chat for **FIFA World Cup 2026** stadium volunteers and venue staff.

The **AI Core Orchestrator** classifies every volunteer message into categories **A–D**, enforces stadium tenancy (`stadium_id` / PIN / role), routes incidents to the Operations Lead, deploys emergency protocols, and runs a **300s safety override** when critical incidents go unanswered.

**GitHub:** [amol16112005/StadiaChat](https://github.com/amol16112005/StadiaChat)

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/SETUP.md](./docs/SETUP.md) | Local install, env vars, MongoDB, first run |
| [docs/DEPLOY_RENDER.md](./docs/DEPLOY_RENDER.md) | Deploy to **Render** (step-by-step — you run this) |
| [docs/FAQ.md](./docs/FAQ.md) | Product + construction FAQs (matches home page) |
| [docs/JUDGE_EVALUATION.md](./docs/JUDGE_EVALUATION.md) | Six evaluation criteria: problem, security, quality, a11y, efficiency, testing |
| [docs/STADIUM_CREDENTIALS.md](./docs/STADIUM_CREDENTIALS.md) | Demo stadium IDs, PINs, Ops credentials |
| [docs/PROTOCOL_PACK.md](./docs/PROTOCOL_PACK.md) | Stadium protocol FAQs + emergency topics + sample questions |
| [prompts/system-prompt.md](./prompts/system-prompt.md) | Canonical AI Core system rules |

**In the app:** home → **About** (problem + six criteria) · **FAQs** (judges / developers).

```bash
npm test    # unit tests
npm run lint
npm run build
```
---

## Quick start (local)

```bash
git clone https://github.com/amol16112005/StadiaChat.git
cd StadiaChat
npm install
copy .env.example .env.local
# edit .env.local — add GOOGLE_AI_API_KEY (and optional MONGODB_URI)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Full setup: **[docs/SETUP.md](./docs/SETUP.md)**  
Production on Render: **[docs/DEPLOY_RENDER.md](./docs/DEPLOY_RENDER.md)**

---

## Demo credentials (short)

| Role | Stadium ID | Secret |
|------|------------|--------|
| Volunteer | `metlife_2026` | Name `Alex Rivera`, PIN `WC26-MET` |
| Ops Lead | `metlife_2026` | Credential `ops_metlife_2026` |

Full list: [docs/STADIUM_CREDENTIALS.md](./docs/STADIUM_CREDENTIALS.md)

---

## Message categories

| Cat | Meaning | Action |
|-----|---------|--------|
| **A** | Protocol FAQ | Answer from stadium protocol library (volunteer language) |
| **B** | Out of scope | Fixed Fan Guide rejection |
| **C** | Minor unresolved | Lead alert + remediation checkboxes |
| **D** | Critical | Known emergency protocol if available; else Lead + 300s safety override |

---

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/register` | Volunteer registration → `pending` |
| `POST` | `/api/auth/login` | Volunteer or Ops Lead login |
| `POST` | `/api/chat` | Volunteer message → orchestrator |
| `GET` | `/api/messages` | Tenancy-scoped feed (+ timer tick) |
| `POST` | `/api/tasks` | Lead → volunteer task card |
| `POST` | `/api/incidents/resolve` | Lead resolve / override |
| `POST` | `/api/ops/approve` | Approve / reject volunteers |
| `POST` | `/api/admin/reset` | Reseed database |
| `GET` | `/api/health/storage` | File vs MongoDB backend status |

---

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind
- **Local:** `data/db.json` (gitignored) when `MONGODB_URI` is unset
- **Production (Render):** set **`MONGODB_URI`** (MongoDB Atlas) — disk is ephemeral
- **AI:** Google AI Studio multi-model cascade; optional `XAI_API_KEY` fallback

---

## Git hygiene

Do **not** commit: `node_modules/`, `.next/`, `data/`, `public/uploads/`, `.env*`, large media.  
Clone stays small; run `npm install` after clone.
