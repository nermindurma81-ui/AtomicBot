import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import toast from 'react-hot-toast';
import {
  Plus, Plug, Zap, Cpu, Cloud, Clock, ChevronLeft, ChevronRight,
  LogOut, User, Trash2, LayoutGrid
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'New task', icon: Plus, path: '/app', action: 'new-task' },
  { label: 'Connectors', icon: Plug, path: '/app/connectors' },
  { label: 'Clawhub Skills', icon: Zap, path: '/app/skills' },
  { label: 'AI Models', icon: Cpu, path: '/app/models' },
  { label: 'VPS Instance', icon: Cloud, path: '/app/vps' },
  { label: 'Cron Jobs', icon: Clock, path: '/app/crons' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, tasks, loadTasks, createTask, setActiveTask, deleteTask, activeTask, sidebarOpen, setSidebarOpen } = useStore();

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleNewTask() {
    const title = `Task ${new Date().toLocaleTimeString()}`;
    await createTask(title);
    navigate('/app');
  }

  async function handleNavClick(item) {
    if (item.action === 'new-task') {
      await handleNewTask();
    } else {
      navigate(item.path);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
    toast.success('Signed out');
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} transition-all duration-200 flex flex-col border-r border-[#1a1a1a] bg-[#0a0a0a] flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <span className="text-[#a3e635] font-bold">✦</span>
            <span className="font-bold tracking-widest text-sm uppercase">Atomic Bot</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1">
            <LayoutGrid size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group
                ${location.pathname === item.path && item.path !== '/app'
                  ? 'bg-[#1a1a1a] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#141414]'}`}
            >
              <item.icon size={16} className="flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Tasks list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="text-xs text-gray-600 uppercase tracking-wider px-2 mb-2">Tasks</div>
          {tasks.length === 0 ? (
            <div className="text-xs text-gray-600 px-2 py-2">No tasks yet</div>
          ) : (
            <div className="space-y-0.5">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all
                    ${activeTask?.id === task.id ? 'bg-[#1a1a1a] text-white' : 'text-gray-500 hover:text-white hover:bg-[#111]'}`}
                  onClick={() => { setActiveTask(task); navigate('/app'); }}
                >
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.status === 'completed' ? 'bg-[#a3e635]' : 'bg-gray-600'}`} />
                  <span className="text-xs truncate flex-1">{task.title}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User */}
        <div className="border-t border-[#1a1a1a] px-3 py-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-7 h-7 rounded-full bg-[#1f1f1f] flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-300 truncate">{user?.email}</div>
              <div className="text-xs text-gray-600 capitalize">{user?.plan} plan</div>
            </div>
            <button onClick={handleLogout} className="text-gray-600 hover:text-red-400 transition-colors" title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Toggle sidebar button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-2 top-4 z-10 bg-[#111] border border-[#1f1f1f] rounded-lg p-2 text-gray-400 hover:text-white transition-all"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
