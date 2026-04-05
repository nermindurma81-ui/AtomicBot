import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';

const router = Router();

// Available connector types
export const CONNECTOR_TYPES = [
  { type: 'openrouter', name: 'OpenRouter', category: 'AI Providers', description: 'Access 100+ AI models', icon: '🔀', fields: ['apiKey'] },
  { type: 'huggingface', name: 'Hugging Face', category: 'AI Providers', description: 'Open source AI models', icon: '🤗', fields: ['apiKey'] },
  { type: 'mistral', name: 'Mistral AI', category: 'AI Providers', description: 'Mistral language models', icon: '💨', fields: ['apiKey'] },
  { type: 'openai', name: 'OpenAI', category: 'AI Models', description: 'GPT-4 and GPT-3.5', icon: '🤖', fields: ['apiKey'] },
  { type: 'anthropic', name: 'Anthropic', category: 'AI Models', description: 'Claude models', icon: '🧠', fields: ['apiKey'] },
  { type: 'telegram', name: 'Telegram', category: 'Messengers', description: 'Telegram bot integration', icon: '✈️', fields: ['botToken', 'chatId'] },
  { type: 'discord', name: 'Discord', category: 'Messengers', description: 'Discord bot integration', icon: '🎮', fields: ['botToken', 'channelId'] },
  { type: 'slack', name: 'Slack', category: 'Messengers', description: 'Slack workspace integration', icon: '💬', fields: ['botToken', 'channelId'] },
  { type: 'google_workspace', name: 'Google Workspace', category: 'Skills', description: 'Gmail, Drive, Calendar', icon: '🌐', fields: ['clientId', 'clientSecret', 'refreshToken'] },
  { type: 'notion', name: 'Notion', category: 'Skills', description: 'Notes and databases', icon: '📓', fields: ['apiKey', 'databaseId'] },
  { type: 'github', name: 'GitHub', category: 'Skills', description: 'Code repositories', icon: '🐙', fields: ['token', 'repo'] },
  { type: 'webhook', name: 'Webhook', category: 'Skills', description: 'Custom HTTP webhooks', icon: '🔗', fields: ['url', 'secret'] },
];

router.get('/types', (req, res) => {
  res.json(CONNECTOR_TYPES);
});

router.get('/', (req, res) => {
  const db = getDB();
  const connectors = db.prepare('SELECT id, type, name, active, created_at FROM connectors WHERE user_id = ?').all(req.user.id);
  res.json(connectors);
});

router.post('/', (req, res) => {
  const { type, name, config } = req.body;
  if (!type || !name) return res.status(400).json({ error: 'Type and name required' });

  const db = getDB();
  const id = uuidv4();
  db.prepare('INSERT INTO connectors (id, user_id, type, name, config, active) VALUES (?, ?, ?, ?, ?, 1)')
    .run(id, req.user.id, type, name, JSON.stringify(config || {}));

  res.json(db.prepare('SELECT id, type, name, active, created_at FROM connectors WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const { name, config, active } = req.body;
  const db = getDB();
  const conn = db.prepare('SELECT id FROM connectors WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!conn) return res.status(404).json({ error: 'Connector not found' });

  if (name !== undefined) db.prepare('UPDATE connectors SET name = ? WHERE id = ?').run(name, req.params.id);
  if (config !== undefined) db.prepare('UPDATE connectors SET config = ? WHERE id = ?').run(JSON.stringify(config), req.params.id);
  if (active !== undefined) db.prepare('UPDATE connectors SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);

  res.json(db.prepare('SELECT id, type, name, active, created_at FROM connectors WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM connectors WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Test connector
router.post('/:id/test', async (req, res) => {
  const db = getDB();
  const conn = db.prepare('SELECT * FROM connectors WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!conn) return res.status(404).json({ error: 'Connector not found' });

  const config = JSON.parse(conn.config);

  try {
    if (conn.type === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
      });
      if (!response.ok) throw new Error('Invalid API key');
      return res.json({ success: true, message: 'OpenRouter connection successful' });
    }
    if (conn.type === 'huggingface') {
      const response = await fetch('https://huggingface.co/api/whoami', {
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
      });
      if (!response.ok) throw new Error('Invalid API key');
      const data = await response.json();
      return res.json({ success: true, message: `Connected as ${data.name}` });
    }
    if (conn.type === 'mistral') {
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
      });
      if (!response.ok) throw new Error('Invalid API key');
      return res.json({ success: true, message: 'Mistral AI connection successful' });
    }
    res.json({ success: true, message: 'Connector configured' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
