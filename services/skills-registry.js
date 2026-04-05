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
    description: 'Advanced Claude-style workflow profile unlocked for owner account.',
    capabilities: ['reasoning-max', 'long-context-planning', 'spec-analysis'],
    paidOnly: false,
    enabled: true,
  },
  {
    id: 'codex-engineer',
    name: 'Codex Engineer Skill',
    source: 'internal-codex',
    category: 'development',
    description: 'Code execution workflow for implementation, refactor and testing tasks.',
    capabilities: ['repo-analysis', 'code-generation', 'test-runner', 'bugfix-loop'],
    paidOnly: false,
    enabled: true,
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
