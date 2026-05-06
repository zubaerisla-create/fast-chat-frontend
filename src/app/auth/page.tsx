'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { loginUser, registerUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res =
        mode === 'login'
          ? await loginUser({ email: form.email, password: form.password })
          : await registerUser(form);
      const { token, user } = res.data;
      login(user, token);
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
      router.push('/chat');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#7C6EFF]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#A89CFF]/8 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md px-6 relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C6EFF] to-[#A89CFF] mb-4 shadow-lg shadow-[#7C6EFF]/30">
            <span className="text-2xl">💬</span>
          </div>
          <h1 className="font-display text-4xl font-bold gradient-text">Vibe</h1>
          <p className="text-white/40 text-sm mt-1 font-sans">Real-time chat. Clean & fast.</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-8">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-sans font-medium transition-all duration-200 ${
                  mode === m
                    ? 'bg-[#7C6EFF] text-white shadow-lg shadow-[#7C6EFF]/20'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-sans uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="your_username"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-sans outline-none input-glow transition-all focus:border-[#7C6EFF]/50"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-white/40 mb-1.5 font-sans uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-sans outline-none input-glow transition-all focus:border-[#7C6EFF]/50"
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1.5 font-sans uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-sans outline-none input-glow transition-all focus:border-[#7C6EFF]/50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 bg-gradient-to-r from-[#7C6EFF] to-[#A89CFF] rounded-xl text-white font-sans font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:shadow-[#7C6EFF]/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
