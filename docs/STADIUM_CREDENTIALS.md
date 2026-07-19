# StadiaChat — Stadium credentials (demo)

> **Demo / prototype only.** Do not reuse these values in production.  
> Stadiums are seeded into `data/db.json` from `src/lib/seed.ts` (not hard-coded only in the UI). The home page loads venues from `GET /api/stadiums`.  
> After pulling seed changes, reset local data: `POST /api/admin/reset` or delete `data/db.json` and restart.

## Auth rules

| Action | Stadium PIN required? |
|--------|------------------------|
| **Register** (volunteer) | **No** — name + stadium + preferred language only → `pending` |
| **Login** (volunteer, after approval) | **Yes** — name + stadium + **stadium PIN** |
| **Ops Lead login** | Master credential (not the volunteer PIN) + stadium + language |

---

## All seeded stadiums

| Stadium | Stadium ID | City | Volunteer login PIN | Ops Lead master credential |
|---------|------------|------|---------------------|----------------------------|
| MetLife Stadium | `metlife_2026` | East Rutherford | `WC26-MET` | `ops_metlife_2026` |
| SoFi Stadium | `sofi_2026` | Inglewood | `WC26-SOFI` | `ops_sofi_2026` |
| AT&T Stadium | `att_2026` | Arlington | `WC26-ATT` | `ops_att_2026` |
| BC Place | `bcplace_2026` | Vancouver | `WC26-BCP` | `ops_bcplace_2026` |
| Estadio Azteca | `azteca_2026` | Mexico City | `WC26-AZT` | `ops_azteca_2026` |
| Hard Rock Stadium | `hardrock_2026` | Miami Gardens | `WC26-HRK` | `ops_hardrock_2026` |

---

## Pre-approved demo volunteers (login with PIN)

| Name | Stadium ID | PIN | Preferred language |
|------|------------|-----|--------------------|
| Alex Rivera | `metlife_2026` | `WC26-MET` | en |
| Maria Santos | `metlife_2026` | `WC26-MET` | es |
| Jordan Lee | `sofi_2026` | `WC26-SOFI` | en |
| Sam Ortiz | `att_2026` | `WC26-ATT` | en |
| Casey Nguyen | `bcplace_2026` | `WC26-BCP` | en |
| Diego Morales | `azteca_2026` | `WC26-AZT` | es |
| Riley Costa | `hardrock_2026` | `WC26-HRK` | pt |

---

## Ops Lead quick login

1. Home → **Ops Lead**  
2. Select stadium ID  
3. Enter master credential from the table above  
4. Choose **preferred language** (saved on the Lead profile)

Example: stadium `azteca_2026` · credential `ops_azteca_2026` · language `es`

---

## New volunteer flow

1. **Register** — name, language, stadium (no PIN)  
2. Ops Lead **approves** in Master Terminal  
3. **Login** — name, stadium, **PIN** from this document  

---

## Google AI Studio key

Create `.env.local` in the **project root** (`StadiaChat/.env.local`):

```env
GOOGLE_AI_API_KEY=your_key_from_google_ai_studio
```

Get a key: https://aistudio.google.com/apikey  

**No fixed model:** the Core lists Gemini models for your key and tries them in order (flash first). If one is out of quota / 429 / not found, it automatically uses the next model that still works. Optional preferred order only: `GOOGLE_AI_MODELS=model1,model2`.

Optional fallback: `XAI_API_KEY` (SpaceXAI / xAI). Without any key, routing uses heuristics + stadium protocol library only.
