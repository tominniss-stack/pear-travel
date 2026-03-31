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
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 p-4 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 rounded-3xl shadow-xl dark:shadow-none border border-stone-200 dark:border-stone-800 p-8 sm:p-10 transition-colors duration-200">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-6">
            <span className="text-4xl">🍐</span>
          </div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Pear Travel
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-3 font-medium">
            {isLogin ? 'Sign in to manage your itineraries' : 'Create a new account'}
          </p>
        </div>

        {/* Toggle Tabs */}
        <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl mb-8">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              isLogin 
                ? 'bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-white' 
                : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              !isLogin 
                ? 'bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-white' 
                : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isLogin ? "Enter your username" : "Choose a username"}
              className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-stone-400 dark:placeholder:text-stone-600"
              required
              minLength={isLogin ? 1 : 3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-stone-400 dark:placeholder:text-stone-600"
              required
              minLength={isLogin ? 1 : 6}
            />
            {!isLogin && (
              <p className="text-xs text-stone-500 mt-2 ml-1">Must be at least 6 characters long.</p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl border border-red-100 dark:border-red-500/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-stone-900 dark:bg-emerald-600 text-white py-3.5 rounded-xl font-semibold text-[15px] hover:bg-stone-800 dark:hover:bg-emerald-500 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

      </div>
    </div>
  );
}