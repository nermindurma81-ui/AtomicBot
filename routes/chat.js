import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';
import { callAI, ALL_FREE_MODELS } from '../services/ai.js';

const router = Router();

// SSE Streaming chat
router.post('/stream', async (req, res) => {
  const { messages, model = 'claude-haiku-4-5-20251001', taskId } = req.body;
  const db = getDB();

  const connectors = db.prepare('SELECT type, config FROM connectors WHERE user_id = ? AND active = 1').all(req.user.id);
  const apiKeys = {};
  connectors.forEach(c => {
    try {
      const cfg = JSON.parse(c.config);
      if (c.type === 'openrouter') apiKeys.openrouter = cfg.apiKey;
      if (c.type === 'anthropic') apiKeys.anthropic = cfg.apiKey;
      if (c.type === 'mistral') apiKeys.mistral = cfg.apiKey;
    } catch {}
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const isAnthropic = model.startsWith('claude-');
    const isOpenRouter = model.startsWith('openrouter/');
    const isMistral = model.startsWith('mistral/');

    if (isAnthropic) {
      const streamRes = await callAI(model, messages, apiKeys, true);
      const body = streamRes.body;
      let fullContent = '';

      for await (const chunk of body) {
        const lines = chunk.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') { res.write('data: [DONE]\n\n'); continue; }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.delta?.text || '';
              if (delta) {
                fullContent += delta;
                res.write(`data: ${JSON.stringify({ delta })}\n\n`);
              }
            } catch {}
          }
        }
      }

      if (taskId && fullContent) {
        const msgId = uuidv4();
        db.prepare('INSERT INTO messages (id, task_id, role, content) VALUES (?, ?, ?, ?)').run(msgId, taskId, 'assistant', fullContent);
        db.prepare('UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(taskId);
      }

    } else if (isOpenRouter || isMistral) {
      const streamRes = await callAI(model, messages, apiKeys, true);
      const body = streamRes.body;
      let fullContent = '';

      for await (const chunk of body) {
        const lines = chunk.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') { res.write('data: [DONE]\n\n'); continue; }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullContent += delta;
                res.write(`data: ${JSON.stringify({ delta })}\n\n`);
              }
            } catch {}
          }
        }
      }

      if (taskId && fullContent) {
        const msgId = uuidv4();
        db.prepare('INSERT INTO messages (id, task_id, role, content) VALUES (?, ?, ?, ?)').run(msgId, taskId, 'assistant', fullContent);
        db.prepare('UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(taskId);
      }
    }

    res.write('data: [DONE]\n\n');
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.end();
});

// Non-streaming
router.post('/complete', async (req, res) => {
  const { messages, model = 'claude-haiku-4-5-20251001' } = req.body;
  const db = getDB();

  const connectors = db.prepare('SELECT type, config FROM connectors WHERE user_id = ? AND active = 1').all(req.user.id);
  const apiKeys = {};
  connectors.forEach(c => {
    try {
      const cfg = JSON.parse(c.config);
      if (c.type === 'openrouter') apiKeys.openrouter = cfg.apiKey;
      if (c.type === 'anthropic') apiKeys.anthropic = cfg.apiKey;
      if (c.type === 'mistral') apiKeys.mistral = cfg.apiKey;
    } catch {}
  });

  try {
    const content = await callAI(model, messages, apiKeys, false);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
