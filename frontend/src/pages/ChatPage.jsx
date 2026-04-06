import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/index.js';
import { streamChat } from '../lib/api.js';
import api from '../lib/api.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { Send, Plus, ChevronDown, Cpu, StopCircle } from 'lucide-react';

export default function ChatPage() {
  const { activeTask, setActiveTask, createTask, updateActiveTaskMessages, selectedModel, setSelectedModel, models, loadModels } = useStore();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(false);

  useEffect(() => { loadModels(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeTask?.messages, streamingContent]);

  const messages = activeTask?.messages || [];

  async function handleSend() {
    if (!input.trim() || streaming) return;

    const userMsg = input.trim();
    setInput('');

    let task = activeTask;
    if (!task) {
      task = await createTask(userMsg.slice(0, 60));
    }

    // Save user message
    try {
      await api.post(`/tasks/${task.id}/messages`, { role: 'user', content: userMsg });
      const refreshed = await api.get(`/tasks/${task.id}`);
      updateActiveTaskMessages(refreshed.data.messages);
      setActiveTask(refreshed.data);
    } catch (err) {
      toast.error('Failed to save message');
      return;
    }

    // Build messages array for AI
    const allMessages = [
      ...(task.messages || []),
      { role: 'user', content: userMsg }
    ].map(m => ({ role: m.role, content: m.content }));

    setStreaming(true);
    setStreamingContent('');
    abortRef.current = false;

    let fullContent = '';
    await streamChat({
      messages: allMessages,
      model: selectedModel,
      taskId: task.id,
      onDelta: (delta) => {
        if (abortRef.current) return;
        fullContent += delta;
        setStreamingContent(fullContent);
      },
      onDone: async () => {
        setStreaming(false);
        setStreamingContent('');
        // Refresh task messages
        try {
          const refreshed = await api.get(`/tasks/${task.id}`);
          updateActiveTaskMessages(refreshed.data.messages);
        } catch {}
      },
      onError: (err) => {
        toast.error(`AI error: ${err}`);
        setStreaming(false);
        setStreamingContent('');
      }
    });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const modelName = models.find(m => m.id === selectedModel)?.name || selectedModel.split('/').pop();

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
        <div className="text-sm text-gray-400">
          {activeTask ? (
            <span className="text-white font-medium truncate max-w-xs block">{activeTask.title}</span>
          ) : (
            <span>New conversation</span>
          )}
        </div>
        {/* Model picker */}
        <div className="relative">
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-[#1f1f1f] rounded-lg text-xs text-gray-400 hover:text-white hover:border-[#2a2a2a] transition-all"
          >
            <Cpu size={12} />
            <span className="max-w-36 truncate">{modelName}</span>
            <ChevronDown size={12} />
          </button>
          {showModelPicker && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-[#111] border border-[#1f1f1f] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-[#1f1f1f] text-xs text-gray-500 uppercase tracking-wider">Free Models</div>
              <div className="max-h-72 overflow-y-auto">
                {models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                    className={`w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-[#1a1a1a] ${selectedModel === m.id ? 'text-[#a3e635]' : 'text-gray-300'}`}
                  >
                    <div className="font-medium">{m.name}</div>
                    <div className="text-gray-600 capitalize">{m.provider}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && !streaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">🦞</div>
            <h2 className="text-xl font-bold mb-2">How can I help you?</h2>
            <p className="text-gray-500 text-sm max-w-sm">Start a conversation or choose a task from the sidebar</p>
            <div className="grid grid-cols-2 gap-3 mt-8 max-w-lg w-full">
              {[
                'Write a Python script to analyze CSV data',
                'Create a project plan with milestones',
                'Explain how machine learning works',
                'Draft a professional email template',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  className="text-left p-3 bg-[#111] border border-[#1f1f1f] rounded-xl text-xs text-gray-400 hover:text-white hover:border-[#2a2a2a] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`flex gap-3 fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#a3e635] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-black text-xs font-bold">✦</span>
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#1a1a1a] text-white rounded-br-sm'
                    : 'bg-[#111] text-gray-100 rounded-bl-sm border border-[#1f1f1f]'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose-atomic">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-[#1f1f1f] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-gray-400">U</span>
                  </div>
                )}
              </div>
            ))}
            {streaming && streamingContent && (
              <div className="flex gap-3 fade-in">
                <div className="w-7 h-7 rounded-full bg-[#a3e635] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-black text-xs font-bold">✦</span>
                </div>
                <div className="max-w-[80%] bg-[#111] border border-[#1f1f1f] rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-100">
                  <div className="prose-atomic">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                  </div>
                  <span className="cursor-blink text-[#a3e635]">▊</span>
                </div>
              </div>
            )}
            {streaming && !streamingContent && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#a3e635] flex items-center justify-center flex-shrink-0">
                  <span className="text-black text-xs font-bold">✦</span>
                </div>
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl px-4 py-3 flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-[#a3e635] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-[#1a1a1a]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-[#111] border border-[#1f1f1f] rounded-2xl px-4 py-3 focus-within:border-[#2a2a2a] transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Atomic Bot..."
              rows={1}
              style={{ resize: 'none', maxHeight: '160px' }}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none leading-relaxed"
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
            />
            <button
              onClick={streaming ? () => { abortRef.current = true; setStreaming(false); setStreamingContent(''); } : handleSend}
              disabled={!streaming && !input.trim()}
              className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                streaming
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : input.trim()
                    ? 'bg-[#a3e635] text-black hover:bg-[#bef264]'
                    : 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed'
              }`}
            >
              {streaming ? <StopCircle size={16} /> : <Send size={16} />}
            </button>
          </div>
          <div className="text-center text-xs text-gray-700 mt-2">
            Using <span className="text-gray-500">{modelName}</span> · Free model
          </div>
        </div>
      </div>
    </div>
  );
}
