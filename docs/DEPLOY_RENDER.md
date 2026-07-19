# Deploy to Render (instructions only)

You run every step yourself. This guide matches **StadiaChat** as a **Next.js Web Service** on [Render](https://render.com).

Official Render reference: [Deploy a Next.js App](https://render.com/docs/deploy-nextjs-app)

---

## Before you start

### Checklist

- [ ] Code is on GitHub: [amol16112005/StadiaChat](https://github.com/amol16112005/StadiaChat)
- [ ] Local app builds: `npm run build` succeeds on your machine (see [SETUP.md](./SETUP.md))
- [ ] **MongoDB Atlas** cluster ready (required on Render — free tier is fine)
- [ ] **Google AI Studio** API key ready (recommended)
- [ ] Render account signed up at [dashboard.render.com](https://dashboard.render.com)

### Why MongoDB is required on Render

Render free/web instances use an **ephemeral filesystem**. On each deploy or restart:

- `data/db.json` is **lost**
- `public/uploads/` photos are **lost**

Set **`MONGODB_URI`** so operational data (users, messages, incidents, protocols) is durable.

Photo uploads still write to local disk unless you later add object storage; treat photos as best-effort on free Render.

---

## Part A — MongoDB Atlas (do this first)

1. Open [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) → create a free **M0** cluster if you do not have one.
2. **Database Access** → Add user → password auth → save username/password.
3. **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`)  
   (Render outbound IPs change; this is normal for serverless/PaaS demos.)
4. **Database** → **Connect** → **Drivers** → copy the URI, e.g.:

   ```text
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

5. Replace `USER` / `PASSWORD` with real values. If the password has special characters, [URL-encode](https://www.urlencoder.org/) them.
6. Keep this string private — paste only into Render env vars, never into git.

Optional: set database name via `MONGODB_DB=stadiachat` on Render (app default is already `stadiachat`).

---

## Part B — Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com) → **New +** → **Web Service**.
2. Connect your **GitHub** account if asked.
3. Select repository **`amol16112005/StadiaChat`** (or your fork).
4. Fill in:

| Field | Value |
|-------|--------|
| **Name** | `stadiachat` (or any unique name) |
| **Region** | Closest to you / your users |
| **Branch** | `main` |
| **Root Directory** | *(leave empty)* |
| **Runtime** | **Node** |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance type** | Free (or paid if you need always-on) |

5. Do **not** choose “Static Site” — this app needs API routes and a Node server (`next start`).

### Node version

Render should pick a modern Node from the environment. If the build fails on an old Node:

- Dashboard → your service → **Environment** → add:

  | Key | Value |
  |-----|--------|
  | `NODE_VERSION` | `22.16.0` |

  (or `20.18.0` — any **20+** LTS is fine)

Docs: [Specifying a Node Version](https://render.com/docs/node-version)

---

## Part C — Environment variables on Render

In the same create flow, or later under **Environment** → **Environment Variables**, add:

| Key | Required | Example / notes |
|-----|----------|-----------------|
| `GOOGLE_AI_API_KEY` | Recommended | From [AI Studio](https://aistudio.google.com/apikey) |
| `MONGODB_URI` | **Yes for production** | Full `mongodb+srv://…` string |
| `MONGODB_DB` | Optional | `stadiachat` |
| `SESSION_SECRET` | **Recommended** | Long random string (HMAC session cookies) |
| `ADMIN_RESET_TOKEN` | **Recommended** | Protects `POST /api/admin/reset` |
| `XAI_API_KEY` | Optional | Fallback GenAI |
| `XAI_MODEL` | Optional | e.g. `grok-4.5` |
| `NODE_VERSION` | If build fails | `22.16.0` |

### Important

- Mark secrets as **Secret** if Render offers that toggle.
- Do **not** commit `.env.local` to GitHub.
- Render injects `PORT` automatically — you do **not** set `PORT`. `next start` uses it.

Optional preferred models:

```text
GOOGLE_AI_MODELS=gemini-2.0-flash,gemini-2.0-flash-lite
```

---

## Part D — Deploy

1. Click **Create Web Service** / **Deploy**.
2. Watch **Logs** until build finishes:
   - `npm install`
   - `next build` (must exit 0)
   - `next start` / listening on assigned port
3. Open the public URL Render shows, e.g. `https://stadiachat-xxxx.onrender.com`.

### First deploy checks

| Check | How |
|-------|-----|
| Home page loads | Open the Render URL |
| Mongo connected | `GET https://YOUR-SERVICE.onrender.com/api/health/storage` → `"active_backend":"mongodb"`, `"mongo_ready":true` |
| Demo login | Ops: `metlife_2026` / `ops_metlife_2026` — see [STADIUM_CREDENTIALS.md](./STADIUM_CREDENTIALS.md) |

If Mongo is wrong, health may show `"active_backend":"file"` or an error — fix `MONGODB_URI` and **Manual Deploy** again.

### Seed / reset after go-live

Data is seeded automatically the first time the app connects to an empty Mongo DB.

To force reseed (wipes demo state in that database):

```bash
curl -X POST https://YOUR-SERVICE.onrender.com/api/admin/reset
```

Use sparingly on production.

---

## Part E — Auto-deploys from GitHub

By default, pushing to the connected branch (`main`) triggers a new Render deploy.

1. Commit and push on your machine:

   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```

2. Render rebuilds automatically (if Auto-Deploy is on).
3. Confirm in Render **Events** / **Logs**.

To redeploy without a new commit: Render → **Manual Deploy** → **Deploy latest commit**.

---

## Free tier notes

| Topic | What to expect |
|-------|----------------|
| **Cold starts** | Free services spin down after idle; first request can take 30–60+ seconds |
| **Ephemeral disk** | Uploaded photos under `public/uploads` may vanish on restart |
| **Build minutes** | Free accounts have monthly build limits |
| **Custom domain** | Optional under Render → Settings → Custom Domains |

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| Build fails: Node too old | Set `NODE_VERSION=22.16.0` (or 20.x) |
| Build fails: TypeScript / Next errors | Run `npm run build` locally; fix before push |
| App up but data resets every deploy | `MONGODB_URI` missing or wrong — check `/api/health/storage` |
| Mongo connection timeout | Atlas Network Access must allow `0.0.0.0/0`; user password correct; URI encoded |
| AI not smart / heuristic only | Set `GOOGLE_AI_API_KEY` on Render, redeploy or restart |
| 502 / app crashed | Open **Logs** for stack traces; common cause is bad env or OOM on free tier |
| Wrong repo branch | Settings → ensure branch is `main` |

---

## Summary (copy-paste for Render UI)

```text
Runtime:        Node
Build Command:  npm install && npm run build
Start Command:  npm start
Branch:         main

Env (minimum):
  MONGODB_URI=mongodb+srv://...
  GOOGLE_AI_API_KEY=...
  MONGODB_DB=stadiachat
```

You deploy; this file is the checklist only. Local construction details stay in [SETUP.md](./SETUP.md).

---

## Deploy FAQ (short)

| Question | Answer |
|----------|--------|
| Static Site or Web Service? | **Web Service** (API routes + `next start`) |
| Why Mongo? | Render disk is ephemeral; without Atlas, data resets |
| Atlas “public”? | Network Access `0.0.0.0/0` + strong DB user password is normal for PaaS |
| Health check URL? | `GET /api/health/storage` → `active_backend: mongodb` |
| Demo login on live URL? | Same as local — [STADIUM_CREDENTIALS.md](./STADIUM_CREDENTIALS.md) |
| Cold start slow? | Free tier spins down when idle; first hit can take 30–60s |
| Full FAQ? | [FAQ.md](./FAQ.md) · home page **For developers** |
