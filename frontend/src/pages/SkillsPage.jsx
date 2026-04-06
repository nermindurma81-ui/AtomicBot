import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import { Search } from 'lucide-react';

export default function SkillsPage() {
  const { skills, loadSkills, connectors } = useStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => { loadSkills(); }, []);

  const categories = ['All', ...new Set(skills.map(s => s.category))];
  const filtered = skills.filter(s =>
    (category === 'All' || s.category === category) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()))
  );

  const connectedTypes = new Set(connectors.filter(c => c.active).map(c => c.type));

  function isAvailable(skill) {
    if (skill.free) return true;
    return skill.connector && connectedTypes.has(skill.connector);
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="px-6 py-5 border-b border-[#1a1a1a]">
        <h1 className="text-lg font-bold mb-1">Clawhub Skills</h1>
        <p className="text-gray-500 text-sm mb-4">Extend your AI with powerful capabilities</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-xl px-3 py-2">
            <Search size={14} className="text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-gray-600"
            />
          </div>
        </div>
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${category === cat ? 'bg-[#1a1a1a] text-white' : 'text-gray-500 hover:text-white'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(skill => {
            const available = isAvailable(skill);
            return (
              <div key={skill.id} className={`bg-[#111] border rounded-xl p-4 transition-all ${available ? 'border-[#1f1f1f] hover:border-[#2a2a2a]' : 'border-[#1a1a1a] opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{skill.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{skill.name}</span>
                      {skill.free && <span className="text-xs bg-[#a3e635]/10 text-[#a3e635] px-1.5 py-0.5 rounded">Free</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{skill.description}</div>
                    {skill.action && <div className="text-xs text-gray-600 mt-1 italic">{skill.action}</div>}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-600">{skill.category}</span>
                  {available ? (
                    <button className="px-3 py-1 bg-[#1a1a1a] rounded-lg text-xs hover:bg-[#2a2a2a] transition-colors">
                      Use skill
                    </button>
                  ) : (
                    <span className="text-xs text-gray-600">Requires {skill.connector?.replace('_', ' ')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-16">No skills found</div>
        )}
      </div>
    </div>
  );
}
