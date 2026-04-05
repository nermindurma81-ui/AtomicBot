import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { getDB } from '../db.js';
import { callAI } from '../services/ai.js';

const router = Router();
const activeCrons = new Map();

export function initCronJobs() {
  const db = getDB();
  const jobs = db.prepare('SELECT * FROM cron_jobs WHERE active = 1').all();
  jobs.forEach(job => scheduleCronJob(job));
  console.log(`✓ ${jobs.length} cron jobs initialized`);
}

export function scheduleCronJob(job) {
  if (activeCrons.has(job.id)) {
    activeCrons.get(job.id).destroy();
  }
  if (!cron.validate(job.schedule)) return;

  const task = cron.schedule(job.schedule, async () => {
    const db = getDB();
    console.log(`[Cron] Running: ${job.name}`);
    try {
      const result = await callAI(job.model, [{ role: 'user', content: job.prompt }], {}, false);
      db.prepare('UPDATE cron_jobs SET last_run = CURRENT_TIMESTAMP WHERE id = ?').run(job.id);
      const taskId = uuidv4();
      db.prepare('INSERT INTO tasks (id, user_id, title, status) VALUES (?, ?, ?, ?)').run(taskId, job.user_id, `[Cron] ${job.name}`, 'completed');
      const msgId = uuidv4();
      db.prepare('INSERT INTO messages (id, task_id, role, content) VALUES (?, ?, ?, ?)').run(msgId, taskId, 'assistant', result);
    } catch (err) {
      console.error(`[Cron] ${job.name} failed:`, err.message);
    }
  });

  activeCrons.set(job.id, task);
}

router.get('/', (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT * FROM cron_jobs WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id));
});

router.post('/', (req, res) => {
  const { name, schedule, prompt, model = 'claude-haiku-4-5-20251001' } = req.body;
  if (!name || !schedule || !prompt) return res.status(400).json({ error: 'name, schedule, prompt required' });
  if (!cron.validate(schedule)) return res.status(400).json({ error: 'Invalid cron schedule' });

  const db = getDB();
  const id = uuidv4();
  db.prepare('INSERT INTO cron_jobs (id, user_id, name, schedule, prompt, model) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.user.id, name, schedule, prompt, model);
  const job = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id);
  scheduleCronJob(job);
  res.json(job);
});

router.put('/:id', (req, res) => {
  const { name, schedule, prompt, model, active } = req.body;
  const db = getDB();
  const job = db.prepare('SELECT id FROM cron_jobs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (schedule && !cron.validate(schedule)) return res.status(400).json({ error: 'Invalid schedule' });

  const updates = [], values = [];
  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (schedule !== undefined) { updates.push('schedule = ?'); values.push(schedule); }
  if (prompt !== undefined) { updates.push('prompt = ?'); values.push(prompt); }
  if (model !== undefined) { updates.push('model = ?'); values.push(model); }
  if (active !== undefined) { updates.push('active = ?'); values.push(active ? 1 : 0); }

  if (updates.length) { values.push(req.params.id); db.prepare(`UPDATE cron_jobs SET ${updates.join(', ')} WHERE id = ?`).run(...values); }

  const updated = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(req.params.id);
  if (updated.active) scheduleCronJob(updated);
  else if (activeCrons.has(req.params.id)) { activeCrons.get(req.params.id).destroy(); activeCrons.delete(req.params.id); }
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  if (activeCrons.has(req.params.id)) { activeCrons.get(req.params.id).destroy(); activeCrons.delete(req.params.id); }
  const db = getDB();
  db.prepare('DELETE FROM cron_jobs WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

router.post('/:id/run', async (req, res) => {
  const db = getDB();
  const job = db.prepare('SELECT * FROM cron_jobs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  try {
    const result = await callAI(job.model, [{ role: 'user', content: job.prompt }], {}, false);
    db.prepare('UPDATE cron_jobs SET last_run = CURRENT_TIMESTAMP WHERE id = ?').run(job.id);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
