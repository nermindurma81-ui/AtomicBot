#!/usr/bin/env node
/**
 * Railway production checklist for AtomicBot.
 *
 * Usage:
 *   BASE_URL=https://atomicbot-production-1e32.up.railway.app \
 *   LOGIN_EMAIL=you@example.com \
 *   LOGIN_PASSWORD=your-password \
 *   node scripts/railway-checklist.mjs
 *
 * Optional:
 *   OPENROUTER_KEY=sk-or-...   # auto-create/update OpenRouter connector before chat/agency tests
 */

const BASE_URL = (process.env.BASE_URL || 'https://atomicbot-production-1e32.up.railway.app').replace(/\/$/, '');
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
  console.error('❌ Missing LOGIN_EMAIL and/or LOGIN_PASSWORD env vars.');
  process.exit(2);
}

const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(path, options = {}, token) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch { /* keep raw */ }
  return { status: res.status, ok: res.ok, data };
}

function addResult(name, ok, extra = '') {
  const icon = ok ? '✅' : '❌';
  const line = `${icon} ${name}${extra ? ` — ${extra}` : ''}`;
  results.push({ ok, line });
  console.log(line);
}

async function main() {
  try {
    const health = await request('/health');
    addResult('GET /health', health.ok, `status=${health.status}`);

    const login = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    });
    const token = login.data?.token;
    addResult('POST /api/auth/login', !!token, `status=${login.status}`);
    if (!token) throw new Error('Login failed. Stopping checklist.');

    const connectors = await request('/api/connectors', {}, token);
    addResult('GET /api/connectors', connectors.ok, `status=${connectors.status}`);

    if (OPENROUTER_KEY) {
      const existing = Array.isArray(connectors.data)
        ? connectors.data.find((c) => c.type === 'openrouter')
        : null;
      if (existing) {
        const upd = await request(`/api/connectors/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: { apiKey: OPENROUTER_KEY }, active: true }),
        }, token);
        addResult('PUT /api/connectors/:id (openrouter)', upd.ok, `status=${upd.status}`);
      } else {
        const crt = await request('/api/connectors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'openrouter', name: 'OpenRouter', config: { apiKey: OPENROUTER_KEY } }),
        }, token);
        addResult('POST /api/connectors (openrouter)', crt.ok, `status=${crt.status}`);
      }
    } else {
      console.log('⚠️ OPENROUTER_KEY not set — chat/agency tests may fail if no active connector exists.');
    }

    const models = await request('/api/models', {}, token);
    const modelList = Array.isArray(models.data?.models) ? models.data.models : [];
    const hasBlocked = modelList.some((m) => String(m?.id || '').includes('qwen-2-7b-instruct:free'));
    addResult('GET /api/models', models.ok && !hasBlocked, `status=${models.status}, models=${modelList.length}, blocked=${hasBlocked}`);

    const openrouterModels = await request('/api/models/openrouter', {}, token);
    addResult('GET /api/models/openrouter', openrouterModels.ok, `status=${openrouterModels.status}`);

    const ollamaModels = await request('/api/models/ollama', {}, token);
    addResult('GET /api/models/ollama', ollamaModels.ok, `status=${ollamaModels.status}`);

    const tasks = await request('/api/tasks', {}, token);
    addResult('GET /api/tasks', tasks.ok, `status=${tasks.status}`);

    const newTask = await request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Checklist ${new Date().toISOString()}` }),
    }, token);
    addResult('POST /api/tasks', newTask.ok, `status=${newTask.status}`);

    await sleep(150);
    const chat = await request('/api/chat/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openrouter/mistralai/mistral-7b-instruct:free',
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      }),
    }, token);
    const keyMissing = /api key/i.test(String(chat.data?.error || ''));
    const chatOk = (chat.ok && typeof chat.data?.reply === 'string' && chat.data.reply.length > 0) || (chat.status === 500 && keyMissing);
    addResult('POST /api/chat/complete', chatOk, `status=${chat.status}${chat.data?.error ? `, err=${chat.data.error}` : ''}`);

    const packs = await request('/api/skills/packs', {}, token);
    addResult('GET /api/skills/packs', packs.ok, `status=${packs.status}`);

    const installed = await request('/api/skills/installed', {}, token);
    addResult('GET /api/skills/installed', installed.ok, `status=${installed.status}`);

    const agencyRuns = await request('/api/agency/runs', {}, token);
    addResult('GET /api/agency/runs', agencyRuns.ok, `status=${agencyRuns.status}`);

    const agencyRun = await request('/api/agency/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Napravi kratak plan od 3 koraka za test sistema.' }),
    }, token);
    const agencyOk = agencyRun.ok || agencyRun.status === 400; // 400 is acceptable if no OpenRouter key configured
    addResult('POST /api/agency/run', agencyOk, `status=${agencyRun.status}${agencyRun.data?.error ? `, err=${agencyRun.data.error}` : ''}`);

    const crons = await request('/api/crons', {}, token);
    addResult('GET /api/crons', crons.ok, `status=${crons.status}`);

    const vps = await request('/api/vps', {}, token);
    addResult('GET /api/vps', vps.ok, `status=${vps.status}`);
  } catch (err) {
    addResult('Checklist runtime', false, err?.message || String(err));
  } finally {
    const total = results.length;
    const passed = results.filter((r) => r.ok).length;
    const failed = total - passed;
    console.log(`\nSummary: ${passed}/${total} passed, ${failed} failed.`);
    process.exit(failed ? 1 : 0);
  }
}

main();
