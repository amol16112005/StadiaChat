# StadiaChat

**FIFA World Cup 2026 stadium ops AI** — secure operational chat for volunteers and venue Operations Leads.

Not a public fan chatbot. A **tenancy-safe AI Core** that answers protocol FAQs, escalates floor incidents, deploys emergency SOPs, and runs a **300s safety override** when criticals go unanswered — plus **Fan Voice** so volunteers can help multilingual fans on the floor.

**GitHub:** [amol16112005/StadiaChat](https://github.com/amol16112005/StadiaChat)

> **Why this is the best fit for the problem** → **[docs/WHY_STADIACHAT.md](./docs/WHY_STADIACHAT.md)**  
> **Full feature inventory** → **[docs/FEATURES.md](./docs/FEATURES.md)**  
> **Judge scorecard (6 criteria)** → **[docs/JUDGE_EVALUATION.md](./docs/JUDGE_EVALUATION.md)**

---

## Why StadiaChat (30 seconds)

| Pain on matchday | How StadiaChat wins |
|------------------|---------------------|
| Radio / group chat is noisy and unsafe for emergencies | **A–D routing** + critical **SOP deploy** + **300s** Lead timer |
| SOP PDFs are slow and single-language | **162 protocol records** (16 FAQ + 11 emergencies × 6 venues) |
| Generic AI mixes venues and invents answers | **Stadium tenancy** + local library first, LLM second |
| Fans speak many languages | **Fan Voice** (mic/speaker) + volunteer coaching |
| Ops needs control, not a spectator seat | **Master terminal**: approve, tasks, plans, remediations |

Longer narrative: [docs/WHY_STADIACHAT.md](./docs/WHY_STADIACHAT.md)

---

## Feature highlights

| Area | Features |
|------|----------|
| **Volunteer** | Ops chat, protocol FAQs, photo evidence, task accept, Fan Voice |
| **Ops Lead** | Approvals, critical incidents, 3 remediations, task assign, planning board |
| **Safety** | Cat D immediate SOP; else Lead alert + 300s auto override |
| **AI** | Google multi-model cascade, xAI fallback, heuristics without a key |
| **Tenancy** | `stadium_id` / PIN / role; no cross-venue bleed |
| **i18n** | 11 UI languages; answers in volunteer language |
| **Security** | Signed sessions, rate limits, upload sniff, locked admin reset |
| **A11y** | Skip links, labels, password fields, live regions, reduced motion |
| **Quality** | `npm test` (37 tests), lint, production build |
| **Deploy** | GitHub → Render Web Service + MongoDB Atlas |

Complete list: [docs/FEATURES.md](./docs/FEATURES.md)

---

## Message categories (A–D)

| Cat | Meaning | Action |
|-----|---------|--------|
| **A** | Protocol FAQ | Answer from stadium protocol library |
| **B** | Out of scope | Fixed Fan Guide rejection (city/tourism) |
| **C** | Minor unresolved | Lead alert + 3 remediation checkboxes |
| **D** | Critical | Emergency SOP if known; else Lead + 300s safety override |

---

## Documentation map

| Doc | Purpose |
|-----|---------|
| **[docs/WHY_STADIACHAT.md](./docs/WHY_STADIACHAT.md)** | **Why this is the best / right solution** |
| **[docs/FEATURES.md](./docs/FEATURES.md)** | **Complete feature list** |
| [docs/JUDGE_EVALUATION.md](./docs/JUDGE_EVALUATION.md) | Six evaluation criteria + score mapping |
| [docs/FAQ.md](./docs/FAQ.md) | Product + construction FAQs |
| [docs/SETUP.md](./docs/SETUP.md) | Local construction |
| [docs/DEPLOY_RENDER.md](./docs/DEPLOY_RENDER.md) | Render deploy steps |
| [docs/STADIUM_CREDENTIALS.md](./docs/STADIUM_CREDENTIALS.md) | Demo logins |
| [docs/PROTOCOL_PACK.md](./docs/PROTOCOL_PACK.md) | FAQ + emergency topics |
| [prompts/system-prompt.md](./prompts/system-prompt.md) | AI Core rules |

**In the app:** home → **About** (problem + criteria) · **Features** · **FAQs** (judges / developers).

```bash
npm test    # 37 unit tests
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
# edit .env.local — GOOGLE_AI_API_KEY (and optional MONGODB_URI)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
Full setup: [docs/SETUP.md](./docs/SETUP.md) · Render: [docs/DEPLOY_RENDER.md](./docs/DEPLOY_RENDER.md)

---

## Demo credentials (short)

| Role | Stadium ID | Secret |
|------|------------|--------|
| Volunteer | `metlife_2026` | Name `Alex Rivera`, PIN `WC26-MET` |
| Ops Lead | `metlife_2026` | Credential `ops_metlife_2026` |

Full list: [docs/STADIUM_CREDENTIALS.md](./docs/STADIUM_CREDENTIALS.md)

**2-minute demo:** Cat A ADA question → Cat C inventory report → Ops remediations → Fan Voice (Spanish).

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
| `POST` | `/api/ops/plans` | Planning board CRUD |
| `POST` | `/api/fan-assist` | Fan Voice pipeline |
| `POST` | `/api/upload` | Photo evidence |
| `POST` | `/api/admin/reset` | Reseed (protected) |
| `GET` | `/api/health/storage` | File vs MongoDB status |

---

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind  
- **Local:** `data/db.json` when `MONGODB_URI` unset  
- **Production:** Render + **MongoDB Atlas**  
- **AI:** Google AI Studio cascade (+ optional xAI)  

---

## Git hygiene

Do **not** commit: `node_modules/`, `.next/`, `data/`, `public/uploads/`, `.env*`, large media.
