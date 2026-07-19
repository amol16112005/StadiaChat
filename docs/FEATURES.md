# StadiaChat — complete feature list

Accurate inventory of what the product **actually ships**.  
For “why this wins,” see [WHY_STADIACHAT.md](./WHY_STADIACHAT.md).

---

## 1. Core product (matchday ops)

| Feature | What it does |
|---------|----------------|
| **Volunteer ops chat** | Approved volunteers send reports/questions; AI Core routes every message |
| **Ops Lead master terminal** | One Lead per stadium: approvals, tasks, plans, critical incidents |
| **Stadium tenancy** | Every session bound to `stadium_id` + role; no cross-venue data bleed |
| **A–D message routing** | Instant classification into Protocol / Out-of-scope / Minor / Critical |
| **Protocol FAQ library (Cat A)** | 16 facility topics × 6 venues (ADA, restrooms, food, tickets, radio, zones…) |
| **Emergency SOP deploy (Cat D)** | 11 emergency topics; known SOPs deploy **immediately** (bypass Lead) |
| **300s safety override** | Unresolved criticals: Lead alert + timer → auto safety directive if no Lead action |
| **Out-of-scope hard reject (Cat B)** | City/tourism questions → fixed Fan Guide rejection (no free-form city advice) |
| **Minor incident path (Cat C)** | Floor issues → Lead card with **3 remediation checkboxes** |
| **Fan Voice Assist** | Mic + speaker: fan language in, spoken answer out; volunteer coaching when hands-on help needed |
| **Photo evidence** | Volunteer attaches photos (magic-byte validated, stadium-scoped paths) |
| **Task cards** | Lead assigns location-tagged tasks; volunteer can accept |
| **Ops planning board** | Plans with place of assist, priority, time window, assigned volunteers |
| **Volunteer registration** | Name + language + stadium → `pending` (no PIN at register) |
| **PIN login after approval** | Volunteers need stadium PIN only after Ops approves |
| **Ops master credential** | Separate credential per stadium (e.g. `ops_metlife_2026`) |
| **Multilingual UI** | 11 UI languages (en, es, fr, pt, de, ar, ja, ko, zh, it, hi) |
| **Protocol answers in volunteer language** | Localized body when available; translation path for GenAI replies |
| **Profile** | Update display name + preferred language |
| **Admin reseed** | Protected `POST /api/admin/reset` for demo/protocol pack reload |

---

## 2. AI Core behavior

| Feature | What it does |
|---------|----------------|
| **Google AI Studio first** | Multi-model cascade (not pinned to one Gemini); skips exhausted models |
| **Optional xAI fallback** | `XAI_API_KEY` if Google fails |
| **Heuristic fallback** | Without any API key, A–D heuristics + protocol pack still work |
| **Protocol match before LLM** | Keyword scoring against local library (faster, cheaper, offline-friendly) |
| **In-stadium vs city scope** | Facilities never Class B; city tourism is B |
| **System prompt rules** | Canonical ops rules in `prompts/system-prompt.md` |
| **Long-term memory (optional)** | With MongoDB: `memory_events` for AI context |

---

## 3. Security & tenancy

| Feature | What it does |
|---------|----------------|
| **HMAC-signed session cookies** | Cannot forge role/user_id in the cookie |
| **Role/status from DB** | Cookie only carries user id; authority always reloaded |
| **HttpOnly + SameSite + Secure (prod)** | Browser cookie hygiene |
| **Role-gated APIs** | Chat/upload for volunteers; approve/tasks/plans for Lead |
| **Stadium-scoped queries** | Messages, incidents, users filtered by `stadium_id` |
| **Rate-limited auth** | Login / register / admin reset throttles |
| **Protected admin reset** | Token header and/or Ops Lead; not open in production without token |
| **Upload magic-byte check** | Rejects non-image payloads |
| **Attachment path binding** | Chat only accepts `/uploads/{stadium}/…` for own stadium |
| **Security headers** | X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| **Stadium list without secrets** | `GET /api/stadiums` does not expose PINs/credentials |

---

## 4. Accessibility

| Feature | Where |
|---------|--------|
| Skip links | Home, volunteer, ops |
| Associated form labels | Access, plans, profile |
| Password inputs | Stadium PIN, Ops credential |
| Tab semantics | Home access (volunteer / register / ops) |
| Live error regions | Login, chat, ops |
| Chat as `role="log"` | Volunteer + ops feeds |
| FAQ accordion ARIA | Expanded / controls / regions |
| Reduced motion | Critical pulse + global transitions |
| Focus-visible outlines | Buttons, inputs, links |
| Landmarks | `h1`, `main`, `nav` |
| Stronger muted contrast | Dark UI readability |

---

## 5. Efficiency & reliability

| Feature | What it does |
|---------|----------------|
| Message poll cap | Default last 200; optional `?since=` / `?limit=` |
| Serialized DB writes | Concurrent chat/ops won’t drop updates |
| Mongo hot path | Write `app_state` only; full mirrors on reset |
| Model TTL skip | Don’t hammer rate-limited models |
| File or Mongo backend | Local demo without DB; production with Atlas |

---

## 6. Data & deployment

| Feature | What it does |
|---------|----------------|
| Seeded 6 World Cup venues | MetLife, SoFi, AT&T, BC Place, Azteca, Hard Rock |
| 162 protocol records | 27 topics × 6 stadiums |
| Demo volunteers + Ops leads | Ready for 2-minute evaluation |
| GitHub source | [amol16112005/StadiaChat](https://github.com/amol16112005/StadiaChat) |
| Render Web Service | `npm install && npm run build` · `npm start` |
| MongoDB Atlas production | Durable users/messages/incidents |
| Health endpoint | `GET /api/health/storage` |

---

## 7. Testing & quality gates

| Feature | Command / location |
|---------|-------------------|
| **37 unit tests** | `npm test` (A–D, protocols, tenancy, crypto, sniff, i18n, rate limit) |
| Smoke scripts | `npm run smoke` (live server) |
| Lint / build | `npm run lint` · `npm run build` |

---

## 8. What it is **not** (honest boundaries)

- Not a public fan tourism chatbot  
- Not a replacement for medical/security radio command  
- Not free-form social chat between fans  
- Not multi-region hardened enterprise IAM (demo PINs for evaluation; production would harden further)  
- Photo files on free Render disk can be ephemeral (app **state** is durable with Mongo)

---

## Related docs

| Doc | Role |
|-----|------|
| [WHY_STADIACHAT.md](./WHY_STADIACHAT.md) | Why this is the right / best fit for the problem |
| [JUDGE_EVALUATION.md](./JUDGE_EVALUATION.md) | Six scorecard criteria |
| [PROTOCOL_PACK.md](./PROTOCOL_PACK.md) | FAQ + emergency topics |
| [FAQ.md](./FAQ.md) | Judges + developers Q&A |
| [SETUP.md](./SETUP.md) / [DEPLOY_RENDER.md](./DEPLOY_RENDER.md) | Construction & deploy |
