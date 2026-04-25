'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { registerAction } from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isLogin) {
      // ── LOG IN FLOW ──
      const res = await signIn('credentials', {
        redirect: false,
        username,
        password,
      });

      if (res?.error) {
        setError('Invalid username or password');
        setLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh(); 
      }
    } else {
      // ── REGISTER FLOW ──
      const res = await registerAction(username, password);
      
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        // If registration is successful, immediately log them in
        const signInRes = await signIn('credentials', {
          redirect: false,
          username,
          password,
        });

        if (signInRes?.error) {
           setError('Account created, but failed to automatically log in. Please try logging in manually.');
           setIsLogin(true);
           setLoading(false);
        } else {
           router.push('/dashboard');
           router.refresh();
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-[#0a0a0a]">
      
      {/* ── Left Pane (Editorial Imagery - Desktop Only) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-100 dark:bg-zinc-900">
        <img 
          src="https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=2000" 
          alt="Paris Architecture" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        <div className="absolute bottom-12 left-12 text-white flex items-center gap-3">
          <span className="text-3xl">🍐</span> 
          <span className="font-medium text-2xl tracking-tight">Pear Travel</span>
        </div>
      </div>

      {/* ── Right Pane (Form Container) ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12">
        
        {/* Mobile Brand Header */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <span className="text-2xl">🍐</span>
          <span className="font-medium text-xl tracking-tight text-zinc-900 dark:text-white">
            Pear Travel
          </span>
        </div>

        {/* Greeting */}
        <div className="w-full max-w-sm mb-10">
          <h1 className="text-3xl sm:text-4xl tracking-tight font-medium text-zinc-900 dark:text-white mb-3">
            {isLogin ? 'Welcome back.' : 'Begin your journey.'}
          </h1>
          <p className="text-zinc-500 text-base">
            {isLogin ? 'Sign in to manage your itineraries.' : 'Create an account to curate your travels.'}
          </p>
        </div>

        {/* Toggle Tabs */}
        <div className="flex bg-zinc-50 dark:bg-zinc-900/50 p-1 rounded-2xl mb-10 w-full max-w-sm">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 text-sm rounded-xl transition-all ${
              isLogin 
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium' 
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 text-sm rounded-xl transition-all ${
              !isLogin 
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium' 
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isLogin ? "Enter your username" : "Choose a username"}
              className="w-full bg-transparent border-b-2 border-zinc-200 focus:border-zinc-900 dark:border-zinc-800 dark:focus:border-white text-base placeholder:text-zinc-400 outline-none py-3 transition-colors rounded-none mb-6 text-zinc-900 dark:text-white"
              required
              minLength={isLogin ? 1 : 3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent border-b-2 border-zinc-200 focus:border-zinc-900 dark:border-zinc-800 dark:focus:border-white text-base placeholder:text-zinc-400 outline-none py-3 transition-colors rounded-none mb-6 text-zinc-900 dark:text-white"
              required
              minLength={isLogin ? 1 : 6}
            />
            {!isLogin && (
              <p className="text-xs text-zinc-500 mb-6">Must be at least 6 characters long.</p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-2xl mb-6">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 py-4 rounded-full font-medium text-base transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

      </div>
    </div>
  );
}