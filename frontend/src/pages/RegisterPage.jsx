import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/index.js';
import api from '../lib/api.js';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useStore();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { email, password });
      setUser(data.user, data.token);
      toast.success('Account created!');
      navigate('/app');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🦞</div>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Start using Atomic Bot for free</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#a3e635] transition-colors placeholder:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              className="w-full bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#a3e635] transition-colors placeholder:text-gray-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#a3e635] text-black font-bold py-3 rounded-xl hover:bg-[#bef264] transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[#a3e635] hover:underline">Sign in</Link>
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          <Link to="/" className="hover:text-gray-300 transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
