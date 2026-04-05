import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'atomicbot_secret_key_change_in_prod';
const SINGLE_USER_MODE = (process.env.SINGLE_USER_MODE || 'true') === 'true';
const OWNER_EMAIL = (process.env.OWNER_EMAIL || '').toLowerCase();

function signUser(user) {
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan, role: user.role || 'user', usage_limit: user.usage_limit ?? -1 },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const normalizedEmail = email.toLowerCase().trim();
  const db = getDB();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const totalUsers = db.prepare('SELECT COUNT(*) as total FROM users').get().total;
  if (SINGLE_USER_MODE && totalUsers > 0) {
    return res.status(403).json({ error: 'Single-user mode enabled. Registration closed.' });
  }

  if (SINGLE_USER_MODE && OWNER_EMAIL && normalizedEmail !== OWNER_EMAIL) {
    return res.status(403).json({ error: `Only owner email can register in single-user mode: ${OWNER_EMAIL}` });
  }

  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  const role = totalUsers === 0 ? 'admin' : 'user';
  const usageLimit = -1;

  db.prepare('INSERT INTO users (id, email, password_hash, role, usage_limit) VALUES (?, ?, ?, ?, ?)')
    .run(id, normalizedEmail, hash, role, usageLimit);

  const user = { id, email: normalizedEmail, plan: 'free', role, usage_limit: usageLimit };
  const token = signUser(user);
  res.json({ token, user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const normalizedEmail = email.toLowerCase().trim();
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signUser(user);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      role: user.role || 'user',
      usage_limit: user.usage_limit ?? -1,
    },
  });
});

router.get('/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
