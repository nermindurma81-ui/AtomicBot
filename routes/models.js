import { Router } from 'express';
import { ALL_FREE_MODELS, FREE_MODELS } from '../services/ai.js';

const router = Router();
const BLOCKED_OPENROUTER_MODELS = new Set([
  'qwen/qwen-2-7b-instruct:free',
]);

const isUsableFreeModel = (m) => {
  const isFree = m.id.includes(':free') || m.pricing?.prompt === '0' || m.pricing?.prompt === 0;
  return isFree && !BLOCKED_OPENROUTER_MODELS.has(m.id);
};

router.get('/', (req, res) => {
  res.json({ models: ALL_FREE_MODELS, byProvider: FREE_MODELS });
});

router.get('/openrouter', async (req, res) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ''}` },
    });
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    const freeModels = data.data
      .filter(isUsableFreeModel)
      .map((m) => ({
        id: `openrouter/${m.id}`,
        name: m.name,
        provider: 'openrouter',
        context: m.context_length,
        description: m.description,
      }));
    res.json(freeModels);
  } catch {
    res.json(FREE_MODELS.openrouter);
  }
});

router.get('/ollama', async (req, res) => {
  // Ollama compatibility mode: expose OpenRouter free models as ollama/* aliases
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ''}` },
    });
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    const freeModels = data.data
      .filter(isUsableFreeModel)
      .map((m) => ({
        id: `ollama/${m.id}`,
        upstream: `openrouter/${m.id}`,
        name: `${m.name} (via OpenRouter)`,
        provider: 'ollama-compat',
        context: m.context_length,
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
