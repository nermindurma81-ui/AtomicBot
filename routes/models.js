import { Router } from 'express';
import { ALL_FREE_MODELS, FREE_MODELS } from '../services/ai.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ models: ALL_FREE_MODELS, byProvider: FREE_MODELS });
});

router.get('/openrouter', async (req, res) => {
  // Fetch live models from OpenRouter
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}` }
    });
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    const freeModels = data.data.filter(m => 
      m.id.includes(':free') || m.pricing?.prompt === '0' || m.pricing?.prompt === 0
    ).map(m => ({
      id: `openrouter/${m.id}`,
      name: m.name,
      provider: 'openrouter',
      context: m.context_length,
      description: m.description
    }));
    res.json(freeModels);
  } catch {
    res.json(FREE_MODELS.openrouter);
  }
});

export default router;
