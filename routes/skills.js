import { Router } from 'express';

const router = Router();

// Built-in Clawhub skills
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
  if (category) skills = skills.filter(s => s.category === category);
  if (search) skills = skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()));
  res.json(skills);
});

router.get('/categories', (req, res) => {
  const cats = [...new Set(CLAWHUB_SKILLS.map(s => s.category))];
  res.json(cats);
});

export default router;
