import fetch from 'node-fetch';
import { HfInference } from '@huggingface/inference';

// FREE models - verified working on OpenRouter April 2026
// PRIMARNI: openrouter/free - automatski router koji uvijek bira dostupan free model
// Ostali su specifični modeli koji mogu doći i otići - openrouter/free je uvijek siguran
export const FREE_MODELS = {
  openrouter: [
    // ⭐ Uvijek dostupan - auto-bira slobodan model, PREPORUČENO kao default
    { id: 'openrouter/free', name: '⚡ Auto Free Router (preporučeno)', provider: 'openrouter', context: 131072 },
    // Trenutno aktivni :free modeli (April 2026) - mogu se mijenjati
    { id: 'openrouter/meta-llama/llama-4-maverick:free', name: 'Llama 4 Maverick (Free)', provider: 'openrouter', context: 131072 },
    { id: 'openrouter/meta-llama/llama-4-scout:free', name: 'Llama 4 Scout (Free)', provider: 'openrouter', context: 131072 },
    { id: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', provider: 'openrouter', context: 131072 },
    { id: 'openrouter/meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', provider: 'openrouter', context: 131072 },
    { id: 'openrouter/deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', provider: 'openrouter', context: 163840 },
    { id: 'openrouter/deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3 (Free)', provider: 'openrouter', context: 163840 },
    { id: 'openrouter/google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Exp (Free)', provider: 'openrouter', context: 1048576 },
    { id: 'openrouter/google/gemma-3-27b-it:free', name: 'Gemma 3 27B (Free)', provider: 'openrouter', context: 131072 },
    { id: 'openrouter/mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1 24B (Free)', provider: 'openrouter', context: 131072 },
    { id: 'openrouter/nvidia/llama-3.1-nemotron-nano-8b-v1:free', name: 'Nemotron Nano 8B (Free)', provider: 'openrouter', context: 131072 },
    { id: 'openrouter/qwen/qwq-32b:free', name: 'QwQ 32B Reasoning (Free)', provider: 'openrouter', context: 131072 },
  ],
  huggingface: [
    { id: 'hf/mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B v0.3 (HF)', provider: 'huggingface', context: 32768 },
    { id: 'hf/HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B Beta (HF)', provider: 'huggingface', context: 32768 },
    { id: 'hf/microsoft/Phi-3-mini-4k-instruct', name: 'Phi-3 Mini 4K (HF)', provider: 'huggingface', context: 4096 },
  ],
  mistral: [
    { id: 'mistral/open-mistral-7b', name: 'Mistral 7B (Open)', provider: 'mistral', context: 32768 },
    { id: 'mistral/open-mixtral-8x7b', name: 'Mixtral 8x7B (Open)', provider: 'mistral', context: 32768 },
  ],
};

export const ALL_FREE_MODELS = [
  ...FREE_MODELS.openrouter,
  ...FREE_MODELS.huggingface,
  ...FREE_MODELS.mistral,
];

const DEFAULT_MODEL = 'openrouter/free';

function normalizeModel(modelId) {
  if (!modelId) return DEFAULT_MODEL;
  if (modelId.startsWith('ollama/')) return `openrouter/${modelId.replace('ollama/', '')}`;
  if (ALL_FREE_MODELS.some((m) => m.id === modelId)) return modelId;
  if (modelId.startsWith('openrouter/')) return modelId;
  return DEFAULT_MODEL;
}

export async function callAI(modelId, messages, apiKeys = {}, stream = false) {
  const normalized = normalizeModel(modelId);
  const model = ALL_FREE_MODELS.find((m) => m.id === normalized);
  const provider = model?.provider || (normalized.startsWith('hf/') ? 'huggingface' : normalized.startsWith('mistral/') ? 'mistral' : 'openrouter');

  if (provider === 'openrouter') {
    // openrouter/free se šalje direktno bez strippanja prefiksa
    const orModelId = normalized === 'openrouter/free' ? 'openrouter/free' : normalized.replace('openrouter/', '');
    try {
      return await callOpenRouter(orModelId, messages, apiKeys.openrouter, stream);
    } catch (err) {
      // Ako specifičan :free model ne postoji, automatski fallback na openrouter/free router
      if (err.message.includes('404') && normalized !== 'openrouter/free') {
        console.warn(`Model ${normalized} nije dostupan, fallback na openrouter/free`);
        return await callOpenRouter('openrouter/free', messages, apiKeys.openrouter, stream);
      }
      throw err;
    }
  }

  if (stream) {
    throw new Error(`Streaming nije podržan za provider: ${provider}. Koristi OpenRouter model.`);
  }

  if (provider === 'huggingface') {
    return callHuggingFace(normalized.replace('hf/', ''), messages, apiKeys.huggingface);
  }

  if (provider === 'mistral') {
    return callMistral(normalized.replace('mistral/', ''), messages, apiKeys.mistral);
  }

  throw new Error(`Unknown provider for model: ${normalized}`);
}

async function callOpenRouter(modelId, messages, apiKey, stream = false) {
  const key = apiKey || process.env.OPENROUTER_API_KEY || '';
  if (!key) throw new Error('No OpenRouter API key. Add it in Connectors or set OPENROUTER_API_KEY env var.');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': process.env.FRONTEND_URL || 'https://atomicbot.ai',
      'X-Title': 'AtomicBot',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${err}`);
  }

  if (stream) return response;

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callHuggingFace(modelId, messages, apiKey) {
  const key = apiKey || process.env.HUGGINGFACE_API_KEY || '';
  if (!key) throw new Error('No HuggingFace API key. Add connector key or HUGGINGFACE_API_KEY env var.');
  const hf = new HfInference(key);

  const prompt = `${messages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}\nAssistant:`;

  const result = await hf.textGeneration({
    model: modelId,
    inputs: prompt,
    parameters: { max_new_tokens: 1024, return_full_text: false },
  });
  return result.generated_text || '';
}

async function callMistral(modelId, messages, apiKey) {
  const key = apiKey || process.env.MISTRAL_API_KEY || '';
  if (!key) throw new Error('No Mistral API key. Add connector key or MISTRAL_API_KEY env var.');

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: false,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mistral error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
