# Setup (local construction)

How to build and run StadiaChat on your machine from the GitHub repo.

---

## Requirements

| Tool | Version | Notes |
|------|---------|--------|
| **Node.js** | **20.x or 22.x** (LTS) | Next.js 16 requires modern Node |
| **npm** | Comes with Node | `npm install` / `npm run dev` |
| **Git** | Any recent | Clone from GitHub |
| **MongoDB** (optional locally) | Atlas free tier or local | **Required on Render** — see [DEPLOY_RENDER.md](./DEPLOY_RENDER.md) |

Check:

```bash
node -v   # should be v20+ or v22+
```

---

## 1. Clone and install

```bash
git clone https://github.com/amol16112005/StadiaChat.git
cd StadiaChat
npm install
```

---

## 2. Environment variables

Copy the template to a local secrets file (never commit this file):

**Windows (PowerShell / CMD):**

```bash
copy .env.example .env.local
```

**macOS / Linux:**

```bash
cp .env.example .env.local
```

Edit **`.env.local`** in the project root (same folder as `package.json`).

### Variables

| Name | Required locally? | Description |
|------|-------------------|-------------|
| `GOOGLE_AI_API_KEY` | Recommended | [Google AI Studio](https://aistudio.google.com/apikey) — Gemini models |
| `GOOGLE_AI_MODELS` | Optional | Comma-separated preferred model order |
| `MONGODB_URI` | Optional locally | Without it → `data/db.json`. **Set this on Render.** |
| `MONGODB_DB` | Optional | Database name (default `stadiachat`) |
| `XAI_API_KEY` | Optional | Fallback GenAI if Google fails |
| `XAI_MODEL` | Optional | Default `grok-4.5` when using xAI |

Aliases also accepted for Google: `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`.

### Minimal `.env.local` example

```env
GOOGLE_AI_API_KEY=your_key_here
```

### With MongoDB (recommended even locally if you want durable data)

```env
GOOGLE_AI_API_KEY=your_key_here
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/
MONGODB_DB=stadiachat
```

Without any AI key, routing still works via heuristics + the local protocol library.

---

## 3. Run development server

```bash
npm run dev
```

Open **http://localhost:3000**.

| Script | Command | Use |
|--------|---------|-----|
| Dev | `npm run dev` | Hot reload, local development |
| Build | `npm run build` | Production build (same as Render) |
| Start | `npm run start` | Serve production build locally |
| Lint | `npm run lint` | ESLint |

To smoke-test a production build locally:

```bash
npm run build
npm run start
```

---

## 4. Storage backends

| Config | Backend | Notes |
|--------|---------|--------|
| No `MONGODB_URI` | File: `data/db.json` | Auto-created & seeded on first run. **Gitignored.** |
| Valid `MONGODB_URI` | MongoDB | Durable state + long-term `memory_events` |

Health check:

```text
GET http://localhost:3000/api/health/storage
```

Expect `active_backend: "file"` or `"mongodb"`.

### Reset demo data

- **File mode:** delete `data/db.json` and restart, **or**
- **Either mode:**

```bash
curl -X POST http://localhost:3000/api/admin/reset
```

---

## 5. MongoDB Atlas (optional local / required for Render)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. **Database Access** → user with read/write.
3. **Network Access** → allow your IP for local use; for Render use `0.0.0.0/0` (or Atlas private networking on paid tiers).
4. Connect → copy `mongodb+srv://…` URI into `.env.local` as `MONGODB_URI`.
5. Never commit the URI to GitHub.

---

## 6. First login (demo)

1. Open the home page.
2. **Ops Lead:** stadium `metlife_2026`, credential `ops_metlife_2026`, language `en`.
3. **Volunteer (pre-approved):** name `Alex Rivera`, stadium `metlife_2026`, PIN `WC26-MET`.

Full tables: [STADIUM_CREDENTIALS.md](./STADIUM_CREDENTIALS.md).

---

## 7. Project layout (useful paths)

```text
StadiaChat/
├── src/app/           # Next.js App Router pages + API routes
├── src/lib/           # db, mongo, orchestrator, seed, i18n
├── prompts/           # system-prompt.md (AI rules)
├── docs/              # this documentation
├── data/              # local db.json (gitignored)
├── public/uploads/    # volunteer photos (gitignored; ephemeral on Render)
├── .env.example       # template — safe to commit
└── .env.local         # secrets — never commit
```

---

## 8. Common issues

| Symptom | Fix |
|---------|-----|
| AI always heuristic / no GenAI | Set `GOOGLE_AI_API_KEY` in `.env.local`, restart `npm run dev` |
| Empty stadiums / old seed | `POST /api/admin/reset` or delete `data/db.json` |
| Mongo not used | Confirm `MONGODB_URI` has no quotes/spaces; check `/api/health/storage` |
| `npm install` fails on old Node | Upgrade to Node 20+ |
| Photos disappear after redeploy | Expected on Render free disk — use Mongo for app state; uploads are local filesystem |

---

## 9. Construction FAQ (short)

| Question | Answer |
|----------|--------|
| Node version? | **20+** (`engines` in `package.json`) |
| Must I use Mongo locally? | No — file `data/db.json` works for demos |
| Must I use Mongo on Render? | **Yes** — disk is temporary |
| Where are demo PINs? | [STADIUM_CREDENTIALS.md](./STADIUM_CREDENTIALS.md) |
| What can volunteers ask (Cat A)? | 16 facility FAQs — [PROTOCOL_PACK.md](./PROTOCOL_PACK.md) |
| Full product + eng FAQ? | [FAQ.md](./FAQ.md) (also on home page → **For developers**) |

Home page accordion FAQs use the same content as `docs/FAQ.md` (via `src/lib/locales/*.json`).

---

## Next step

Deploy to production: **[DEPLOY_RENDER.md](./DEPLOY_RENDER.md)** (you perform the deploy; that doc is instructions only).
