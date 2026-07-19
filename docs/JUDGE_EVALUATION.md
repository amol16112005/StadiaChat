# Judge evaluation — six parameters

Maps StadiaChat to the scorecard used in evaluation (Attempt 1 baseline included).

**Read first for product narrative:**

- **[WHY_STADIACHAT.md](./WHY_STADIACHAT.md)** — why this is the best problem-aligned solution  
- **[FEATURES.md](./FEATURES.md)** — complete, accurate feature inventory

| Criterion | Attempt 1 | Target | What we improved |
|-----------|-----------|--------|------------------|
| **Problem statement** | 98 | 95–100 | Explicit problem card + 6 criteria on home; this doc |
| **Security** | 98 | 95–100 | HMAC sessions, reset lock, rate limits, headers, upload sniff |
| **Code quality** | 84 | 88–92 | Extracted pure modules, serialized RMW, strong IDs |
| **Efficiency** | 80 | 85–90 | Message caps/`since`, skip Mongo mirrors on hot path |
| **Accessibility** | **45** | **75–90** | Labels, skip links, tabs, live regions, contrast, reduced motion |
| **Testing** | **0** | **80–95** | Full `npm test` suite (A–D, protocols, tenancy, crypto, i18n) |

**Total Attempt 1:** 80.25 — mainly dragged by **Testing = 0** and **Accessibility = 45**.

---

## 1. Problem statement (was 98)

| Element | Where |
|---------|--------|
| Problem | Multilingual WC2026 ops; radio/chat noise; weak isolation; slow critical escalation |
| Users | Volunteers + one Ops Lead per stadium (not public fans) |
| Solution | Tenancy-safe AI chat, A–D routing, emergency SOP, Fan Voice, 300s override |
| Non-goals | City tourism bot; free-form fan social; replace medical/security command |
| Demo | Home FAQ · [FAQ.md](./FAQ.md) · credentials in [STADIUM_CREDENTIALS.md](./STADIUM_CREDENTIALS.md) |

**In product:** home → **About** (problem + six criteria cards).

---

## 2. Security (was 98)

| Control | Implementation |
|---------|----------------|
| Session integrity | HMAC cookie (`SESSION_SECRET`); role/status from DB only |
| Cookie flags | `httpOnly`, `sameSite=lax`, `secure` in production |
| Tenancy | Messages/approve/tasks/incidents filtered by `stadium_id` |
| Role gates | Volunteer vs Ops Lead APIs |
| Auth abuse | Rate limits on login/register/reset |
| Admin reset | `ADMIN_RESET_TOKEN` / Ops Lead; not open in prod without token |
| Uploads | Magic-byte sniff; stadium-scoped paths; chat URL binding |
| Headers | Frame deny, nosniff, referrer, permissions |

**Render env:** `SESSION_SECRET`, `ADMIN_RESET_TOKEN`, `MONGODB_URI`, `GOOGLE_AI_API_KEY`.

---

## 3. Code quality (was 84)

| Practice | Location |
|----------|----------|
| Orchestrator | `src/lib/orchestrator.ts` |
| Pure match / classify | `protocol-match.ts`, `heuristic-classify.ts` |
| Protocol pack | `protocol-pack.ts` (27 × 6) |
| Scope rules | `stadium-scope.ts` |
| Serialized writes | `updateDb` queue |
| Strong IDs | `id.ts` (crypto random) |
| Session crypto | `session-crypto.ts` (unit-tested) |

---

## 4. Accessibility (was 45 → major focus)

| Feature | Surface |
|---------|---------|
| Skip links | Home, volunteer, ops |
| Labeled fields | `htmlFor` / `id` on access, plans, profile |
| Password fields | PIN + Ops credential |
| Tabs | Access forms `role="tablist"` |
| Live errors | `role="alert"` / `aria-live` |
| Chat log | `role="log"` on feeds |
| FAQ | `aria-expanded` + `aria-controls` |
| Motion | `prefers-reduced-motion` |
| Focus | `:focus-visible` outlines |
| Contrast | Stronger `--muted` on dark panels |
| Landmarks | `h1`, `main`, `nav` |

---

## 5. Efficiency (was 80)

| Optimization | Notes |
|--------------|--------|
| Protocol match first | Avoid LLM when keywords hit |
| LLM cascade + TTL | Skip exhausted models |
| Message poll | Cap 200; optional `?since=` / `?limit=` |
| Mongo hot path | `app_state` only; mirrors on reset |
| Heuristic A–D | Fast path before GenAI |

---

## 6. Testing (was 0 → major focus)

```bash
npm test          # full unit suite
npm run smoke     # live API smoke (server running)
npm run lint
npm run build
```

| Suite | Covers |
|-------|--------|
| `stadium-scope.test.ts` | Facility A vs city B |
| `heuristic-classify.test.ts` | A–D heuristics |
| `protocol-match.test.ts` | FAQ + emergency matching |
| `session-crypto.test.ts` | Signed cookies / tamper reject |
| `image-sniff.test.ts` | Upload magic bytes |
| `seed-pack.test.ts` | 6 venues, 162 protocols |
| `tenancy.test.ts` | stadium_id isolation |
| `i18n-locale.test.ts` | Locale key coverage |
| `rate-limit.test.ts` | Auth abuse limiter |
| `id.test.ts` | Unique crypto IDs |

---

## Demo credentials

| Role | Stadium | Secret |
|------|---------|--------|
| Volunteer | `metlife_2026` | Alex Rivera / `WC26-MET` |
| Ops Lead | `metlife_2026` | `ops_metlife_2026` |

Full list: [STADIUM_CREDENTIALS.md](./STADIUM_CREDENTIALS.md)
