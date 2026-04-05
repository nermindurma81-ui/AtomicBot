import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDB();
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
  res.json(tasks);
});

router.post('/', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare('INSERT INTO tasks (id, user_id, title) VALUES (?, ?, ?)').run(id, req.user.id, title);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(task);
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const messages = db.prepare('SELECT * FROM messages WHERE task_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ ...task, messages });
});

router.post('/:id/messages', (req, res) => {
  const { role, content } = req.body;
  const db = getDB();
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const id = uuidv4();
  db.prepare('INSERT INTO messages (id, task_id, role, content) VALUES (?, ?, ?, ?)').run(id, req.params.id, role, content);
  db.prepare('UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  res.json(msg);
});

router.put('/:id', (req, res) => {
  const { title, status } = req.body;
  const db = getDB();
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (title) db.prepare('UPDATE tasks SET title = ? WHERE id = ?').run(title, req.params.id);
  if (status) db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, req.params.id);

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM messages WHERE task_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

export default router;
