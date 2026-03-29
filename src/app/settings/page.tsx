'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-slate-100 tracking-tight">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-bold">
            Account
          </button>
          <button className="w-full text-left px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-sm">
            Files & Storage
          </button>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">User Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Username</label>
                <div className="text-slate-900 dark:text-slate-100 font-mono bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {session?.user?.username || 'Loading...'}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">Security</h2>
            <button className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 text-sm">
              Change Password
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 italic">
              Password change functionality will be wired in the next step.
            </p>
          </section>

          <section className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <button 
              onClick={handleLogout}
              className="px-8 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-900/30"
            >
              Log Out
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}