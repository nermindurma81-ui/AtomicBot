import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';
import { runAgencyTask } from '../services/agency.js';
import { normalizeSkillId } from '../services/skills-registry.js';

const router = Router();

function resolveApiKeys(userId) {
  const db = getDB();
  const connectors = db.prepare('SELECT type, config FROM connectors WHERE user_id = ? AND active = 1').all(userId);
  const apiKeys = {};

  connectors.forEach((connector) => {
    try {
      const cfg = JSON.parse(connector.config || '{}');
      if (connector.type === 'openrouter' || connector.type === 'ollama') apiKeys.openrouter = cfg.apiKey;
      if (connector.type === 'anthropic') apiKeys.anthropic = cfg.apiKey;
      if (connector.type === 'mistral') apiKeys.mistral = cfg.apiKey;
    } catch {
      // ignore malformed connector
    }
  });

  return apiKeys;
}

router.get('/runs', (req, res) => {
  const db = getDB();
  const runs = db.prepare('SELECT * FROM agent_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(req.user.id);
  res.json(runs);
});

router.post('/run', async (req, res) => {
  const { prompt, model } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const db = getDB();
  const skillRows = db.prepare('SELECT skill_id FROM installed_skills WHERE user_id = ? AND active = 1').all(req.user.id);
  const installedSkills = [...new Set(skillRows.map((row) => normalizeSkillId(row.skill_id)))];
  const apiKeys = resolveApiKeys(req.user.id);

  if (!apiKeys.openrouter && !process.env.OPENROUTER_API_KEY && (!model || model.startsWith('openrouter/'))) {
    return res.status(400).json({
      error: 'OpenRouter API key missing. Add OpenRouter connector or OPENROUTER_API_KEY environment variable.',
    });
  }

  try {
    const output = await runAgencyTask({
      userPrompt: prompt,
      model,
      apiKeys,
      installedSkills,
    });

    const runId = uuidv4();
    db.prepare(`
      INSERT INTO agent_runs (id, user_id, model, prompt, plan, result, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId,
      req.user.id,
      output.model,
      prompt,
      output.plan,
      output.result,
      JSON.stringify({ searchContext: output.searchContext })
    );

    res.json({ id: runId, ...output });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
