import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';
import { callAI } from '../services/ai.js';

const router = Router();

function resolveApiKeys(userId) {
  const db = getDB();
  const connectors = db.prepare('SELECT type, config FROM connectors WHERE user_id = ? AND active = 1').all(userId);
  const apiKeys = {};
  connectors.forEach((c) => {
    try {
      const cfg = JSON.parse(c.config);
      if (c.type === 'openrouter' || c.type === 'ollama') apiKeys.openrouter = cfg.apiKey;
    } catch {
      // ignore malformed connector
    }
  });
  return apiKeys;
}

router.post('/stream', async (req, res) => {
  const { messages, model = 'openrouter/free', taskId } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }
  const db = getDB();
  const apiKeys = resolveApiKeys(req.user.id);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const streamRes = await callAI(model, messages, apiKeys, true);
    const body = streamRes.body;
    let fullContent = '';
    let buffer = '';

    for await (const chunk of body || []) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
        } catch {
          // ignore non-json lines
        }
      }
    }

    // Parse any final buffered SSE line
    const finalLine = buffer.trim();
    if (finalLine.startsWith('data: ')) {
      const data = finalLine.slice(6);
      if (data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
        } catch {
          // ignore parse failure
        }
      }
    }

    // Safety fallback: if no streamed deltas arrived, retry as non-stream completion
    if (!fullContent) {
      try {
        const fallback = await callAI(model, messages, apiKeys, false);
        if (fallback) {
          fullContent = fallback;
          res.write(`data: ${JSON.stringify({ delta: fallback })}\n\n`);
        }
      } catch {
        // keep original stream behavior
      }
    }

    if (taskId && fullContent) {
      const msgId = uuidv4();
      db.prepare('INSERT INTO messages (id, task_id, role, content) VALUES (?, ?, ?, ?)').run(msgId, taskId, 'assistant', fullContent);
      db.prepare('UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(taskId);
    }

    res.write('data: [DONE]\n\n');
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.end();
});

router.post('/complete', async (req, res) => {
  const { messages, model = 'openrouter/free' } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }
  const apiKeys = resolveApiKeys(req.user.id);

  try {
    const content = await callAI(model, messages, apiKeys, false);
    res.json({ content, reply: content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
