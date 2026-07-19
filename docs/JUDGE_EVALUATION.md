# Judge evaluation — six parameters

How StadiaChat maps to common hackathon / product judging criteria.

---

## 1. Problem statement

| Element | Where |
|---------|--------|
| Problem | Multilingual stadium ops at WC2026: radio/chat noise, no SOP answers, weak isolation, slow critical escalation |
| Users | Volunteers + one Operations Lead per stadium (not public fans) |
| Solution | Tenancy-safe AI ops chat, A–D routing, emergency SOP deploy, Fan Voice, 300s safety override |
| Non-goals | City tourism bot, free-form fan social, replacement for medical/security command |
| Demo script | Home FAQ “2 minutes” · [FAQ.md](./FAQ.md) |

**In product:** home → About (problem + six criteria cards).

---

## 2. Security

| Control | Implementation |
|---------|----------------|
| Session integrity | HMAC-signed cookie (`SESSION_SECRET`); role/status always reloaded from DB |
| Cookie flags | `httpOnly`, `sameSite=lax`, `secure` in production |
| Tenancy | All ops scoped by `stadium_id` (messages, approve, tasks, incidents) |
| Role gates | Volunteer chat/upload vs Ops Lead terminal APIs |
| Auth abuse | In-memory rate limits on login/register/admin reset |
| Admin reset | Requires `ADMIN_RESET_TOKEN` header, or Ops Lead (demo), never open in prod without token |
| Uploads | Session + approved volunteer; magic-byte image sniff; stadium-scoped paths; chat binds URLs to stadium |
| Headers | `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| Demo honesty | Shared demo PINs are for prototype evaluation — not production IAM |

**Env (production):** `SESSION_SECRET`, `ADMIN_RESET_TOKEN`, `MONGODB_URI`, `GOOGLE_AI_API_KEY`.

---

## 3. Code quality / compaction

| Practice | Location |
|----------|----------|
| Orchestrator single path | `src/lib/orchestrator.ts` |
| Shared protocol pack | `src/lib/protocol-pack.ts` (27 topics × 6 venues) |
| Scope rules (A vs B) | `src/lib/stadium-scope.ts` |
| Storage abstraction | `src/lib/db.ts` (file + Mongo) |
| Serialized RMW | `updateDb` queue avoids lost concurrent writes |
| Strong IDs | `crypto` random in `src/lib/id.ts` |
| i18n | `src/lib/locales/*` + system prompt |

---

## 4. Accessibility

| Feature | Notes |
|---------|--------|
| Skip link | Skip to secure access |
| Form labels | `htmlFor` / control `id` association |
| Secrets | PIN / Ops credential `type="password"` |
| Auth tabs | `role="tablist" / tab / tabpanel` |
| Errors | `role="alert"` + `aria-live` |
| FAQ | `aria-expanded`, `aria-controls`, regions |
| Motion | `prefers-reduced-motion` disables critical pulse |
| Focus | `:focus-visible` outlines on controls |

---

## 5. Efficiency

| Optimization | Notes |
|--------------|--------|
| Protocol match first | Avoid LLM when FAQ/emergency keywords hit |
| LLM cascade + TTL | Skip exhausted models briefly (`xai.ts`) |
| Message poll cap | Default last 200; optional `?since=` / `?limit=` |
| Mongo hot path | `app_state` write only; full collection mirrors on reset or `MONGODB_MIRROR=1` |
| Fan Assist heuristics | Coaching without full model when possible |

---

## 6. Testing

```bash
npm test          # unit tests (Node test runner)
npm run smoke     # optional live smoke if server is up
npm run lint
npm run build
```

| Suite | Covers |
|-------|--------|
| `tests/stadium-scope.test.ts` | In-stadium A vs city B routing |
| `tests/rate-limit.test.ts` | Rate limiter windows |
| `tests/id.test.ts` | ID uniqueness / format |
| `scripts/smoke*.mjs` | Manual/API smoke against running app |

---

## Demo credentials (evaluation)

See [STADIUM_CREDENTIALS.md](./STADIUM_CREDENTIALS.md).

| Role | Stadium | Secret |
|------|---------|--------|
| Volunteer | `metlife_2026` | Alex Rivera / `WC26-MET` |
| Ops Lead | `metlife_2026` | `ops_metlife_2026` |
