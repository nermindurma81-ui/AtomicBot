# 🦞 AtomicBot — Railway Deploy

## Deploy za 5 minuta

### 1. GitHub repozitorij
```bash
git init
git add .
git commit -m "AtomicBot v2.0"
git remote add origin https://github.com/TvojUsername/atomicbot.git
git push -u origin main
```

### 2. Railway
1. Idi na **railway.app** → New Project → Deploy from GitHub repo
2. Odaberi tvoj `atomicbot` repozitorij
3. Railway automatski detektuje `railway.toml`

### 3. Environment Variables
U Railway dashboardu → tvoj servis → **Variables** tab, dodaj:

| Varijabla | Vrijednost |
|-----------|-----------|
| `JWT_SECRET` | neki_dugacki_random_string |
| `ANTHROPIC_API_KEY` | sk-ant-... (opcijski) |
| `OPENROUTER_API_KEY` | sk-or-... (opcijski) |

> **Napomena:** Bez API ključeva korisnici mogu dodavati vlastite kroz Connectors UI.

### 4. Custom domain (opcijski)
Railway → Settings → Domains → Generate Domain ili dodaj vlastiti.

---

## Lokalni razvoj

```bash
# Instaliraj sve
npm install

# Dev mod (backend + frontend istovremeno)
npm run dev

# Otvori http://localhost:5173
```

## Arhitektura
```
GET/POST /api/*  → Express backend (port 3001)
GET /*           → React frontend (serviran iz /frontend/dist)
WS  /            → WebSocket (real-time)
```

## Sve što je uključeno
- ✅ Auth (register/login/JWT)  
- ✅ AI Chat streaming (Claude, OpenRouter, Mistral)
- ✅ Task management (sve u SQLite bazi)
- ✅ Connectors (API ključevi per-user)
- ✅ Clawhub Skills
- ✅ Cron Jobs (node-cron)
- ✅ VPS Instance management
- ✅ WebSocket
- ✅ Bez limita i bez planova
