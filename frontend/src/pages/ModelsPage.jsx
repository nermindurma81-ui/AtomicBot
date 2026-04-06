import { useEffect } from 'react';
import { useStore } from '../store/index.js';
import { Cpu } from 'lucide-react';

export default function ModelsPage() {
  const { models, loadModels, selectedModel, setSelectedModel } = useStore();

  useEffect(() => { loadModels(); }, []);

  const byProvider = models.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  const providerLabels = { openrouter: 'OpenRouter', huggingface: 'Hugging Face', mistral: 'Mistral AI' };
  const providerIcons = { openrouter: '🔀', huggingface: '🤗', mistral: '💨' };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="px-6 py-5 border-b border-[#1a1a1a]">
        <h1 className="text-lg font-bold mb-1">AI Models</h1>
        <p className="text-gray-500 text-sm">All free models available via OpenRouter, HuggingFace and Mistral</p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
        {Object.entries(byProvider).map(([provider, providerModels]) => (
          <div key={provider}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{providerIcons[provider] || '🤖'}</span>
              <h2 className="font-semibold">{providerLabels[provider] || provider}</h2>
              <span className="text-xs text-gray-600">{providerModels.length} models</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {providerModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selectedModel === model.id
                      ? 'bg-[#a3e635]/5 border-[#a3e635]/40 text-white'
                      : 'bg-[#111] border-[#1f1f1f] hover:border-[#2a2a2a] text-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-gray-600 mt-0.5 font-mono truncate">{model.id}</div>
                    </div>
                    {selectedModel === model.id && (
                      <div className="w-4 h-4 rounded-full bg-[#a3e635] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                      </div>
                    )}
                  </div>
                  {model.context && (
                    <div className="mt-2 text-xs text-gray-600">
                      {(model.context / 1000).toFixed(0)}K context
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <div className="text-center text-gray-500 py-16">Loading models...</div>
        )}
      </div>
    </div>
  );
}
