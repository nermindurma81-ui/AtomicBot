import { create } from 'zustand';
import api from '../lib/api.js';

export const useStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('ab_user') || 'null'),
  token: localStorage.getItem('ab_token') || null,
  tasks: [],
  activeTask: null,
  connectors: [],
  models: [],
  cronJobs: [],
  skills: [],
  vpsInstances: [],
  selectedModel: localStorage.getItem('ab_model') || 'openrouter/free',
  sidebarOpen: true,

  setUser: (user, token) => {
    localStorage.setItem('ab_user', JSON.stringify(user));
    localStorage.setItem('ab_token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('ab_token');
    localStorage.removeItem('ab_user');
    set({ user: null, token: null, tasks: [], activeTask: null });
  },

  setSelectedModel: (model) => {
    localStorage.setItem('ab_model', model);
    set({ selectedModel: model });
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Tasks
  loadTasks: async () => {
    const { data } = await api.get('/tasks');
    set({ tasks: data });
  },

  createTask: async (title) => {
    const { data } = await api.post('/tasks', { title });
    set(s => ({ tasks: [data, ...s.tasks], activeTask: data }));
    return data;
  },

  setActiveTask: async (task) => {
    if (!task) { set({ activeTask: null }); return; }
    const { data } = await api.get(`/tasks/${task.id}`);
    set({ activeTask: data });
    return data;
  },

  updateActiveTaskMessages: (messages) => {
    set(s => ({ activeTask: s.activeTask ? { ...s.activeTask, messages } : null }));
  },

  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}`);
    set(s => ({
      tasks: s.tasks.filter(t => t.id !== id),
      activeTask: s.activeTask?.id === id ? null : s.activeTask,
    }));
  },

  // Connectors
  loadConnectors: async () => {
    const { data } = await api.get('/connectors');
    set({ connectors: data });
  },

  addConnector: async (type, name, config) => {
    const { data } = await api.post('/connectors', { type, name, config });
    set(s => ({ connectors: [...s.connectors, data] }));
    return data;
  },

  toggleConnector: async (id, active) => {
    const { data } = await api.put(`/connectors/${id}`, { active });
    set(s => ({ connectors: s.connectors.map(c => c.id === id ? data : c) }));
  },

  deleteConnector: async (id) => {
    await api.delete(`/connectors/${id}`);
    set(s => ({ connectors: s.connectors.filter(c => c.id !== id) }));
  },

  // Models
  loadModels: async () => {
    const { data } = await api.get('/models');
    set({ models: data.models || [] });
  },

  // Cron Jobs
  loadCronJobs: async () => {
    const { data } = await api.get('/crons');
    set({ cronJobs: data });
  },

  addCronJob: async (job) => {
    const { data } = await api.post('/crons', job);
    set(s => ({ cronJobs: [...s.cronJobs, data] }));
    return data;
  },

  updateCronJob: async (id, updates) => {
    const { data } = await api.put(`/crons/${id}`, updates);
    set(s => ({ cronJobs: s.cronJobs.map(j => j.id === id ? data : j) }));
  },

  deleteCronJob: async (id) => {
    await api.delete(`/crons/${id}`);
    set(s => ({ cronJobs: s.cronJobs.filter(j => j.id !== id) }));
  },

  // Skills
  loadSkills: async () => {
    const { data } = await api.get('/skills');
    set({ skills: data });
  },

  // VPS
  loadVPS: async () => {
    const { data } = await api.get('/vps');
    set({ vpsInstances: data });
  },

  addVPS: async (name, provider) => {
    const { data } = await api.post('/vps', { name, provider });
    set(s => ({ vpsInstances: [...s.vpsInstances, data] }));
    return data;
  },
}));
