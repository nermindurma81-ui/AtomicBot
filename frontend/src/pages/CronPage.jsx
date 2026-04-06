import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Plus, Play, Trash2, ToggleLeft, ToggleRight, X, Clock } from 'lucide-react';

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 9am', value: '0 9 * * *' },
  { label: 'Every Monday', value: '0 9 * * 1' },
  { label: 'Every month (1st)', value: '0 9 1 * *' },
];

export default function CronPage() {
  const { cronJobs, loadCronJobs, addCronJob, updateCronJob, deleteCronJob, models, loadModels, selectedModel } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [running, setRunning] = useState(null);
  const [form, setForm] = useState({ name: '', schedule: '0 9 * * *', prompt: '', model: selectedModel });

  useEffect(() => { loadCronJobs(); loadModels(); }, []);

  async function handleAdd() {
    if (!form.name || !form.prompt) return toast.error('Name and prompt required');
    try {
      await addCronJob(form);
      toast.success('Cron job created!');
      setShowAdd(false);
      setForm({ name: '', schedule: '0 9 * * *', prompt: '', model: selectedModel });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create cron job');
    }
  }

  async function handleRunNow(id) {
    setRunning(id);
    try {
      const { data } = await api.post(`/crons/${id}/run`);
      toast.success('Job ran successfully!');
      console.log('Result:', data.result);
    } catch (err) {
      toast.error('Failed to run job');
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="px-6 py-5 border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold mb-1">Cron Jobs</h1>
            <p className="text-gray-500 text-sm">Schedule automated AI tasks</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#a3e635] text-black rounded-xl text-sm font-semibold hover:bg-[#bef264] transition-all"
          >
            <Plus size={16} /> New job
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {cronJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Clock size={32} className="text-gray-700 mb-3" />
            <div className="text-gray-500 mb-1">No cron jobs yet</div>
            <div className="text-gray-600 text-sm">Schedule AI tasks to run automatically</div>
          </div>
        ) : (
          <div className="space-y-3">
            {cronJobs.map(job => (
              <div key={job.id} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${job.active ? 'bg-[#a3e635] pulse-green' : 'bg-gray-600'}`} />
                      <span className="font-medium text-sm">{job.name}</span>
                    </div>
                    <div className="font-mono text-xs text-gray-500 mt-1">{job.schedule}</div>
                    <div className="text-xs text-gray-500 mt-2 line-clamp-2">{job.prompt}</div>
                    {job.last_run && (
                      <div className="text-xs text-gray-600 mt-1">Last run: {new Date(job.last_run).toLocaleString()}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRunNow(job.id)}
                      disabled={running === job.id}
                      title="Run now"
                      className="w-7 h-7 flex items-center justify-center bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors text-gray-400 hover:text-white"
                    >
                      {running === job.id ? <div className="w-3 h-3 border border-t-[#a3e635] border-gray-600 rounded-full animate-spin" /> : <Play size={12} />}
                    </button>
                    <button
                      onClick={() => updateCronJob(job.id, { active: !job.active })}
                      className={`${job.active ? 'text-[#a3e635]' : 'text-gray-600'} hover:opacity-80 transition-opacity`}
                    >
                      {job.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button
                      onClick={() => deleteCronJob(job.id)}
                      className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold">New Cron Job</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Job Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Daily summary"
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#a3e635] transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Schedule</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {CRON_PRESETS.map(p => (
                    <button key={p.value} onClick={() => setForm(prev => ({ ...prev, schedule: p.value }))}
                      className={`px-2 py-1 rounded-lg text-xs transition-colors ${form.schedule === p.value ? 'bg-[#a3e635] text-black' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <input value={form.schedule} onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))}
                  placeholder="* * * * *"
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#a3e635] transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">AI Prompt</label>
                <textarea value={form.prompt} onChange={e => setForm(p => ({ ...p, prompt: e.target.value }))}
                  placeholder="What should the AI do when this job runs?"
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#a3e635] transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Model</label>
                <select value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#a3e635] transition-colors">
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-[#1a1a1a] rounded-xl text-sm hover:bg-[#2a2a2a] transition-colors">Cancel</button>
                <button onClick={handleAdd} className="flex-1 py-2.5 bg-[#a3e635] text-black rounded-xl text-sm font-bold hover:bg-[#bef264] transition-colors">
                  Create Job
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
