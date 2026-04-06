import { useState, useRef, useEffect, useCallback } from 'react';

// ─── constants ────────────────────────────────────────────────────────────────
const L = '#AAFF00', BG = '#0A0A0B', B2 = '#111113', B3 = '#1A1A1D',
  BR = '#2A2A2E', TX = '#E8E8EA', MT = '#6E6E78';
const API_BASE = (import.meta.env.VITE_API_BASE || '').trim().replace(/\/$/, '');
const BLOCKED_MODEL_IDS = new Set(['openrouter/qwen/qwen-2-7b-instruct:free']);

const CONNECTOR_TYPES = [
  { type: 'openrouter',      name: 'OpenRouter',        cat: 'AI Providers', icon: '🔀', desc: 'Free OpenRouter modeli za produkciju',            fields: ['apiKey'] },
  { type: 'ollama',          name: 'Ollama Bridge',     cat: 'AI Providers', icon: '🦙', desc: 'Ollama stil model ID-eva preko OpenRouter free modela', fields: ['apiKey'] },
  { type: 'telegram',        name: 'Telegram',          cat: 'Messengers',   icon: '✈️', desc: 'Telegram bot integracija',                                      fields: ['botToken', 'chatId'] },
  { type: 'discord',         name: 'Discord',           cat: 'Messengers',   icon: '🎮', desc: 'Discord bot integracija',                                       fields: ['botToken', 'channelId'] },
  { type: 'slack',           name: 'Slack',             cat: 'Messengers',   icon: '💬', desc: 'Slack workspace integracija',                                   fields: ['botToken', 'channelId'] },
  { type: 'google_workspace',name: 'Google Workspace',  cat: 'Skills',       icon: '🌐', desc: 'Gmail, Drive, Calendar',                                        fields: ['clientId', 'clientSecret'] },
  { type: 'notion',          name: 'Notion',            cat: 'Skills',       icon: '📓', desc: 'Bilješke i baze podataka',                                      fields: ['apiKey', 'databaseId'] },
  { type: 'github',          name: 'GitHub',            cat: 'Skills',       icon: '🐙', desc: 'Code repozitoriji',                                             fields: ['token', 'repo'] },
  { type: 'webhook',         name: 'Webhook',           cat: 'Skills',       icon: '🔗', desc: 'Custom HTTP webhooks',                                          fields: ['url', 'secret'] },
];

const SKILLS = [
  { id: 'web-search',       name: 'Web Search',          desc: 'Pretražuj web u realnom vremenu',              icon: '🔍', cat: 'Research',     free: true },
  { id: 'code-interpreter', name: 'Code Interpreter',    desc: 'Izvršavaj Python kod i analiziraj podatke',   icon: '💻', cat: 'Development',  free: true },
  { id: 'summarizer',       name: 'Doc Summarizer',      desc: 'Sažmi duge dokumente i PDF-ove',              icon: '📄', cat: 'Productivity',  free: true },
  { id: 'translator',       name: 'Translator',          desc: 'Prevedi tekst između 50+ jezika',             icon: '🌍', cat: 'Language',      free: true },
  { id: 'task-planner',     name: 'Task Planner',        desc: 'Razloži ciljeve na akcione zadaće',           icon: '✅', cat: 'Productivity',  free: true },
  { id: 'claude-opus-max', name: 'Claude Opus Max Skill', desc: 'Duboko rezonovanje za kompleksne zadatke', icon: '🧠', cat: 'Reasoning', free: true, connector: 'openrouter' },
  { id: 'codex-engineer', name: 'Codex Engineer Skill', desc: 'Analiza repo-a, implementacija i testiranje', icon: '🛠️', cat: 'Development', free: true },
  { id: 'data-analyst',     name: 'Data Analyst',        desc: 'Analiziraj CSV/Excel i pravi grafikone',      icon: '📊', cat: 'Analytics',     free: true },
  { id: 'email-manager',    name: 'Email Manager',       desc: 'Inbox, slanje emaila, upravljanje kalendarom',icon: '✉️', cat: 'Communication', free: false, connector: 'google_workspace' },
  { id: 'calendar',         name: 'Calendar Asst.',      desc: 'Upravljaj Google Kalendarom',                 icon: '📅', cat: 'Productivity',  free: false, connector: 'google_workspace' },
  { id: 'github-assistant', name: 'GitHub Asst.',        desc: 'Issues, PR-ovi, code review',                icon: '🐙', cat: 'Development',  free: false, connector: 'github' },
  { id: 'notion-assistant', name: 'Notion Asst.',        desc: 'Kreiraj i upravljaj Notion stranicama',      icon: '📓', cat: 'Productivity',  free: false, connector: 'notion' },
  { id: 'telegram-bot',     name: 'Telegram Bot',        desc: 'Deploj AI asistenta na Telegram',            icon: '✈️', cat: 'Messengers',    free: false, connector: 'telegram' },
  { id: 'discord-bot',      name: 'Discord Bot',         desc: 'Deploj AI asistenta na Discord',             icon: '🎮', cat: 'Messengers',    free: false, connector: 'discord' },
];

// ─── API helper ───────────────────────────────────────────────────────────────
const api = {
  base: API_BASE,
  token: () => localStorage.getItem('ab_token'),
  headers: () => {
    const token = api.token();
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  },
  url: (path) => (/^https?:\/\//i.test(path) ? path : `${api.base}${path}`),
  request: async (url, options = {}) => {
    try {
      const endpoint = api.url(url);
      const res = await fetch(endpoint, options);
      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      if (contentType.includes('application/json')) {
        try {
          const data = await res.json();
          if (!res.ok) return { error: data?.error || data?.message || `HTTP ${res.status}` };
          return data;
        } catch {
          const parseError = `Server je poslao neispravan JSON (${res.status} ${res.statusText})`;
          return { error: parseError };
        }
      }

      const text = await res.text();
      const looksLikeHtml = text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html');
      const fallbackError = looksLikeHtml
        ? `Server vratio HTML umjesto JSON-a (ruta možda nije dostupna): ${endpoint}${api.base ? '' : ' • Ako API nije na istom domenu, postavi VITE_API_BASE.'}`
        : `Neočekivan odgovor servera (${res.status} ${res.statusText})`;

      if (!res.ok) return { error: fallbackError };
      return { ok: true, raw: text };
    } catch (err) {
      return { error: `Network greška: ${err?.message || 'nije moguće kontaktirati server'}` };
    }
  },
  get: (url) => api.request(url, { headers: api.headers() }),
  post: (url, body) => api.request(url, { method: 'POST', headers: api.headers(), body: JSON.stringify(body) }),
  put: (url, body) => api.request(url, { method: 'PUT', headers: api.headers(), body: JSON.stringify(body) }),
  del: (url) => api.request(url, { method: 'DELETE', headers: api.headers() }),
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(text) {
  if (!text) return null;
  return text.split(/(```[\s\S]*?```)/g).map((seg, i) => {
    if (seg.startsWith('```')) {
      const nl = seg.indexOf('\n');
      const code = nl > -1 ? seg.slice(nl + 1, -3) : seg.slice(3, -3);
      return <pre key={i} style={{ background: BG, border: `1px solid ${BR}`, borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, overflowX: 'auto', margin: '6px 0', whiteSpace: 'pre-wrap', color: TX }}><code>{code}</code></pre>;
    }
    return seg.split('\n').map((line, j) => (
      <span key={`${i}-${j}`}>
        {line.split(/(`[^`]+`)/g).map((p, k) => p.startsWith('`')
          ? <code key={k} style={{ fontFamily: 'monospace', fontSize: 12, background: B3, border: `1px solid ${BR}`, padding: '1px 5px', borderRadius: 3 }}>{p.slice(1, -1)}</code>
          : p
        )}
        <br />
      </span>
    ));
  });
}

const btn = (v, sm) => ({
  padding: sm ? '5px 12px' : '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
  border: v === 'primary' ? 'none' : v === 'danger' ? '1px solid #ff5555' : `1px solid ${BR}`,
  background: v === 'primary' ? L : 'transparent',
  color: v === 'primary' ? '#000' : v === 'danger' ? '#ff5555' : TX,
});
const fi = { width: '100%', background: B3, border: `1px solid ${BR}`, borderRadius: 8, padding: '10px 13px', color: TX, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const fl = { fontSize: 11, color: MT, marginBottom: 5, display: 'block', letterSpacing: 0.7, textTransform: 'uppercase' };

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('chat');
  const [tasks, setTasks] = useState([]);
  const [activeTid, setActiveTid] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [connectors, setConnectors] = useState([]);
  const [cronJobs, setCronJobs] = useState([]);
  const [vpsInst, setVpsInst] = useState([]);
  const [models, setModels] = useState([]);
  const [selModel, setSelModel] = useState('openrouter/mistralai/mistral-7b-instruct:free');
  const [inp, setInp] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [modal, setModal] = useState(null);
  const [modalErr, setModalErr] = useState('');
  const [skillSrch, setSkillSrch] = useState('');
  const [connTab, setConnTab] = useState('All');
  const [skillPacks, setSkillPacks] = useState([]);
  const [installedSkills, setInstalledSkills] = useState([]);
  const [agencyPrompt, setAgencyPrompt] = useState('');
  const [agencyRun, setAgencyRun] = useState(null);
  const [agencyBusy, setAgencyBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 900 : false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const msgEnd = useRef(null);
  const ta = useRef(null);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: 'smooth' }); });

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Init — check token
  useEffect(() => {
    const token = localStorage.getItem('ab_token');
    if (!token) { setLoading(false); return; }
    api.get('/api/auth/me').then(data => {
      if (data.user) { setUser(data.user); loadData(); }
      else { localStorage.removeItem('ab_token'); }
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, []);

  function loadData() {
    api.get('/api/tasks').then(data => setTasks(Array.isArray(data) ? data : []));
    api.get('/api/connectors').then(data => setConnectors(Array.isArray(data) ? data : []));
    api.get('/api/crons').then(data => setCronJobs(Array.isArray(data) ? data : []));
    api.get('/api/vps').then(data => setVpsInst(Array.isArray(data) ? data : []));
    api.get('/api/models').then(data => {
      if (!data.models) return;
      const cleanModels = data.models.filter((m) => !BLOCKED_MODEL_IDS.has(m.id));
      setModels(cleanModels);
      if (BLOCKED_MODEL_IDS.has(selModel)) setSelModel(cleanModels[0]?.id || 'openrouter/mistralai/mistral-7b-instruct:free');
    });
    api.get('/api/skills/packs').then(data => setSkillPacks(Array.isArray(data) ? data : []));
    api.get('/api/skills/installed').then(data => setInstalledSkills(Array.isArray(data) ? data : []));
  }

  async function loadTask(id) {
    const data = await api.get(`/api/tasks/${id}`);
    setActiveTask(data);
    setActiveTid(id);
    setView('chat');
  }

  async function sendMsg() {
    if (!inp.trim() || streaming) return;
    const content = inp.trim();
    setInp('');
    if (ta.current) ta.current.style.height = 'auto';

    let tid = activeTid;
    let task = activeTask;

    if (!tid) {
      task = await api.post('/api/tasks', { title: content.slice(0, 60) });
      tid = task.id;
      setTasks(p => [task, ...p]);
      setActiveTid(tid);
      setActiveTask({ ...task, messages: [] });
    }

    // Save user message to backend
    const userMsg = await api.post(`/api/tasks/${tid}/messages`, { role: 'user', content });
    setActiveTask(p => ({ ...p, messages: [...(p?.messages || []), userMsg] }));
    setStreaming(true);

    const history = [...(task?.messages || []), userMsg].map(m => ({ role: m.role, content: m.content }));
    const aiMsgId = `tmp-${Date.now()}`;
    setActiveTask(p => ({ ...p, messages: [...(p?.messages || []), { id: aiMsgId, role: 'assistant', content: '' }] }));

    try {
      const res = await fetch(api.url('/api/chat/stream'), {
        method: 'POST',
        headers: api.headers(),
        body: JSON.stringify({ messages: history, model: selModel, taskId: tid }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('SSE stream nije dostupan (res.body is null)');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = '';
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += dec.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const d = line.slice(6);
          if (d === '[DONE]') continue;
          try {
            const parsed = JSON.parse(d);
            if (parsed.error) throw new Error(parsed.error);
            const delta = parsed.delta || '';
            if (delta) {
              full += delta;
              setActiveTask(p => ({ ...p, messages: p.messages.map(m => m.id === aiMsgId ? { ...m, content: full } : m) }));
            }
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }
      sseBuffer += dec.decode();
      const trailing = sseBuffer.trim();
      if (trailing.startsWith('data: ')) {
        const d = trailing.slice(6);
        if (d !== '[DONE]') {
          try {
            const parsed = JSON.parse(d);
            if (parsed.error) throw new Error(parsed.error);
            const delta = parsed.delta || '';
            if (delta) {
              full += delta;
              setActiveTask(p => ({ ...p, messages: p.messages.map(m => m.id === aiMsgId ? { ...m, content: full } : m) }));
            }
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }

      if (!full.trim()) {
        throw new Error('Model nije vratio sadržaj. Provjeri API ključ i odabrani model.');
      }

      // Replace temp msg with real id
      setActiveTask(p => ({ ...p, messages: p.messages.map(m => m.id === aiMsgId ? { ...m, id: `real-${Date.now()}` } : m) }));
      setTasks(p => p.map(t => t.id === tid ? { ...t, updated_at: new Date().toISOString() } : t));

    } catch (err) {
      setActiveTask(p => ({ ...p, messages: p.messages.map(m => m.id === aiMsgId ? { ...m, content: `⚠️ Greška: ${err.message}` } : m) }));
    }

    setStreaming(false);
  }

  async function deleteTask(id) {
    await api.del(`/api/tasks/${id}`);
    setTasks(p => p.filter(t => t.id !== id));
    if (activeTid === id) { setActiveTid(null); setActiveTask(null); }
  }

  async function addConnector(type, config) {
    const safeConfig = Object.fromEntries(
      Object.entries(config || {}).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    const existing = connectors.find(c => c.type === type);
    let saved;
    if (existing) {
      const updated = await api.put(`/api/connectors/${existing.id}`, { config: safeConfig, active: true });
      if (updated?.error) throw new Error(updated.error);
      saved = updated;
      setConnectors(p => p.map(c => c.id === existing.id ? updated : c));
    } else {
      const def = CONNECTOR_TYPES.find(c => c.type === type);
      const created = await api.post('/api/connectors', { type, name: def.name, config: safeConfig });
      if (created?.error) throw new Error(created.error);
      saved = created;
      setConnectors(p => [...p, created]);
    }

    if ((type === 'openrouter' || type === 'ollama') && saved?.id) {
      const test = await api.post(`/api/connectors/${saved.id}/test`, {});
      if (test?.success === false || test?.error) {
        throw new Error(test?.message || test?.error || 'Connector test failed');
      }
    }
    setModalErr('');
    setModal(null);
  }

  async function toggleConnector(id, active) {
    const updated = await api.put(`/api/connectors/${id}`, { active: !active });
    setConnectors(p => p.map(c => c.id === id ? updated : c));
  }

  async function removeConnector(id) {
    await api.del(`/api/connectors/${id}`);
    setConnectors(p => p.filter(c => c.id !== id));
  }

  async function addCron(data) {
    const job = await api.post('/api/crons', data);
    setCronJobs(p => [...p, job]);
    setModal(null);
  }

  async function toggleCron(id, active) {
    const updated = await api.put(`/api/crons/${id}`, { active: !active });
    setCronJobs(p => p.map(c => c.id === id ? updated : c));
  }

  async function deleteCron(id) {
    await api.del(`/api/crons/${id}`);
    setCronJobs(p => p.filter(c => c.id !== id));
  }

  async function runCron(job) {
    const { result } = await api.post(`/api/crons/${job.id}/run`, {});
    const task = await api.post('/api/tasks', { title: `[Cron] ${job.name}` });
    await api.post(`/api/tasks/${task.id}/messages`, { role: 'assistant', content: result || 'Zadaća završena.' });
    await loadTask(task.id);
    loadData();
  }

  async function addVPS(data) {
    const inst = await api.post('/api/vps', data);
    setVpsInst(p => [...p, inst]);
    setModal(null);
  }

  async function toggleVPS(id, status) {
    const action = status === 'running' ? 'stop' : 'start';
    const data = await api.post(`/api/vps/${id}/${action}`, {});
    if (data.error) { alert(data.error); return; }
    setVpsInst(p => p.map(v => v.id === id ? { ...v, status: data.status } : v));
  }

  async function syncVPS(id) {
    const data = await api.post(`/api/vps/${id}/sync`, {});
    if (data.error) { alert(data.error); return; }
    setVpsInst(p => p.map(v => v.id === id ? { ...v, status: data.status } : v));
  }

  async function deleteVPS(id) {
    await api.del(`/api/vps/${id}`);
    setVpsInst(p => p.filter(v => v.id !== id));
  }

  async function installPack(packId) {
    const data = await api.post('/api/skills/install', { packId });
    if (data?.installed) setInstalledSkills(data.installed);
  }

  async function installSkill(skillId) {
    const data = await api.post('/api/skills/install-skill', { skillId });
    if (data?.error) throw new Error(data.error);
    if (data?.installed) setInstalledSkills(data.installed);
  }

  async function runAgency() {
    if (!agencyPrompt.trim() || agencyBusy) return;
    setAgencyBusy(true);
    try {
      const data = await api.post('/api/agency/run', { prompt: agencyPrompt, model: selModel });
      if (data.error) throw new Error(data.error);
      setAgencyRun(data);
      await api.get('/api/skills/installed').then(resp => setInstalledSkills(Array.isArray(resp) ? resp : []));
    } catch (err) {
      setAgencyRun({ error: err.message });
    }
    setAgencyBusy(false);
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
      <div style={{ fontSize: 32 }}>🦞</div>
    </div>
  );

  if (!user) return <AuthScreen onLogin={(u, token) => { localStorage.setItem('ab_token', token); setUser(u); loadData(); }} />;

  const connCats = ['All', ...new Set(CONNECTOR_TYPES.map(c => c.cat))];
  const filtConn = connTab === 'All' ? CONNECTOR_TYPES : CONNECTOR_TYPES.filter(c => c.cat === connTab);
  const MOBILE_NAV_ITEMS = [
    ['launch', '🦞', 'Launch'],
    ['chat', '💬', 'Chat'],
    ['connectors', '⚡', 'Conn'],
    ['skills', '🌟', 'Skills'],
    ['agency', '🧠', 'Agency'],
  ];
  const openView = (nextView) => {
    setView(nextView);
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: BG, color: TX, position: 'relative' }}>
      {/* SIDEBAR */}
      <div style={{ width: 220, minWidth: 220, background: B2, borderRight: `1px solid ${BR}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: isMobile ? 'fixed' : 'relative', zIndex: 40, left: sidebarOpen ? 0 : -240, top: 0, bottom: 0, transition: 'left .2s ease' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 14px 12px', borderBottom: `1px solid ${BR}` }}>
            <div style={{ width: 26, height: 26, background: L, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#000', flexShrink: 0 }}>+</div>
            <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>ATOMIC BOT</span>
          </div>
          <div onClick={() => { setActiveTid(null); setActiveTask(null); openView('chat'); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12, color: L }}>+ New task</div>
          {[['launch', '🦞', 'Run OpenClaw'], ['connectors', '⚡', 'Connectors'], ['skills', '🌟', 'Clawhub Skills'], ['agency', '🧠', 'Agency Runtime'], ['models', '✦', 'AI Models'], ['vps', '☁', 'VPS Instance'], ['crons', '⏱', 'Cron Jobs']].map(([v, icon, label]) => (
            <div key={v} onClick={() => openView(v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12, color: view === v ? L : MT, background: view === v ? 'rgba(170,255,0,0.06)' : 'transparent' }}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
          {tasks.length > 0 && (
            <>
              <div style={{ fontSize: 9, color: MT, letterSpacing: 1.5, padding: '12px 14px 4px', textTransform: 'uppercase' }}>Zadaće</div>
              {tasks.map(t => (
                <div key={t.id} onClick={() => { loadTask(t.id); if (isMobile) setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 14px', cursor: 'pointer', fontSize: 11, color: t.id === activeTid ? TX : MT, borderLeft: `2px solid ${t.id === activeTid ? L : 'transparent'}` }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.status === 'running' ? L : BR, flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                </div>
              ))}
            </>
          )}
        </div>
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${BR}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: BR, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{user.email?.[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            <div style={{ fontSize: 9, color: L }}>{user.role === 'admin' ? 'Admin · Unlimited' : 'Free plan'}</div>
          </div>
          <span style={{ fontSize: 13, cursor: 'pointer', color: MT }} onClick={() => { localStorage.removeItem('ab_token'); setUser(null); }}>⇥</span>
        </div>
      </div>

      {isMobile && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 30 }} />}

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginLeft: isMobile ? 0 : 0 }}>

        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BR}`, background: B2, display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ ...btn('ghost', true), width: 34, height: 34, padding: 0, borderRadius: 8 }}>☰</button>
            <div style={{ fontWeight: 800, fontSize: 14 }}>ATOMIC BOT</div>
          </div>
          <div style={{ fontSize: 11, color: MT }}>{view.toUpperCase()}</div>
        </div>

        {/* LAUNCH */}
        {view === 'launch' && <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px 78px' : 28 }}>
          <div style={{ maxWidth: 900, margin: '0 auto', background: '#0B0B0D', border: `1px solid ${BR}`, borderRadius: 24, padding: '32px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, background: L, borderRadius: 8, color: '#000', fontWeight: 900, display: 'grid', placeItems: 'center' }}>+</div>
                <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: 0.5 }}>ATOMIC BOT</div>
              </div>
              <button style={{ ...btn('ghost'), borderRadius: 999, width: 48, height: 48, padding: 0 }}>☰</button>
            </div>
            <div style={{ textAlign: 'center', padding: '32px 0 20px' }}>
              <div style={{ fontSize: isMobile ? 38 : 64, lineHeight: 1, fontWeight: 900 }}>RUN 🦞</div>
              <div style={{ fontSize: isMobile ? 38 : 64, lineHeight: 1, fontWeight: 900 }}>OPENCLAW</div>
              <div style={{ fontSize: isMobile ? 38 : 64, lineHeight: 1, fontWeight: 900, marginBottom: 12 }}>IN ONE CLICK</div>
              <p style={{ color: MT, fontSize: isMobile ? 19 : 28, marginBottom: 28 }}>One click and your AI assistant is live 24/7</p>
              <button style={{ background: '#B6F53F', border: 'none', color: '#000', borderRadius: 999, fontSize: isMobile ? 24 : 38, fontWeight: 700, padding: isMobile ? '14px 30px' : '18px 52px', cursor: 'pointer' }} onClick={() => setView('vps')}>+ Run in Cloud</button>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
                <button style={btn('ghost', true)} onClick={() => openView('agency')}>Open Agency Panel</button>
                <button style={btn('ghost', true)} onClick={() => openView('connectors')}>Configure Connectors</button>
                <button style={btn('ghost', true)} onClick={() => openView('models')}>Browse Free Models</button>
              </div>
            </div>
          </div>
        </div>}

        {/* AGENCY */}
        {view === 'agency' && <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Agency Runtime</h1>
          <p style={{ color: MT, fontSize: 13, marginBottom: 18 }}>Planner → Search → Executor workflow sa instaliranim skillovima.</p>

          <div style={{ background: B2, border: `1px solid ${BR}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: MT, marginBottom: 8 }}>Skill Packovi</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 10 }}>
              {skillPacks.map(pack => {
                const installedCount = installedSkills.filter(i => i.pack_id === pack.id && i.active).length;
                return <div key={pack.id} style={{ background: B3, border: `1px solid ${BR}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{pack.name}</div>
                  <div style={{ color: MT, fontSize: 11, margin: '5px 0 8px' }}>{pack.description}</div>
                  <div style={{ fontSize: 10, color: MT, marginBottom: 8 }}>{pack.capabilities?.join(', ')}</div>
                  <button style={btn('ghost', true)} onClick={() => installPack(pack.id)}>{installedCount ? `Installed (${installedCount})` : 'Install pack'}</button>
                </div>;
              })}
            </div>
          </div>

          <div style={{ background: B2, border: `1px solid ${BR}`, borderRadius: 12, padding: 16 }}>
            <label style={fl}>TASK PROMPT</label>
            <textarea style={{ ...fi, minHeight: 110, resize: 'vertical' }} value={agencyPrompt} onChange={e => setAgencyPrompt(e.target.value)} placeholder="Npr. Napravi sedmični AI market report i akcioni plan za tim." />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: MT }}>Model: {selModel}</div>
              <button style={btn('primary')} onClick={runAgency} disabled={agencyBusy}>{agencyBusy ? 'Running…' : 'Run Agency Task'}</button>
            </div>
          </div>

          {agencyRun && <div style={{ background: B2, border: `1px solid ${BR}`, borderRadius: 12, padding: 16, marginTop: 16 }}>
            {agencyRun.error ? <div style={{ color: '#ff7777', fontSize: 12 }}>⚠ {agencyRun.error}</div> : <>
              <div style={{ fontSize: 12, color: MT, marginBottom: 6 }}>Plan</div>
              <pre style={{ background: B3, border: `1px solid ${BR}`, borderRadius: 8, padding: 10, whiteSpace: 'pre-wrap', fontSize: 12 }}>{agencyRun.plan}</pre>
              <div style={{ fontSize: 12, color: MT, margin: '10px 0 6px' }}>Result</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{fmt(agencyRun.result)}</div>
            </>}
          </div>}
        </div>}

        {/* CHAT */}
        {view === 'chat' && <>
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: B2, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{activeTask ? activeTask.title : 'Nova zadaća'}</div>
              {activeTask && <div style={{ fontSize: 10, color: MT, marginTop: 1 }}>{activeTask.messages?.length} poruka</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select style={{ background: B3, border: `1px solid ${BR}`, borderRadius: 7, padding: '5px 9px', color: TX, fontSize: 11, outline: 'none', cursor: 'pointer' }} value={selModel} onChange={e => setSelModel(e.target.value)}>
                {models.length > 0 ? models.map(m => <option key={m.id} value={m.id}>{m.name}</option>) : (
                  <>
                    <option value="openrouter/mistralai/mistral-7b-instruct:free">Mistral 7B (Free)</option>
                    <option value="openrouter/meta-llama/llama-3-8b-instruct:free">Llama 3 8B (Free)</option>
                    <option value="openrouter/google/gemma-2-9b-it:free">Gemma 2 9B (Free)</option>
                    <option value="openrouter/deepseek/deepseek-r1:free">DeepSeek R1 (Free)</option>
                    <option value="openrouter/microsoft/phi-3-mini-128k-instruct:free">Phi-3 Mini (Free)</option>
                  </>
                )}
              </select>
              {activeTask && <button style={btn('ghost', true)} onClick={() => deleteTask(activeTask.id)}>Obriši</button>}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!activeTask && (
              <div style={{ textAlign: 'center', margin: 'auto', padding: '30px 20px' }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>🦞</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Čime mogu pomoći?</h2>
                <p style={{ color: MT, fontSize: 13, maxWidth: 360, margin: '0 auto 22px' }}>AI asistent spreman za kodiranje, pisanje, istraživanje i planiranje.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 420, margin: '0 auto' }}>
                  {['Napiši Python kod', 'Napravi biznis plan', 'Objasni machine learning', 'Planiraj mi sedmicu'].map(s => (
                    <div key={s} onClick={() => { setInp(s); ta.current?.focus(); }} style={{ background: B2, border: `1px solid ${BR}`, borderRadius: 9, padding: '10px 13px', cursor: 'pointer', fontSize: 12, color: MT }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = L; e.currentTarget.style.color = TX; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = BR; e.currentTarget.style.color = MT; }}>{s}</div>
                  ))}
                </div>
              </div>
            )}

            {activeTask?.messages?.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: m.role === 'assistant' ? L : BR, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: m.role === 'assistant' ? '#000' : TX, flexShrink: 0 }}>
                  {m.role === 'assistant' ? '+' : user.email?.[0]?.toUpperCase()}
                </div>
                <div style={{ maxWidth: '74%', padding: '10px 14px', borderRadius: 11, fontSize: 13, lineHeight: 1.65, background: m.role === 'user' ? 'rgba(170,255,0,0.09)' : B3, border: `1px solid ${m.role === 'user' ? 'rgba(170,255,0,0.2)' : BR}`, borderTopLeftRadius: m.role === 'assistant' ? 2 : 11, borderTopRightRadius: m.role === 'user' ? 2 : 11 }}>
                  {fmt(m.content)}
                </div>
              </div>
            ))}

            {streaming && (
              <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: L, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#000', flexShrink: 0 }}>+</div>
                <div style={{ padding: '10px 14px', borderRadius: 11, background: B3, border: `1px solid ${BR}`, borderTopLeftRadius: 2 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 150, 300].map(d => <div key={d} style={{ width: 5, height: 5, background: L, borderRadius: '50%', animation: `pulse 0.8s ${d}ms infinite` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={msgEnd} />
          </div>

          <div style={{ padding: '12px 20px', borderTop: `1px solid ${BR}`, background: B2, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea ref={ta} style={{ flex: 1, background: B3, border: `1px solid ${BR}`, borderRadius: 11, padding: '10px 14px', color: TX, fontSize: 13, resize: 'none', outline: 'none', minHeight: 44, maxHeight: 160, fontFamily: 'inherit' }}
                placeholder="Pošalji poruku Atomic Botu…" value={inp}
                onChange={e => { setInp(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }} rows={1} />
              <button onClick={sendMsg} disabled={!inp.trim() || streaming} style={{ width: 42, height: 42, borderRadius: 9, background: !inp.trim() || streaming ? BR : L, border: 'none', cursor: !inp.trim() || streaming ? 'not-allowed' : 'pointer', fontSize: 17, color: !inp.trim() || streaming ? MT : '#000', flexShrink: 0 }}>↑</button>
            </div>
            <div style={{ fontSize: 10, color: MT, marginTop: 5, textAlign: 'center' }}>Enter pošalji · Shift+Enter novi red</div>
          </div>
        </>}

        {/* CONNECTORS */}
        {view === 'connectors' && <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Connectors</h1>
              <p style={{ color: MT, fontSize: 13 }}>Poveži AI provajdere, aplikacije i servise.</p>
            </div>
            {connectors.filter(c => c.active).length > 0 && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(170,255,0,0.12)', color: L }}>{connectors.filter(c => c.active).length} aktivnih</span>}
          </div>

          {connectors.length > 0 && <>
            <div style={{ fontSize: 10, color: MT, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Konfigurisano</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12, marginBottom: 24 }}>
              {connectors.map(conn => {
                const def = CONNECTOR_TYPES.find(c => c.type === conn.type);
                return (
                  <div key={conn.id} style={{ background: B2, border: `1px solid ${conn.active ? L : BR}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: B3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{def?.icon}</div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{def?.name}</div><div style={{ fontSize: 10, color: MT }}>{def?.cat}</div></div>
                      <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: conn.active ? 'rgba(170,255,0,0.12)' : B3, color: conn.active ? L : MT }}>{conn.active ? 'Aktivan' : 'Off'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ ...btn('ghost', true), flex: 1 }} onClick={() => toggleConnector(conn.id, conn.active)}>{conn.active ? 'Isključi' : 'Uključi'}</button>
                      <button style={btn('danger', true)} onClick={() => removeConnector(conn.id)}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <hr style={{ border: 'none', borderTop: `1px solid ${BR}`, margin: '0 0 22px' }} />
          </>}

          <div style={{ fontSize: 10, color: MT, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Dostupni</div>
          <div style={{ display: 'flex', gap: 2, background: B3, borderRadius: 8, padding: 3, marginBottom: 18, width: 'fit-content' }}>
            {connCats.map(c => <div key={c} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: connTab === c ? TX : MT, background: connTab === c ? B2 : 'transparent', fontWeight: connTab === c ? 600 : 400 }} onClick={() => setConnTab(c)}>{c}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
            {filtConn.map(def => {
              const connected = connectors.find(c => c.type === def.type);
              return (
                <div key={def.type} style={{ background: B2, border: `1px solid ${connected?.active ? L : BR}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: B3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{def.icon}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{def.name}</div><div style={{ fontSize: 10, color: MT }}>{def.cat}</div></div>
                    {connected && <span style={{ fontSize: 14, color: L }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 12, color: MT, lineHeight: 1.5 }}>{def.desc}</div>
                  <button style={btn('primary', true)} onClick={() => { setModalErr(''); setModal({ type: 'connector', def, existing: connected || null }); }}>{connected ? 'Rekonfiguriši' : 'Konfiguriši'}</button>
                </div>
              );
            })}
          </div>
        </div>}

        {/* SKILLS */}
        {view === 'skills' && <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Clawhub Skills</h1>
          <p style={{ color: MT, fontSize: 13, marginBottom: 20 }}>Dodaj sposobnosti svom AI asistentu.</p>
          <input style={{ ...fi, maxWidth: 280, marginBottom: 20 }} placeholder="🔍  Pretraži skill-ove…" value={skillSrch} onChange={e => setSkillSrch(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 12 }}>
            {SKILLS.filter(s => !skillSrch || s.name.toLowerCase().includes(skillSrch.toLowerCase()) || s.desc.toLowerCase().includes(skillSrch.toLowerCase())).map(sk => {
              const needsConn = sk.connector && !connectors.find(c => c.type === sk.connector && c.active);
              const isInstalled = installedSkills.some(i => i.skill_id === sk.id && i.active);
              return (
                <div key={sk.id} style={{ background: B2, border: `1px solid ${BR}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: B3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{sk.icon}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{sk.name}</div><div style={{ fontSize: 10, color: MT }}>{sk.cat}</div></div>
                    <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: sk.free ? 'rgba(170,255,0,0.12)' : B3, color: sk.free ? L : MT }}>{sk.free ? 'FREE' : 'PRO'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: MT, lineHeight: 1.5 }}>{sk.desc}</div>
                  {needsConn && <div style={{ fontSize: 11, color: '#ff9900' }}>⚠ Treba {CONNECTOR_TYPES.find(c => c.type === sk.connector)?.name}</div>}
                  <button
                    style={btn('ghost', true)}
                    onClick={async () => {
                      if (needsConn) return openView('connectors');
                      if (isInstalled) return;
                      try {
                        await installSkill(sk.id);
                      } catch (err) {
                        alert(`Greška: ${err.message}`);
                      }
                    }}
                  >
                    {needsConn ? 'Konfiguriši konektor' : isInstalled ? 'Dodano ✓' : 'Dodaj asistentu'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>}

        {/* MODELS */}
        {view === 'models' && <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>AI Modeli</h1>
          <p style={{ color: MT, fontSize: 13, marginBottom: 24 }}>AtomicBot koristi OpenRouter free modele. Dodaj OpenRouter API ključ kroz Connectors.</p>
          {(models.length > 0 ? models : [
            { id: 'openrouter/mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', provider: 'openrouter', context: 32768 },
            { id: 'openrouter/meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B (Free)', provider: 'openrouter', context: 8192 },
            { id: 'openrouter/google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', provider: 'openrouter', context: 8192 },
            { id: 'openrouter/deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', provider: 'openrouter', context: 65536 },
            { id: 'openrouter/microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini (Free)', provider: 'openrouter', context: 131072 },
          ]).map(m => (
            <div key={m.id} onClick={() => setSelModel(m.id)} style={{ background: selModel === m.id ? 'rgba(170,255,0,0.04)' : B2, border: `1px solid ${selModel === m.id ? L : BR}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', marginBottom: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selModel === m.id ? L : BR}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {selModel === m.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: L }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: MT, marginTop: 2 }}>{m.provider} · {Math.round(m.context / 1000)}k context</div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: MT, marginTop: 2 }}>{m.id}</div>
              </div>
              <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(170,255,0,0.12)', color: L }}>BESPLATNO</span>
              {selModel === m.id && <span style={{ fontSize: 12, color: L, fontWeight: 700 }}>✓</span>}
            </div>
          ))}
        </div>}

        {/* VPS */}
        {view === 'vps' && <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>VPS Instance</h1><p style={{ color: MT, fontSize: 13 }}>Cloud instance sa realnim start/stop webhook endpointima.</p></div>
            <button style={btn('primary')} onClick={() => setModal({ type: 'vps' })}>+ Nova instanca</button>
          </div>
          {vpsInst.length === 0 ? <div style={{ textAlign: 'center', padding: '50px 20px', color: MT }}><div style={{ fontSize: 36, marginBottom: 12 }}>☁️</div><div style={{ fontSize: 15, fontWeight: 700, color: TX, marginBottom: 6 }}>Nema instanci</div><p>Deploj VPS za 24/7 AI workflow-ove.</p></div>
            : vpsInst.map(v => (
              <div key={v.id} style={{ background: B2, border: `1px solid ${BR}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.status === 'running' ? L : BR, boxShadow: v.status === 'running' ? `0 0 8px ${L}` : 'none', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: MT, marginTop: 2 }}>{v.provider} · <span style={{ color: v.status === 'running' ? L : MT }}>{v.status}</span></div>
                </div>
                <button style={btn('ghost', true)} onClick={() => toggleVPS(v.id, v.status)}>{v.status === 'running' ? 'Zaustavi' : 'Pokreni'}</button>
                <button style={btn('ghost', true)} onClick={() => syncVPS(v.id)}>Sync</button>
                <button style={btn('danger', true)} onClick={() => deleteVPS(v.id)}>Obriši</button>
              </div>
            ))}
        </div>}

        {/* CRONS */}
        {view === 'crons' && <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Cron Jobs</h1><p style={{ color: MT, fontSize: 13 }}>Zakaži AI zadaće da se automatski izvršavaju.</p></div>
            <button style={btn('primary')} onClick={() => setModal({ type: 'cron' })}>+ Novi job</button>
          </div>
          {cronJobs.length === 0 ? <div style={{ textAlign: 'center', padding: '50px 20px', color: MT }}><div style={{ fontSize: 36, marginBottom: 12 }}>⏱</div><div style={{ fontSize: 15, fontWeight: 700, color: TX, marginBottom: 6 }}>Nema cron job-ova</div><p>Zakaži AI zadaće da se pokreću automatski.</p></div>
            : cronJobs.map(job => (
              <div key={job.id} style={{ background: B2, border: `1px solid ${BR}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{job.name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: L, margin: '3px 0' }}>{job.schedule}</div>
                  <div style={{ fontSize: 11, color: MT, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.prompt}</div>
                  {job.last_run && <div style={{ fontSize: 10, color: MT, marginTop: 3 }}>Zadnje: {new Date(job.last_run).toLocaleString()}</div>}
                </div>
                <label style={{ position: 'relative', width: 36, height: 20, cursor: 'pointer', flexShrink: 0 }}>
                  <input type="checkbox" style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} checked={!!job.active} onChange={() => toggleCron(job.id, job.active)} />
                  <div style={{ position: 'absolute', inset: 0, background: job.active ? L : BR, borderRadius: 10, transition: '.2s' }} />
                  <div style={{ position: 'absolute', top: 3, left: job.active ? 19 : 3, width: 14, height: 14, background: '#fff', borderRadius: '50%', transition: '.2s' }} />
                </label>
                <button style={btn('ghost', true)} onClick={() => runCron(job)}>▶ Pokreni</button>
                <button style={btn('danger', true)} onClick={() => deleteCron(job.id)}>Obriši</button>
              </div>
            ))}
        </div>}

        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 4, padding: '8px 6px calc(8px + env(safe-area-inset-bottom))', borderTop: `1px solid ${BR}`, background: B2 }}>
            {MOBILE_NAV_ITEMS.map(([v, icon, label]) => (
              <button
                key={v}
                onClick={() => openView(v)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  background: view === v ? 'rgba(170,255,0,0.12)' : 'transparent',
                  color: view === v ? L : MT,
                  borderRadius: 10,
                  padding: '8px 4px',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
                <span style={{ lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {modal?.type === 'connector' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: B2, border: `1px solid ${BR}`, borderRadius: 16, padding: 28, width: 420, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{modal.def.icon} {modal.def.name}</div>
            <div style={{ fontSize: 12, color: MT, marginBottom: 20 }}>{modal.def.desc}</div>
            <ConnForm error={modalErr} def={modal.def} initialConfig={modal.existing?.config || {}} onSave={async (cfg) => {
              try {
                await addConnector(modal.def.type, cfg);
              } catch (err) {
                setModalErr(err.message || 'Greška pri spremanju konektora');
              }
            }} onClose={() => { setModalErr(''); setModal(null); }} />
          </div>
        </div>
      )}
      {modal?.type === 'cron' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: B2, border: `1px solid ${BR}`, borderRadius: 16, padding: 28, width: 420, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>⏱ Novi Cron Job</div>
            <CronForm onSave={addCron} onClose={() => setModal(null)} />
          </div>
        </div>
      )}
      {modal?.type === 'vps' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: B2, border: `1px solid ${BR}`, borderRadius: 16, padding: 28, width: 380 }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>☁ Nova VPS Instanca</div>
            <VPSForm onSave={addVPS} onClose={() => setModal(null)} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:${BR};border-radius:2px}
        textarea{overflow-y:hidden}
      `}</style>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
      const data = await res.json();
      if (data.error) { setErr(data.error); return; }
      onLogin(data.user, data.token);
    } catch { setErr('Greška pri konekciji sa serverom'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
      <div style={{ background: B2, border: `1px solid ${BR}`, borderRadius: 16, padding: 36, width: 340 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ width: 32, height: 32, background: L, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#000' }}>+</div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1, color: TX }}>ATOMIC BOT</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 4, color: TX }}>{mode === 'login' ? 'Dobro došao' : 'Kreiraj nalog'}</h2>
        <p style={{ color: MT, fontSize: 12, textAlign: 'center', marginBottom: 22 }}>{mode === 'login' ? 'Prijavi se u AI workspace' : 'Počni svoju AI avanturu'}</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}><label style={fl}>EMAIL</label><input style={{ ...fi, fontSize: 13 }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ti@primjer.com" required /></div>
          <div style={{ marginBottom: 12 }}><label style={fl}>LOZINKA</label><input style={{ ...fi, fontSize: 13 }} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required /></div>
          {err && <p style={{ color: '#ff5555', fontSize: 12, marginBottom: 10 }}>{err}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', border: 'none', background: L, color: '#000', fontFamily: 'inherit' }}>
            {loading ? '...' : mode === 'login' ? 'Prijavi se' : 'Kreiraj nalog'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 11, color: MT, marginTop: 14 }}>
          {mode === 'login' ? 'Nemaš nalog? ' : 'Imaš nalog? '}
          <span style={{ color: L, cursor: 'pointer' }} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
            {mode === 'login' ? 'Registruj se' : 'Prijavi se'}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── Connector Form ───────────────────────────────────────────────────────────
function ConnForm({ def, onSave, onClose, error, initialConfig = {} }) {
  const [cfg, setCfg] = useState(initialConfig);

  useEffect(() => {
    const draft = localStorage.getItem(`ab_connector_draft_${def.type}`);
    if (draft) {
      try { setCfg({ ...initialConfig, ...JSON.parse(draft) }); return; } catch { /* ignore */ }
    }
    setCfg(initialConfig);
  }, [def.type, initialConfig]);

  const updateCfg = (field, value) => {
    setCfg((prev) => {
      const next = { ...prev, [field]: value };
      localStorage.setItem(`ab_connector_draft_${def.type}`, JSON.stringify(next));
      return next;
    });
  };
  return (
    <form onSubmit={e => { e.preventDefault(); localStorage.removeItem(`ab_connector_draft_${def.type}`); onSave(cfg); }}>
      {def.fields.map(f => (
        <div key={f} style={{ marginBottom: 14 }}>
          <label style={fl}>{f.replace(/([A-Z])/g, ' $1').toUpperCase()}</label>
          <input style={{ ...fi, fontSize: 13 }} type={['apiKey', 'token', 'secret', 'clientSecret'].includes(f) ? 'password' : 'text'} placeholder={`Unesi ${f}`} value={cfg[f] || ''} onChange={e => updateCfg(f, e.target.value)} />
        </div>
      ))}
      {error && <div style={{ color: '#ff7777', fontSize: 12, marginBottom: 8 }}>⚠ {error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button type="button" style={btn('ghost')} onClick={onClose}>Otkaži</button>
        <button type="submit" style={btn('primary')}>Sačuvaj</button>
      </div>
    </form>
  );
}

// ─── Cron Form ────────────────────────────────────────────────────────────────
function CronForm({ onSave, onClose }) {
  const [f, setF] = useState({ name: '', schedule: '0 9 * * *', prompt: '', model: 'openrouter/mistralai/mistral-7b-instruct:free' });
  const presets = [['Svaki sat', '0 * * * *'], ['Dnevno 9h', '0 9 * * *'], ['Ponedjeljkom', '0 9 * * 1'], ['Svako 30min', '*/30 * * * *']];
  return (
    <form onSubmit={e => { e.preventDefault(); if (!f.name || !f.schedule || !f.prompt) return; onSave(f); }}>
      <div style={{ marginBottom: 14 }}><label style={fl}>IME JOBA</label><input style={{ ...fi, fontSize: 13 }} placeholder="Dnevni sažetak" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required /></div>
      <div style={{ marginBottom: 14 }}>
        <label style={fl}>RASPORED (CRON)</label>
        <input style={{ ...fi, fontSize: 13, fontFamily: 'monospace' }} value={f.schedule} onChange={e => setF(p => ({ ...p, schedule: e.target.value }))} required />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {presets.map(([l, v]) => <span key={v} style={{ fontSize: 10, padding: '3px 8px', background: B3, borderRadius: 6, cursor: 'pointer', color: MT, border: `1px solid ${BR}` }} onClick={() => setF(p => ({ ...p, schedule: v }))}>{l}</span>)}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}><label style={fl}>AI PROMPT</label><textarea style={{ ...fi, resize: 'vertical', minHeight: 80, fontSize: 13 }} placeholder="Napiši dnevni sažetak vijesti o AI…" value={f.prompt} onChange={e => setF(p => ({ ...p, prompt: e.target.value }))} required /></div>
      <div style={{ marginBottom: 14 }}>
        <label style={fl}>MODEL</label>
        <select style={{ ...fi, cursor: 'pointer', fontSize: 13 }} value={f.model} onChange={e => setF(p => ({ ...p, model: e.target.value }))}>
          <option value="openrouter/mistralai/mistral-7b-instruct:free">Mistral 7B (Free)</option>
          <option value="openrouter/meta-llama/llama-3-8b-instruct:free">Llama 3 8B (Free)</option>
          <option value="openrouter/deepseek/deepseek-r1:free">DeepSeek R1 (Free)</option>
        </select>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" style={btn('ghost')} onClick={onClose}>Otkaži</button>
        <button type="submit" style={btn('primary')}>Kreiraj Job</button>
      </div>
    </form>
  );
}

// ─── VPS Form ─────────────────────────────────────────────────────────────────
function VPSForm({ onSave, onClose }) {
  const [f, setF] = useState({ name: '', provider: 'railway', startUrl: '', stopUrl: '', statusUrl: '' });
  return (
    <form onSubmit={e => { e.preventDefault(); if (!f.name || !f.startUrl || !f.stopUrl) return; onSave({ name: f.name, provider: f.provider, config: { startUrl: f.startUrl, stopUrl: f.stopUrl, statusUrl: f.statusUrl } }); }}>
      <div style={{ marginBottom: 14 }}><label style={fl}>IME INSTANCE</label><input style={{ ...fi, fontSize: 13 }} placeholder="Moj AI Server" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required /></div>
      <div style={{ marginBottom: 14 }}>
        <label style={fl}>PROVAJDER</label>
        <select style={{ ...fi, cursor: 'pointer', fontSize: 13 }} value={f.provider} onChange={e => setF(p => ({ ...p, provider: e.target.value }))}>
          <option value="railway">Railway</option>
          <option value="render">Render</option>
          <option value="fly">Fly.io</option>
          <option value="digitalocean">DigitalOcean</option>
          <option value="hetzner">Hetzner</option>
        </select>
      </div>
      <div style={{ marginBottom: 10 }}><label style={fl}>START WEBHOOK URL</label><input style={{ ...fi, fontSize: 13 }} placeholder="https://.../start" value={f.startUrl} onChange={e => setF(p => ({ ...p, startUrl: e.target.value }))} /></div>
      <div style={{ marginBottom: 10 }}><label style={fl}>STOP WEBHOOK URL</label><input style={{ ...fi, fontSize: 13 }} placeholder="https://.../stop" value={f.stopUrl} onChange={e => setF(p => ({ ...p, stopUrl: e.target.value }))} /></div>
      <div style={{ marginBottom: 14 }}><label style={fl}>STATUS URL (opcionalno)</label><input style={{ ...fi, fontSize: 13 }} placeholder="https://.../status" value={f.statusUrl} onChange={e => setF(p => ({ ...p, statusUrl: e.target.value }))} /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" style={btn('ghost')} onClick={onClose}>Otkaži</button>
        <button type="submit" style={btn('primary')}>Kreiraj</button>
      </div>
    </form>
  );
}
