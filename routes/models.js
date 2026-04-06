import { Router } from 'express';
import { ALL_FREE_MODELS, FREE_MODELS } from '../services/ai.js';
import { getDB } from '../db.js';

const router = Router();
const BLOCKED_OPENROUTER_MODELS = new Set([
  'qwen/qwen-2-7b-instruct:free',
]);
const KNOWN_WORKING_FREE_MODELS = new Set([
  'meta-llama/llama-4-maverick:free',
  'meta-llama/llama-4-scout:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-r1:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'nvidia/llama-3.1-nemotron-nano-8b-v1:free',
  'qwen/qwq-32b:free',
]);

const isUsableFreeModel = (m) => {
  const isFree = m.id.includes(':free') || m.pricing?.prompt === '0' || m.pricing?.prompt === 0;
  return isFree && !BLOCKED_OPENROUTER_MODELS.has(m.id) && KNOWN_WORKING_FREE_MODELS.has(m.id);
};

function resolveOpenRouterKey(userId) {
  const db = getDB();
  const connectors = db.prepare('SELECT type, config FROM connectors WHERE user_id = ? AND active = 1').all(userId);
  for (const c of connectors) {
    if (c.type !== 'openrouter' && c.type !== 'ollama') continue;
    try {
      const cfg = JSON.parse(c.config || '{}');
      if (cfg.apiKey) return cfg.apiKey;
    } catch {
      // ignore malformed connector config
    }
  }
  return process.env.OPENROUTER_API_KEY || '';
}

async function fetchOpenRouterFreeModels(apiKey) {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error('Failed to fetch');
  const data = await response.json();
  const openrouterFree = {
    id: 'openrouter/free',
    name: '⚡ Auto Free Router (preporučeno)',
    provider: 'openrouter',
    context: 131072,
    description: 'Automatski bira dostupni OpenRouter free model.',
  };
  const fetched = data.data
    .filter(isUsableFreeModel)
    .map((m) => ({
      id: `openrouter/${m.id}`,
      name: m.name,
      provider: 'openrouter',
      context: m.context_length,
      description: m.description,
    }));
  return [openrouterFree, ...fetched];
}

router.get('/', async (req, res) => {
  try {
    const models = await fetchOpenRouterFreeModels(resolveOpenRouterKey(req.user.id));
    return res.json({ models, byProvider: { openrouter: models } });
  } catch {
    return res.json({ models: ALL_FREE_MODELS, byProvider: FREE_MODELS });
  }
});

router.get('/openrouter', async (req, res) => {
  try {
    const freeModels = await fetchOpenRouterFreeModels(resolveOpenRouterKey(req.user.id));
    res.json(freeModels);
  } catch {
    res.json(FREE_MODELS.openrouter);
  }
});

router.get('/ollama', async (req, res) => {
  try {
    const freeModels = (await fetchOpenRouterFreeModels(resolveOpenRouterKey(req.user.id))).map((m) => ({
      id: `ollama/${m.id.replace('openrouter/', '')}`,
      upstream: m.id,
      name: `${m.name} (via OpenRouter)`,
      provider: 'ollama-compat',
      context: m.context,
    }));
    res.json(freeModels);
  } catch {
    res.json(FREE_MODELS.openrouter.map((m) => ({
      id: `ollama/${m.id.replace('openrouter/', '')}`,
      upstream: m.id,
      name: `${m.name} (via OpenRouter)`,
      provider: 'ollama-compat',
      context: m.context,
    })));
  }
});

export default router;
