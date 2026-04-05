export const SYSTEM_SKILL_PACKS = [
  {
    id: 'autoclaw-core',
    name: 'AutoClaw Core',
    source: 'https://github.com/tsingliuwin/autoclaw',
    category: 'automation',
    description: 'Automatski tool-calling workflow (planiranje → alat → izvršenje).',
    capabilities: ['task-planner', 'web-search', 'code-interpreter'],
  },
  {
    id: 'agency-agents-core',
    name: 'Agency Agents Core',
    source: 'https://github.com/msitarzewski/agency-agents',
    category: 'multi-agent',
    description: 'Multi-agent orkestracija sa ulogama Planner/Researcher/Executor.',
    capabilities: ['task-planner', 'web-search', 'summarizer', 'translator'],
  },
  {
    id: 'claude-opus-max',
    name: 'Claude Opus Max Skill',
    source: 'https://openrouter.ai',
    category: 'premium',
    description: 'Advanced Claude Opus workflow profile (disabled in free-only mode).',
    capabilities: ['reasoning-max', 'long-context-planning'],
    paidOnly: true,
    enabled: false,
  },
  {
    id: 'atomicbot-default',
    name: 'AtomicBot Default Skills',
    source: 'internal',
    category: 'starter',
    description: 'Zadani paket besplatnih skillova za OpenRouter modele.',
    capabilities: ['task-planner', 'summarizer', 'translator', 'data-analyst'],
  },
];

export function getSkillPackById(id) {
  return SYSTEM_SKILL_PACKS.find((pack) => pack.id === id) || null;
}
