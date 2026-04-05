import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';

const router = Router();

async function callWebhook(url, payload = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Webhook failed (${response.status}): ${err || 'unknown error'}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return { ok: true, text: await response.text() };
}

router.get('/', (req, res) => {
  const db = getDB();
  const instances = db.prepare('SELECT * FROM vps_instances WHERE user_id = ?').all(req.user.id);
  res.json(instances);
});

router.post('/', (req, res) => {
  const { name, provider = 'railway', config = {} } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const db = getDB();
  const id = uuidv4();
  db.prepare('INSERT INTO vps_instances (id, user_id, name, provider, config) VALUES (?, ?, ?, ?, ?)').run(id, req.user.id, name, provider, JSON.stringify(config));

  res.json(db.prepare('SELECT * FROM vps_instances WHERE id = ?').get(id));
});

router.post('/:id/start', async (req, res) => {
  const db = getDB();
  const instance = db.prepare('SELECT * FROM vps_instances WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!instance) return res.status(404).json({ error: 'Instance not found' });

  const config = JSON.parse(instance.config || '{}');
  if (!config.startUrl) {
    return res.status(400).json({
      error: 'Missing startUrl in instance config. Add a deployment webhook for real start action.',
    });
  }

  try {
    const providerResponse = await callWebhook(config.startUrl, {
      action: 'start',
      instanceId: instance.id,
      provider: instance.provider,
      userId: req.user.id,
    });

    db.prepare('UPDATE vps_instances SET status = ?, config = ? WHERE id = ?').run(
      'running',
      JSON.stringify({ ...config, lastStartResponse: providerResponse, lastStartedAt: new Date().toISOString() }),
      req.params.id
    );

    res.json({ status: 'running', message: 'Instance started via provider webhook', providerResponse });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/:id/stop', async (req, res) => {
  const db = getDB();
  const instance = db.prepare('SELECT * FROM vps_instances WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!instance) return res.status(404).json({ error: 'Instance not found' });

  const config = JSON.parse(instance.config || '{}');
  if (!config.stopUrl) {
    return res.status(400).json({
      error: 'Missing stopUrl in instance config. Add a deployment webhook for real stop action.',
    });
  }

  try {
    const providerResponse = await callWebhook(config.stopUrl, {
      action: 'stop',
      instanceId: instance.id,
      provider: instance.provider,
      userId: req.user.id,
    });

    db.prepare('UPDATE vps_instances SET status = ?, config = ? WHERE id = ?').run(
      'stopped',
      JSON.stringify({ ...config, lastStopResponse: providerResponse, lastStoppedAt: new Date().toISOString() }),
      req.params.id
    );

    res.json({ status: 'stopped', message: 'Instance stopped via provider webhook', providerResponse });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/:id/sync', async (req, res) => {
  const db = getDB();
  const instance = db.prepare('SELECT * FROM vps_instances WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!instance) return res.status(404).json({ error: 'Instance not found' });

  const config = JSON.parse(instance.config || '{}');
  if (!config.statusUrl) {
    return res.status(400).json({ error: 'Missing statusUrl in instance config.' });
  }

  try {
    const response = await fetch(config.statusUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Status check failed (${response.status})`);
    const payload = await response.json();
    const status = payload.status === 'running' ? 'running' : 'stopped';

    db.prepare('UPDATE vps_instances SET status = ?, config = ? WHERE id = ?').run(
      status,
      JSON.stringify({ ...config, lastStatusResponse: payload, lastSyncedAt: new Date().toISOString() }),
      req.params.id
    );

    res.json({ status, payload });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM vps_instances WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

export default router;
