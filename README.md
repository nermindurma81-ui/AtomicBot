# 🦞 AtomicBot — Railway Deploy (OpenRouter Free Stack)

AtomicBot je full-stack AI workspace spreman za Railway deploy, optimiziran za **OpenRouter free modele** i multi-agent izvršavanje zadataka bez dodatnih servisa.

## Glavne funkcije

- ✅ Auth (register/login/JWT)
- ✅ AI chat streaming preko OpenRouter API
- ✅ Task management (SQLite)
- ✅ Connectors (per-user ključevi)
- ✅ Clawhub skill katalog + instalacija skill packova
- ✅ AutoClaw-style execution flow (plan → alati → izvršenje)
- ✅ Agency Agents-style multi-agent runtime
- ✅ Cron jobs
- ✅ VPS instance manager
- ✅ WebSocket podrška

## Integracije implementirane u projektu

- **AutoClaw inspired runtime**: `autoclaw-core` pack + tool-calling ponašanje kroz agency runtime.
- **Agency Agents inspired runtime**: planner/researcher/executor tok kroz `/api/agency/run`.

Skill pack izvori:
- `https://github.com/tsingliuwin/autoclaw`
- `https://github.com/msitarzewski/agency-agents`

## API pregled

- `GET /api/skills/packs` — dostupni packovi
- `POST /api/skills/install` — instaliraj pack za korisnika
- `GET /api/skills/installed` — aktivni skillovi
- `POST /api/agency/run` — pokreni multi-agent izvršavanje zadatka
- `GET /api/agency/runs` — historija agent run-ova
- `GET /api/self-check?deep=0|1` — sistemska provjera (DB/schema/connectors/OpenRouter; `deep=1` pokreće i AI roundtrip test)

## Deploy za 5 minuta

### 1) GitHub repozitorij

```bash
git init
git add .
git commit -m "AtomicBot v2.1"
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

### 2) Railway

1. Idi na **railway.app** → New Project → Deploy from GitHub repo
2. Odaberi repozitorij
3. Railway automatski koristi `railway.toml`

### 3) Environment varijable

| Varijabla | Obavezno | Opis |
|---|---|---|
| `JWT_SECRET` | da | tajni string za JWT |
| `OPENROUTER_API_KEY` | da | OpenRouter ključ za free modele |
| `FRONTEND_URL` | ne | CORS origin |
| `DB_PATH` | ne | putanja do SQLite baze |
| `SINGLE_USER_MODE` | ne | `true` za jedan admin korisnik bez limita |
| `OWNER_EMAIL` | ne | dozvoljeni email za registraciju u single-user modu |
| `OWNER_PASSWORD` | ne | početna admin lozinka (preporučeno u produkciji) |
| `VITE_API_BASE` | ne | puna API baza ako frontend i API nisu na istoj domeni (npr. `https://api.example.com`) |

Za trenutni Railway deploy koristi:
- `FRONTEND_URL=https://atomicbot-production-1e32.up.railway.app`
- `VITE_API_BASE=https://atomicbot-production-1e32.up.railway.app`

## Default admin

Admin korisnik se seed-a na startupu koristeći env varijable:

- `OWNER_EMAIL` (default: `owner@example.com`)
- `OWNER_PASSWORD` (obavezno postaviti u produkciji)

Ako `OWNER_PASSWORD` nije postavljen, aplikacija generiše privremenu lozinku i ispisuje je u server log.

## Lokalni razvoj

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:3001`

## Railway checklist script (prod smoke test)

Za brzu provjeru ključnih API tokova na Railway:

```bash
BASE_URL=https://atomicbot-production-1e32.up.railway.app \
LOGIN_EMAIL=you@example.com \
LOGIN_PASSWORD=your-password \
node scripts/railway-checklist.mjs
```

Opcionalno (auto postavi/refresh OpenRouter konektor prije chat/agency testa):

```bash
OPENROUTER_KEY=sk-or-... node scripts/railway-checklist.mjs
```

Skripta sada uključuje i `GET /api/self-check` i prijavljuje `pass/warn/fail` summary.

## Railway build napomena (better-sqlite3)

Ako build puca na `better-sqlite3` (`node-gyp`, Python, `No prebuilt binaries`), koristi Node 20 runtime.

- `railway.toml` već pin-a Nixpacks na `NIXPACKS_NODE_VERSION=20`.
- `package.json` engine je ograničen na `>=20 <22`.

## Napomena

Projekt koristi isključivo OpenRouter kompatibilne modele na backendu. Ako model nije `openrouter/*`, backend ga automatski prebacuje na free fallback model.


## Ollama kompatibilnost

Ako koristiš `ollama/*` model ID, backend ga automatski mapira na OpenRouter free model (`openrouter/*`).


## Claude Opus Max Skill

`Claude Opus Max Skill` i `Codex Engineer Skill` su dostupni kroz skill packove za owner account.
