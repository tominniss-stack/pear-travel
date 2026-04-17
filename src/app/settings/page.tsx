'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAllUserDocuments, deleteDocument } from '@/app/actions/documents';
import { changePassword } from '@/app/actions/auth';
import { useTripStore } from '@/store/tripStore';
import type { AestheticPreference } from '@/types';
import Link from 'next/link';

type Tab = 'account' | 'appearance' | 'files' | 'profile';
type DailyPacing = 'relentless' | 'balanced' | 'slow';
type TransitTolerance = 'walk' | 'transit' | 'rideshare';
type CulinaryPriority = 'food-first' | 'fuel-and-go';
type CircadianRhythm = 'early-bird' | 'night-owl';

const Divider = () => <div className="border-t border-slate-200 dark:border-slate-800/60" />;

function OptCard({ on, click, label, desc }: { on: boolean; click: () => void; label: string; desc: string }) {
  return (
    <button onClick={click} className={`group text-left w-full px-5 py-4 rounded-lg border transition-all duration-200 ${on ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/50' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className={`block text-sm font-medium ${on ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>{label}</span>
          <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{desc}</span>
        </div>
        <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${on ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100' : 'border-slate-300 dark:border-slate-600'}`}>
          {on && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900" />}
        </div>
      </div>
    </button>
  );
}

function TglCard({ on, click, label, desc }: { on: boolean; click: () => void; label: string; desc: string }) {
  return (
    <button onClick={click} className={`group text-left flex-1 min-w-0 px-5 py-4 rounded-lg border transition-all duration-200 ${on ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/50' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
      <span className={`block text-sm font-medium ${on ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>{label}</span>
      <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{desc}</span>
    </button>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const { aestheticPreference, setAestheticPreference, useDynamicColors, toggleDynamicColors, currentTripId } = useTripStore();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [dailyPacing, setDailyPacing] = useState<DailyPacing>('balanced');
  const [transitTolerance, setTransitTolerance] = useState<TransitTolerance>('transit');
  const [culinaryPriority, setCulinaryPriority] = useState<CulinaryPriority>('food-first');
  const [circadianRhythm, setCircadianRhythm] = useState<CircadianRhythm>('early-bird');

  const themes: { id: AestheticPreference; name: string; desc: string; icon: string; status: 'active' | 'coming_soon' }[] = [
    { id: 'CLASSIC', name: 'The Classic', desc: 'Data-dense, functional card layout.', icon: '📋', status: 'active' },
    { id: 'EDITORIAL', name: 'The Editorial', desc: 'Magazine-style luxury reading.', icon: '📖', status: 'active' },
    { id: 'NOTEBOOK', name: 'Field Notes', desc: 'Tactile, analogue journal.', icon: '📓', status: 'active' },
    { id: 'TERMINAL', name: 'Terminal', desc: 'CLI-inspired departure board.', icon: '📟', status: 'active' },
    { id: 'CONCIERGE', name: 'Concierge', desc: 'Minimalist architectural luxury.', icon: '🛎️', status: 'coming_soon' },
  ];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'account', label: 'Account' },
    { id: 'profile', label: 'Travel Profile' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'files', label: 'Files' },
  ];

  useEffect(() => {
    if (activeTab === 'files' && session?.user?.username) {
      setIsLoadingDocs(true);
      fetchAllUserDocuments(session.user.username).then(setDocuments).finally(() => setIsLoadingDocs(false));
    }
  }, [activeTab, session?.user?.username]);

  const handleLogout = () => { signOut({ callbackUrl: '/login' }); };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to permanently delete this file? This will remove it from your ledger.')) return;
    setIsDeletingId(docId);
    const result = await deleteDocument(docId);
    if (result.success) { setDocuments(docs => docs.filter(d => d.id !== docId)); }
    setIsDeletingId(null);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    if (newPassword.length < 6) { setPasswordError('New password must be at least 6 characters.'); return; }
    setIsSavingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsSavingPassword(false);
    if (result.success) {
      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => { setIsChangingPassword(false); setPasswordSuccess(null); }, 2000);
    } else { setPasswordError(result.error || 'Failed to update password.'); }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalStorageBytes = documents.reduce((sum, doc) => sum + (doc.sizeBytes || 0), 0);
  const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.25, ease: 'easeOut' as const } };
  const resetPw = () => { setIsChangingPassword(false); setPasswordError(null); setPasswordSuccess(null); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); };
  const inputCls = "w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 px-0 py-2 border-b border-slate-200 dark:border-slate-800 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-colors placeholder:text-slate-300";

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 font-sans">
      <div className="mb-12">
        <Link href={currentTripId ? `/itinerary/${currentTripId}` : '/dashboard'} className="text-xs tracking-wide text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-6 inline-flex items-center gap-1.5">
          <span>←</span><span>{currentTripId ? 'Back to trip' : 'Back to dashboard'}</span>
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Settings</h1>
      </div>

      <nav className="flex gap-1 mb-12 overflow-x-auto hide-scrollbar -mx-1 px-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${activeTab === t.id ? 'text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        {activeTab === 'account' && (
          <motion.div key="account" {...fade} className="space-y-10">
            <section>
              <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Profile</h2>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Username</label>
              <div className="text-slate-900 dark:text-slate-100 font-mono text-sm bg-transparent px-0 py-2 border-b border-slate-200 dark:border-slate-800">{session?.user?.username || 'Loading...'}</div>
            </section>
            <Divider />
            <section>
              <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Security</h2>
              {!isChangingPassword ? (
                <button onClick={() => setIsChangingPassword(true)} className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-300 transition-colors underline underline-offset-4 decoration-slate-300 dark:decoration-slate-700 hover:decoration-slate-500">Change password</button>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-5 max-w-sm">
                  <div><label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Current password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputCls} placeholder="••••••••" /></div>
                  <div><label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">New password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={inputCls} placeholder="••••••••" /></div>
                  <div><label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Confirm new password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputCls} placeholder="••••••••" /></div>
                  {passwordError && <p className="text-xs text-red-500 font-medium">{passwordError}</p>}
                  {passwordSuccess && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{passwordSuccess}</p>}
                  <div className="flex items-center gap-4 pt-1">
                    <button type="submit" disabled={isSavingPassword} className="text-sm font-medium text-slate-900 dark:text-slate-100 px-5 py-2 rounded-full border border-slate-900 dark:border-slate-100 hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 transition-all disabled:opacity-40">{isSavingPassword ? 'Saving…' : 'Update password'}</button>
                    <button type="button" onClick={resetPw} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Cancel</button>
                  </div>
                </form>
              )}
            </section>
            <Divider />
            <section><button onClick={handleLogout} className="text-sm font-medium text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Log out</button></section>
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div key="profile" {...fade} className="space-y-10">
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">These preferences shape how our AI builds your itineraries. Adjust them anytime.</p>
            <section>
              <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Daily Pacing</h2>
              <div className="space-y-2">
                <OptCard on={dailyPacing === 'relentless'} click={() => setDailyPacing('relentless')} label="Relentless" desc="Packed days, see everything. 5+ activities per day." />
                <OptCard on={dailyPacing === 'balanced'} click={() => setDailyPacing('balanced')} label="Balanced" desc="2–3 anchored activities with breathing room." />
                <OptCard on={dailyPacing === 'slow'} click={() => setDailyPacing('slow')} label="Slow Travel" desc="One activity, lots of wandering. Let the city come to you." />
              </div>
            </section>
            <Divider />
            <section>
              <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Transit Tolerance</h2>
              <div className="space-y-2">
                <OptCard on={transitTolerance === 'walk'} click={() => setTransitTolerance('walk')} label="Walk Everywhere" desc="10k+ steps a day. The city is best on foot." />
                <OptCard on={transitTolerance === 'transit'} click={() => setTransitTolerance('transit')} label="Public Transit Local" desc="Metro, bus, tram — travel like a local." />
                <OptCard on={transitTolerance === 'rideshare'} click={() => setTransitTolerance('rideshare')} label="Point-to-Point" desc="Taxis and rideshares. Minimize friction." />
              </div>
            </section>
            <Divider />
            <section>
              <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Culinary Priority</h2>
              <div className="flex gap-2">
                <TglCard on={culinaryPriority === 'food-first'} click={() => setCulinaryPriority('food-first')} label="Food is the Priority" desc="Build days around reservations." />
                <TglCard on={culinaryPriority === 'fuel-and-go'} click={() => setCulinaryPriority('fuel-and-go')} label="Fuel & Go" desc="Quick casual bites, keep moving." />
              </div>
            </section>
            <Divider />
            <section>
              <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Circadian Rhythm</h2>
              <div className="flex gap-2">
                <TglCard on={circadianRhythm === 'early-bird'} click={() => setCircadianRhythm('early-bird')} label="Early Bird" desc="Start at 8 AM, catch the light." />
                <TglCard on={circadianRhythm === 'night-owl'} click={() => setCircadianRhythm('night-owl')} label="Night Owl" desc="Nothing before 11 AM. Evenings are yours." />
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'appearance' && (
          <motion.div key="appearance" {...fade} className="space-y-10">
            <section>
              <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Structural Layout</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Choose how your itineraries are presented.</p>
              <div className="space-y-2">
                {themes.map((theme) => (
                  <button key={theme.id} disabled={theme.status === 'coming_soon'} onClick={() => setAestheticPreference(theme.id)} className={`w-full text-left px-5 py-4 rounded-lg border transition-all duration-200 flex items-center gap-4 ${aestheticPreference === theme.id ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/50' : theme.status === 'coming_soon' ? 'border-slate-100 dark:border-slate-800/50 opacity-40 cursor-not-allowed' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                    <span className="text-xl shrink-0">{theme.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${aestheticPreference === theme.id ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>{theme.name}</span>
                        {theme.status === 'coming_soon' && <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-600">Soon</span>}
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{theme.desc}</span>
                    </div>
                    {aestheticPreference === theme.id && (
                      <div className="shrink-0 w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-100 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white dark:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
            <Divider />
            <section>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Destination-Adaptive Colors</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-sm">Shift the accent palette to match your destination. Disable for default Emerald.</p>
                </div>
                <button onClick={toggleDynamicColors} className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors duration-200 shrink-0 mt-0.5 ${useDynamicColors ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${useDynamicColors ? 'translate-x-5 bg-white dark:bg-slate-900' : 'translate-x-1 bg-white dark:bg-slate-400'}`} />
                </button>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'files' && (
          <motion.div key="files" {...fade} className="space-y-6">
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Receipts &amp; Documents</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Files attached to your trips.</p>
              </div>
              <div className="text-right flex items-baseline gap-3">
                <span className="text-xs text-slate-400 tabular-nums">{formatSize(totalStorageBytes)}</span>
                <span className="text-sm font-mono text-slate-900 dark:text-slate-100 tabular-nums">{documents.length} {documents.length === 1 ? 'file' : 'files'}</span>
              </div>
            </div>
            <Divider />
            {isLoadingDocs ? (
              <div className="py-16 text-center text-sm text-slate-400 animate-pulse">Loading files…</div>
            ) : documents.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-sm text-slate-400 mb-1">No files yet.</p>
                <p className="text-xs text-slate-300 dark:text-slate-600">Upload receipts from your Ledger or Itinerary.</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800/60">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-4 py-4 group">
                    <span className="text-lg text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors shrink-0">
                      {doc.mimeType?.includes('pdf') ? '📄' : '🖼️'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-300 truncate block transition-colors">{doc.fileName}</a>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 truncate">{doc.tripDestination}</span>
                        <span className="text-slate-200 dark:text-slate-700">·</span>
                        <span className="text-xs text-slate-400 tabular-nums">{format(new Date(doc.uploadedAt), 'dd MMM yyyy')}</span>
                        <span className="text-slate-200 dark:text-slate-700">·</span>
                        <span className="text-xs text-slate-400 tabular-nums">{formatSize(doc.sizeBytes)}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(doc.id)} disabled={isDeletingId === doc.id} className="shrink-0 text-xs text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40" title="Delete file">
                      {isDeletingId === doc.id ? '…' : '✕'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}