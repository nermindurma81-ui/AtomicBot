import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Plus, Play, Square, Trash2, Cloud, X } from 'lucide-react';

export default function VPSPage() {
  const { vpsInstances, loadVPS, addVPS } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', provider: 'railway' });
  const [loading, setLoading] = useState(null);

  useEffect(() => { loadVPS(); }, []);

  async function handleAdd() {
    if (!form.name) return toast.error('Name required');
    try {
      await addVPS(form.name, form.provider);
      toast.success('VPS instance created!');
      setShowAdd(false);
      setForm({ name: '', provider: 'railway' });
    } catch {
      toast.error('Failed to create instance');
    }
  }

  async function handleStart(id) {
    setLoading(id + '_start');
    try {
      await api.post(`/vps/${id}/start`);
      await loadVPS();
      toast.success('Instance started');
    } catch { toast.error('Failed to start'); }
    finally { setLoading(null); }
  }

  async function handleStop(id) {
    setLoading(id + '_stop');
    try {
      await api.post(`/vps/${id}/stop`);
      await loadVPS();
      toast.success('Instance stopped');
    } catch { toast.error('Failed to stop'); }
    finally { setLoading(null); }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/vps/${id}`);
      await loadVPS();
      toast.success('Instance deleted');
    } catch { toast.error('Failed to delete'); }
  }

  const statusColor = { running: 'bg-[#a3e635]', stopped: 'bg-gray-600', error: 'bg-red-500' };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="px-6 py-5 border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold mb-1">VPS Instance</h1>
            <p className="text-gray-500 text-sm">Manage cloud instances for your AI bot</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-[#a3e635] text-black rounded-xl text-sm font-semibold hover:bg-[#bef264] transition-all">
            <Plus size={16} /> New instance
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {vpsInstances.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Cloud size={32} className="text-gray-700 mb-3" />
            <div className="text-gray-500 mb-1">No instances yet</div>
            <div className="text-gray-600 text-sm">Create a cloud instance to run your bot 24/7</div>
          </div>
        ) : (
          <div className="space-y-3">
            {vpsInstances.map(inst => (
              <div key={inst.id} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor[inst.status] || 'bg-gray-600'} ${inst.status === 'running' ? 'pulse-green' : ''}`} />
                    <div>
                      <div className="font-medium text-sm">{inst.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{inst.provider} · {inst.status}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inst.status !== 'running' ? (
                      <button onClick={() => handleStart(inst.id)} disabled={loading === inst.id + '_start'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a3e635]/10 text-[#a3e635] rounded-lg text-xs hover:bg-[#a3e635]/20 transition-colors">
                        <Play size={12} /> Start
                      </button>
                    ) : (
                      <button onClick={() => handleStop(inst.id)} disabled={loading === inst.id + '_stop'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors">
                        <Square size={12} /> Stop
                      </button>
                    )}
                    <button onClick={() => handleDelete(inst.id)}
                      className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold">New VPS Instance</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Instance Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="My bot server"
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#a3e635] transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Provider</label>
                <select value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#a3e635] transition-colors">
                  <option value="railway">Railway</option>
                  <option value="fly.io">Fly.io</option>
                  <option value="render">Render</option>
                  <option value="heroku">Heroku</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-[#1a1a1a] rounded-xl text-sm hover:bg-[#2a2a2a] transition-colors">Cancel</button>
                <button onClick={handleAdd} className="flex-1 py-2.5 bg-[#a3e635] text-black rounded-xl text-sm font-bold hover:bg-[#bef264] transition-colors">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
