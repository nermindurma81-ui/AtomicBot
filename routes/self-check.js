import { Router } from 'express';
import { getDB } from '../db.js';
import { callAI } from '../services/ai.js';

const router = Router();

const REQUIRED_TABLES = [
  'users',
  'tasks',
  'connectors',
  'cron_jobs',
  'messages',
  'vps_instances',
  'installed_skills',
  'agent_runs',
];

function resolveOpenRouterKey(userId) {
  const db = getDB();
  const connectors = db.prepare('SELECT type, config FROM connectors WHERE user_id = ? AND active = 1').all(userId);
  for (const c of connectors) {
    if (c.type !== 'openrouter' && c.type !== 'ollama') continue;
    try {
      const cfg = JSON.parse(c.config || '{}');
      if (cfg.apiKey) return cfg.apiKey.trim();
    } catch {
      // ignore malformed connector config
    }
  }
  return (process.env.OPENROUTER_API_KEY || '').trim();
}

async function checkOpenRouterModels(apiKey) {
  if (!apiKey) {
    return { name: 'openrouter_models', status: 'warn', message: 'No OpenRouter key configured.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { name: 'openrouter_models', status: 'fail', message: `OpenRouter HTTP ${res.status}` };
    }
    const data = await res.json();
    const modelsCount = Array.isArray(data?.data) ? data.data.length : 0;
    return { name: 'openrouter_models', status: modelsCount > 0 ? 'pass' : 'fail', message: `Models visible: ${modelsCount}` };
  } catch (err) {
    return { name: 'openrouter_models', status: 'fail', message: `OpenRouter error: ${err.message}` };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkAiRoundtrip(apiKey) {
  if (!apiKey) {
    return { name: 'ai_roundtrip', status: 'warn', message: 'Skipped: no OpenRouter key.' };
  }
  try {
    const result = await callAI(
      'openrouter/mistralai/mistral-7b-instruct:free',
      [{ role: 'user', content: 'Reply with: OK' }],
      { openrouter: apiKey },
      false
    );
    const ok = typeof result === 'string' && result.trim().length > 0;
    return { name: 'ai_roundtrip', status: ok ? 'pass' : 'fail', message: ok ? 'AI response received.' : 'Empty AI response.' };
  } catch (err) {
    return { name: 'ai_roundtrip', status: 'fail', message: err.message };
  }
}

router.get('/', async (req, res) => {
  const db = getDB();
  const checks = [];

  try {
    db.prepare('SELECT 1').get();
    checks.push({ name: 'db_connection', status: 'pass', message: 'SQLite reachable.' });
  } catch (err) {
    checks.push({ name: 'db_connection', status: 'fail', message: err.message });
  }

  try {
    const existing = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name);
    const missing = REQUIRED_TABLES.filter((t) => !existing.includes(t));
    checks.push({
      name: 'db_schema',
      status: missing.length === 0 ? 'pass' : 'fail',
      message: missing.length === 0 ? 'Required tables present.' : `Missing tables: ${missing.join(', ')}`,
    });
  } catch (err) {
    checks.push({ name: 'db_schema', status: 'fail', message: err.message });
  }

  try {
    const connectors = db.prepare('SELECT type, active FROM connectors WHERE user_id = ?').all(req.user.id);
    const activeAi = connectors.filter((c) => c.active === 1 && (c.type === 'openrouter' || c.type === 'ollama')).length;
    checks.push({
      name: 'connector_state',
      status: activeAi > 0 ? 'pass' : 'warn',
      message: activeAi > 0 ? `Active AI connectors: ${activeAi}` : 'No active OpenRouter/Ollama connector.',
    });
  } catch (err) {
    checks.push({ name: 'connector_state', status: 'fail', message: err.message });
  }

  const apiKey = resolveOpenRouterKey(req.user.id);
  checks.push(await checkOpenRouterModels(apiKey));

  if (String(req.query.deep || '0') === '1') {
    checks.push(await checkAiRoundtrip(apiKey));
  } else {
    checks.push({ name: 'ai_roundtrip', status: 'warn', message: 'Skipped (set ?deep=1).' });
  }

  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const healthy = failCount === 0;

  res.status(healthy ? 200 : 503).json({
    healthy,
    summary: { pass: passCount, warn: warnCount, fail: failCount },
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
