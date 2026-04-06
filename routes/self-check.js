import { Router } from 'express';
import { getDB } from '../db.js';
import { callAI } from '../services/ai.js';

const router = Router();

function mask(v) {
  if (!v) return null;
  const s = String(v);
  if (s.length <= 8) return '*'.repeat(s.length);
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

function resolveOpenRouterKey(userId) {
  const db = getDB();
  const connectors = db.prepare('SELECT type, config, active FROM connectors WHERE user_id = ?').all(userId);
  for (const c of connectors) {
    if (!c.active) continue;
    if (c.type !== 'openrouter' && c.type !== 'ollama') continue;
    try {
      const cfg = JSON.parse(c.config || '{}');
      if (cfg.apiKey) return cfg.apiKey;
    } catch {
      // ignore malformed config
    }
  }
  return process.env.OPENROUTER_API_KEY || null;
}

router.get('/', async (req, res) => {
  const db = getDB();
  const deep = String(req.query.deep || '0') === '1';
  const checks = [];

  try {
    db.prepare('SELECT 1').get();
    checks.push({ name: 'db_connection', status: 'pass' });
  } catch (err) {
    checks.push({ name: 'db_connection', status: 'fail', detail: err.message });
  }

  const requiredTables = ['users', 'tasks', 'messages', 'connectors', 'cron_jobs', 'vps_instances', 'installed_skills', 'agent_runs'];
  try {
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tables = new Set(rows.map((r) => r.name));
    const missing = requiredTables.filter((t) => !tables.has(t));
    checks.push({ name: 'db_schema', status: missing.length ? 'fail' : 'pass', detail: missing.length ? `Missing tables: ${missing.join(', ')}` : undefined });
  } catch (err) {
    checks.push({ name: 'db_schema', status: 'fail', detail: err.message });
  }

  const key = resolveOpenRouterKey(req.user.id);
  checks.push({
    name: 'openrouter_key',
    status: key ? 'pass' : 'warn',
    detail: key ? `resolved (${mask(key)})` : 'No active OpenRouter/Ollama connector and no OPENROUTER_API_KEY env',
  });

  if (key) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${key}` } });
      checks.push({ name: 'openrouter_models_api', status: r.ok ? 'pass' : 'warn', detail: `HTTP ${r.status}` });
    } catch (err) {
      checks.push({ name: 'openrouter_models_api', status: 'warn', detail: err.message });
    }
  }

  if (deep) {
    if (!key) {
      checks.push({ name: 'chat_roundtrip', status: 'warn', detail: 'Skipped (missing OpenRouter key)' });
    } else {
      try {
        const content = await callAI('openrouter/mistralai/mistral-7b-instruct:free', [{ role: 'user', content: 'Reply with OK' }], { openrouter: key }, false);
        const ok = typeof content === 'string' && content.trim().length > 0;
        checks.push({ name: 'chat_roundtrip', status: ok ? 'pass' : 'fail', detail: ok ? undefined : 'Empty model response' });
      } catch (err) {
        checks.push({ name: 'chat_roundtrip', status: 'fail', detail: err.message });
      }
    }
  }

  const counts = checks.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, { pass: 0, warn: 0, fail: 0 });

  res.json({
    healthy: counts.fail === 0,
    mode: deep ? 'deep' : 'basic',
    summary: counts,
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
