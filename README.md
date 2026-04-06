# 🦞 Atomic Bot

Atomic Bot je full-stack AI assistant platforma optimizovana za **OpenRouter free modele** i Railway deploy.

## Deploy na Railway

### 1) GitHub repo
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/atomicbot.git
git push -u origin main
```

### 2) Railway projekt
1. Idi na [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Odaberi repozitorij
3. Railway koristi `railway.toml` i `nixpacks.toml` iz repoa

### 3) Environment varijable (Railway)
U Railway dashboardu → **Variables**:

| Varijabla | Vrijednost | Obavezno |
|---|---|---|
| `JWT_SECRET` | random string (min 32 chars) | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `OPENROUTER_API_KEY` | OpenRouter API key (fallback) | ❌ |
| `FRONTEND_URL` | npr. `https://your-app.up.railway.app` | ❌ |
| `VITE_API_BASE` | ostavi prazno ako su frontend+API isti domen; inače puni API URL | ❌ |
| `DB_PATH` | `/data/atomicbot.db` (uz Railway Volume) | ✅ |
| `OWNER_EMAIL` | admin email za seed | preporučeno |
| `OWNER_PASSWORD` | admin password za seed | preporučeno |
| `SINGLE_USER_MODE` | `true`/`false` | ❌ |

> Napomena: Ako frontend i backend rade na istom Railway domenu, `VITE_API_BASE` može ostati prazan jer frontend koristi relativne `/api/*` rute.

### 4) Railway Volume za SQLite
1. Add Service → **Volume**
2. Mount path: `/data`
3. Set `DB_PATH=/data/atomicbot.db`

## Lokalni razvoj

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Besplatni AI modeli

Aplikacija koristi **OpenRouter free** modele kroz backend normalizaciju (`openrouter/*`).
Podržani default free modeli uključuju:
- `openrouter/mistralai/mistral-7b-instruct:free`
- `openrouter/meta-llama/llama-3-8b-instruct:free`
- `openrouter/google/gemma-2-9b-it:free`
- `openrouter/deepseek/deepseek-r1:free`
- `openrouter/microsoft/phi-3-mini-128k-instruct:free`

`ollama/*` ID-jevi su podržani kao bridge alias i mapiraju se na OpenRouter modele.

## Ključne funkcije

- 💬 Real-time chat sa SSE streaming odgovorima
- 🔌 Connectors (OpenRouter/Ollama + ostali integracijski konektori)
- 🌟 Skills packovi + instalacija skillova po korisniku
- 🧠 Agency runtime (`/api/agency/run`)
- ⏰ Cron jobs
- ☁️ VPS webhook start/stop/sync
- 🩺 Self-check endpoint (`GET /api/self-check?deep=0|1`)

## Production checklist skripta

Za brzu provjeru deploya:

```bash
BASE_URL=https://your-app.up.railway.app \
LOGIN_EMAIL=you@example.com \
LOGIN_PASSWORD=your-password \
node scripts/railway-checklist.mjs
```

Opcionalno (automatski kreira/ažurira OpenRouter connector):

```bash
OPENROUTER_KEY=sk-or-... node scripts/railway-checklist.mjs
```

## Node verzija

`better-sqlite3` je pinovan za Node 20 setup:
- `NIXPACKS_NODE_VERSION=20` u `railway.toml`
- `engines.node` u `package.json` je `>=20 <22`
