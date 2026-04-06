import fetch from 'node-fetch';
import { callAI } from './ai.js';

const DEFAULT_MODEL = 'openrouter/free';

function normalizeModel(model) {
  if (!model) return DEFAULT_MODEL;
  if (model.startsWith('openrouter/')) return model;
  return DEFAULT_MODEL;
}

async function webSearch(query) {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AtomicBot/2.1 (Railway deployment)',
    },
  });

  if (!response.ok) {
    throw new Error(`Web search failed (${response.status})`);
  }

  const data = await response.json();
  const related = Array.isArray(data.RelatedTopics) ? data.RelatedTopics : [];

  const snippets = related
    .flatMap((entry) => (entry.Topics ? entry.Topics : [entry]))
    .filter((entry) => entry && entry.Text)
    .slice(0, 5)
    .map((entry) => ({
      text: entry.Text,
      url: entry.FirstURL,
    }));

  return {
    abstract: data.AbstractText || '',
    heading: data.Heading || query,
    snippets,
  };
}

function buildSystemPrompt(installedSkills = []) {
  const skillList = installedSkills.length ? installedSkills.join(', ') : 'task-planner';
  return [
    'You are AtomicBot multi-agent runtime.',
    'Behave like a hybrid of AutoClaw (tool execution) and Agency Agents (multi-role collaboration).',
    `Installed skills: ${skillList}.`,
    'Rules:',
    '- Always produce practical output, not only explanation.',
    '- If web-search is installed and needed, use provided search context.',
    '- Prefer free and open-source friendly approaches.',
  ].join('\n');
}

export async function runAgencyTask({
  userPrompt,
  model,
  apiKeys,
  installedSkills = [],
}) {
  const activeModel = normalizeModel(model);

  const plannerPrompt = [
    { role: 'system', content: buildSystemPrompt(installedSkills) },
    {
      role: 'user',
      content: `Kreiraj kratak plan (max 5 koraka) za zadatak i dodaj SEARCH_QUERY liniju ako je potrebno web istrazivanje. Zadatak: ${userPrompt}`,
    },
  ];

  const plan = await callAI(activeModel, plannerPrompt, apiKeys, false);

  let searchContext = null;
  const match = plan.match(/SEARCH_QUERY\s*:\s*(.+)/i);
  const canSearch = installedSkills.includes('web-search');
  if (match && canSearch) {
    searchContext = await webSearch(match[1].trim());
  }

  const researcherInput = [
    { role: 'system', content: buildSystemPrompt(installedSkills) },
    {
      role: 'user',
      content: [
        `PLAN:\n${plan}`,
        searchContext
          ? `WEB_CONTEXT:\n${JSON.stringify(searchContext, null, 2)}`
          : 'WEB_CONTEXT:\nNo external search used.',
        `ORIGINAL_TASK:\n${userPrompt}`,
        'Sada daj finalni izvršivi odgovor sa koracima koje korisnik može odmah pokrenuti.',
      ].join('\n\n'),
    },
  ];

  const result = await callAI(activeModel, researcherInput, apiKeys, false);

  return {
    model: activeModel,
    plan,
    searchContext,
    result,
  };
}
