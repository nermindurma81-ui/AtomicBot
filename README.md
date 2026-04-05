# 🦞 AtomicBot — Railway Deploy (OpenRouter Free Stack)

AtomicBot je full-stack AI workspace spreman za Railway deploy, optimiziran za **OpenRouter free modele** i multi-agent izvršavanje zadataka.

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

## Lokalni razvoj

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:3001`

## Napomena

Projekt koristi isključivo OpenRouter kompatibilne modele na backendu. Ako model nije `openrouter/*`, backend ga automatski prebacuje na free fallback model.
