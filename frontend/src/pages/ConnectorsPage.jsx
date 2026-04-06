import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Plus, Trash2, CheckCircle, Circle, Zap, X } from 'lucide-react';

const CATEGORIES = ['All', 'AI Models', 'AI Providers', 'Messengers', 'Skills'];

export default function ConnectorsPage() {
  const { connectors, loadConnectors, addConnector, toggleConnector, deleteConnector } = useStore();
  const [connectorTypes, setConnectorTypes] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [formConfig, setFormConfig] = useState({});
  const [formName, setFormName] = useState('');
  const [testing, setTesting] = useState(null);

  useEffect(() => {
    loadConnectors();
    api.get('/connectors/types').then(r => setConnectorTypes(r.data));
  }, []);

  const filteredTypes = connectorTypes.filter(t => activeTab === 'All' || t.category === activeTab);

  async function handleAdd() {
    if (!selectedType || !formName) return toast.error('Name required');
    try {
      await addConnector(selectedType.type, formName, formConfig);
      toast.success(`${selectedType.name} connected!`);
      setShowAdd(false);
      setSelectedType(null);
      setFormConfig({});
      setFormName('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add connector');
    }
  }

  async function handleTest(id) {
    setTesting(id);
    try {
      const { data } = await api.post(`/connectors/${id}/test`);
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    } catch (err) {
      toast.error('Test failed');
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="px-6 py-5 border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold">Connections</h1>
            <p className="text-gray-500 text-sm">Connect AI models, messengers and services</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#a3e635] text-black rounded-xl text-sm font-semibold hover:bg-[#bef264] transition-all"
          >
            <Plus size={16} /> Add connector
          </button>
        </div>
        <div className="flex gap-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${activeTab === cat ? 'bg-[#1a1a1a] text-white' : 'text-gray-500 hover:text-white'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Active connectors */}
        {connectors.length > 0 && (
          <div className="mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Active</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {connectors.map(conn => (
                <div key={conn.id} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">{conn.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{conn.type.replace('_', ' ')}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleConnector(conn.id, !conn.active)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${conn.active ? 'bg-[#a3e635]' : 'bg-[#2a2a2a]'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${conn.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleTest(conn.id)}
                      disabled={testing === conn.id}
                      className="flex-1 py-1.5 text-xs bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors"
                    >
                      {testing === conn.id ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => deleteConnector(conn.id)}
                      className="px-2 py-1.5 text-xs text-red-400 bg-[#1a1a1a] rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available connector types */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Available</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTypes.map(type => (
              <div key={type.type} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 hover:border-[#2a2a2a] transition-all">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{type.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{type.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{type.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedType(type); setFormName(type.name); setFormConfig({}); setShowAdd(true); }}
                  className="mt-3 w-full py-1.5 text-xs font-medium bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors"
                >
                  Configure
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold">{selectedType ? `Configure ${selectedType.name}` : 'Add Connector'}</h2>
              <button onClick={() => { setShowAdd(false); setSelectedType(null); }} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            {!selectedType ? (
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {connectorTypes.map(t => (
                  <button
                    key={t.type}
                    onClick={() => { setSelectedType(t); setFormName(t.name); }}
                    className="flex items-center gap-2 p-3 bg-[#1a1a1a] rounded-xl text-left hover:bg-[#2a2a2a] transition-colors"
                  >
                    <span>{t.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Name</label>
                  <input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#a3e635] transition-colors"
                  />
                </div>
                {selectedType.fields.map(field => (
                  <div key={field}>
                    <label className="block text-sm text-gray-400 mb-1.5 capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <input
                      type={field.toLowerCase().includes('key') || field.toLowerCase().includes('token') || field.toLowerCase().includes('secret') ? 'password' : 'text'}
                      value={formConfig[field] || ''}
                      onChange={e => setFormConfig(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#a3e635] transition-colors font-mono"
                      placeholder={`Enter ${field}`}
                    />
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setSelectedType(null)} className="flex-1 py-2.5 bg-[#1a1a1a] rounded-xl text-sm hover:bg-[#2a2a2a] transition-colors">Back</button>
                  <button onClick={handleAdd} className="flex-1 py-2.5 bg-[#a3e635] text-black rounded-xl text-sm font-bold hover:bg-[#bef264] transition-colors">
                    Connect
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
