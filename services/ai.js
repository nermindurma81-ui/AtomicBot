import fetch from 'node-fetch';

export const FREE_MODELS = {
  openrouter: [
    { id: 'openrouter/mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', provider: 'openrouter', context: 32768 },
    { id: 'openrouter/meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B (Free)', provider: 'openrouter', context: 8192 },
    { id: 'openrouter/google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', provider: 'openrouter', context: 8192 },
    { id: 'openrouter/qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (Free)', provider: 'openrouter', context: 32768 },
    { id: 'openrouter/deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', provider: 'openrouter', context: 65536 },
    { id: 'openrouter/microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini (Free)', provider: 'openrouter', context: 131072 },
  ],
};

export const ALL_FREE_MODELS = Object.values(FREE_MODELS).flat();


function normalizeModel(model) {
  if (!model) return 'openrouter/mistralai/mistral-7b-instruct:free';
  if (model.startsWith('ollama/')) {
    return `openrouter/${model.replace('ollama/', '')}`;
  }
  if (!model.startsWith('openrouter/')) return 'openrouter/mistralai/mistral-7b-instruct:free';
  return model;
}

export async function callAI(model, messages, apiKeys = {}, stream = false) {
  const normalized = normalizeModel(model);
  return callOpenRouter(normalized.replace('openrouter/', ''), messages, apiKeys.openrouter, stream);
}

async function callOpenRouter(model, messages, apiKey, stream) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('No OpenRouter API key. Add it in Connectors or set OPENROUTER_API_KEY env var.');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3001',
      'X-Title': 'AtomicBot',
    },
    body: JSON.stringify({ model, messages, stream, max_tokens: 4096 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${err}`);
  }
  if (stream) return response;
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
