import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';

const router = Router();

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

router.post('/:id/start', (req, res) => {
  const db = getDB();
  const instance = db.prepare('SELECT * FROM vps_instances WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!instance) return res.status(404).json({ error: 'Instance not found' });
  
  db.prepare('UPDATE vps_instances SET status = ? WHERE id = ?').run('running', req.params.id);
  res.json({ status: 'running', message: 'Instance started' });
});

router.post('/:id/stop', (req, res) => {
  const db = getDB();
  const instance = db.prepare('SELECT * FROM vps_instances WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!instance) return res.status(404).json({ error: 'Instance not found' });
  
  db.prepare('UPDATE vps_instances SET status = ? WHERE id = ?').run('stopped', req.params.id);
  res.json({ status: 'stopped', message: 'Instance stopped' });
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM vps_instances WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

export default router;
