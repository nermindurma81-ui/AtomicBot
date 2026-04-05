import fetch from 'node-fetch';

export const FREE_MODELS = {
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', context: 200000 },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic', context: 200000 },
  ],
  openrouter: [
    { id: 'openrouter/mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', provider: 'openrouter', context: 32768 },
    { id: 'openrouter/meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B (Free)', provider: 'openrouter', context: 8192 },
    { id: 'openrouter/google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', provider: 'openrouter', context: 8192 },
    { id: 'openrouter/qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (Free)', provider: 'openrouter', context: 32768 },
    { id: 'openrouter/deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', provider: 'openrouter', context: 65536 },
    { id: 'openrouter/microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini (Free)', provider: 'openrouter', context: 131072 },
  ],
  mistral: [
    { id: 'mistral/mistral-tiny', name: 'Mistral Tiny', provider: 'mistral', context: 32768 },
    { id: 'mistral/mistral-small', name: 'Mistral Small', provider: 'mistral', context: 32768 },
  ],
};

export const ALL_FREE_MODELS = Object.values(FREE_MODELS).flat();

export async function callAI(model, messages, apiKeys = {}, stream = false) {
  if (model.startsWith('claude-')) {
    return callAnthropic(model, messages, apiKeys.anthropic, stream);
  }
  if (model.startsWith('openrouter/')) {
    return callOpenRouter(model.replace('openrouter/', ''), messages, apiKeys.openrouter, stream);
  }
  if (model.startsWith('mistral/')) {
    return callMistral(model.replace('mistral/', ''), messages, apiKeys.mistral, stream);
  }
  // Fallback
  return callOpenRouter(model, messages, apiKeys.openrouter, stream);
}

async function callAnthropic(model, messages, apiKey, stream) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('No Anthropic API key. Add ANTHROPIC_API_KEY in Railway environment variables.');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, messages, stream, max_tokens: 4096 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${err}`);
  }
  if (stream) return response;
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function callOpenRouter(model, messages, apiKey, stream) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('No OpenRouter API key. Add it in Connectors or set OPENROUTER_API_KEY env var.');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
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

async function callMistral(model, messages, apiKey, stream) {
  const key = apiKey || process.env.MISTRAL_API_KEY;
  if (!key) throw new Error('No Mistral API key. Add it in Connectors or set MISTRAL_API_KEY env var.');

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, stream, max_tokens: 4096 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mistral error ${response.status}: ${err}`);
  }
  if (stream) return response;
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
