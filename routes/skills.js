import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';
import { SYSTEM_SKILL_PACKS, getSkillPackById } from '../services/skills-registry.js';

const router = Router();

export const CLAWHUB_SKILLS = [
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web for real-time information',
    icon: '🔍',
    category: 'Research',
    free: true,
    connector: null,
  },
  {
    id: 'code-interpreter',
    name: 'Code Interpreter',
    description: 'Execute Python code and analyze data',
    icon: '💻',
    category: 'Development',
    free: true,
    connector: null,
  },
  {
    id: 'summarizer',
    name: 'Document Summarizer',
    description: 'Summarize long documents and PDFs',
    icon: '📄',
    category: 'Productivity',
    free: true,
    connector: null,
  },
  {
    id: 'translator',
    name: 'Translator',
    description: 'Translate text between 50+ languages',
    icon: '🌍',
    category: 'Language',
    free: true,
    connector: null,
  },
  {
    id: 'email-manager',
    name: 'Email Manager',
    description: 'Read, compose and send emails',
    icon: '✉️',
    category: 'Communication',
    free: false,
    connector: 'google_workspace',
    action: 'Clears your inbox, sends emails and manages your calendar',
  },
  {
    id: 'calendar',
    name: 'Calendar Assistant',
    description: 'Manage your Google Calendar',
    icon: '📅',
    category: 'Productivity',
    free: false,
    connector: 'google_workspace',
  },
  {
    id: 'github-assistant',
    name: 'GitHub Assistant',
    description: 'Create issues, PRs and review code',
    icon: '🐙',
    category: 'Development',
    free: false,
    connector: 'github',
  },
  {
    id: 'notion-assistant',
    name: 'Notion Assistant',
    description: 'Create and manage Notion pages',
    icon: '📓',
    category: 'Productivity',
    free: false,
    connector: 'notion',
  },
  {
    id: 'task-planner',
    name: 'Task Planner',
    description: 'Break down goals into actionable tasks',
    icon: '✅',
    category: 'Productivity',
    free: true,
    connector: null,
  },

  {
    id: 'claude-opus-max-skill',
    name: 'Claude Opus Max Skill',
    description: 'High-depth reasoning profile unlocked for owner account',
    icon: '🧠',
    category: 'Reasoning',
    free: true,
    connector: 'openrouter',
  },
  {
    id: 'codex-engineer-skill',
    name: 'Codex Engineer Skill',
    description: 'End-to-end coding workflow: analyze, implement, test, fix',
    icon: '🛠️',
    category: 'Development',
    free: true,
    connector: null,
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Analyze CSV/Excel data and create charts',
    icon: '📊',
    category: 'Analytics',
    free: true,
    connector: null,
  },
  {
    id: 'telegram-bot',
    name: 'Telegram Bot',
    description: 'Deploy AI assistant to Telegram',
    icon: '✈️',
    category: 'Messengers',
    free: false,
    connector: 'telegram',
  },
  {
    id: 'discord-bot',
    name: 'Discord Bot',
    description: 'Deploy AI assistant to Discord',
    icon: '🎮',
    category: 'Messengers',
    free: false,
    connector: 'discord',
  },
];

router.get('/', (req, res) => {
  const { category, search } = req.query;
  let skills = CLAWHUB_SKILLS;
  if (category) skills = skills.filter((s) => s.category === category);
  if (search) {
    skills = skills.filter(
      (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  res.json(skills);
});

router.get('/categories', (req, res) => {
  const cats = [...new Set(CLAWHUB_SKILLS.map((s) => s.category))];
  res.json(cats);
});

router.get('/packs', (req, res) => {
  res.json(SYSTEM_SKILL_PACKS);
});

router.get('/installed', (req, res) => {
  const db = getDB();
  const installed = db
    .prepare('SELECT id, pack_id, skill_id, active, created_at FROM installed_skills WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json(installed);
});

router.post('/install', (req, res) => {
  const { packId } = req.body;
  if (!packId) return res.status(400).json({ error: 'packId is required' });

  const pack = getSkillPackById(packId);
  if (!pack) return res.status(404).json({ error: 'Skill pack not found' });
  if (pack.paidOnly || pack.enabled === false) {
    return res.status(403).json({ error: 'This skill pack is not available in free-only mode.' });
  }

  const db = getDB();
  const insert = db.prepare(`
    INSERT INTO installed_skills (id, user_id, pack_id, skill_id, active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(user_id, pack_id, skill_id)
    DO UPDATE SET active = 1
  `);

  pack.capabilities.forEach((skillId) => {
    insert.run(uuidv4(), req.user.id, pack.id, skillId);
  });

  const installed = db
    .prepare('SELECT id, pack_id, skill_id, active, created_at FROM installed_skills WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);

  res.json({
    installedCount: pack.capabilities.length,
    pack,
    installed,
  });
});

router.put('/installed/:id', (req, res) => {
  const { active } = req.body;
  const db = getDB();
  const skill = db.prepare('SELECT id FROM installed_skills WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!skill) return res.status(404).json({ error: 'Installed skill not found' });

  db.prepare('UPDATE installed_skills SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  const updated = db.prepare('SELECT id, pack_id, skill_id, active, created_at FROM installed_skills WHERE id = ?').get(req.params.id);
  res.json(updated);
});

export default router;
