'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAllUserDocuments, deleteDocument } from '@/app/actions/documents';
import { changePassword } from '@/app/actions/auth';
import { updateBaseCurrency, updatePersonalDetails } from '@/app/actions/profile';
import { getAllUsers, adminCreateUser, adminDeleteUser } from '@/app/actions/admin';
import { useTripStore } from '@/store/tripStore';
import { useProfileStore } from '@/store/profileStore';
import type { AestheticPreference } from '@/types';
import type { DailyPacing, TransportPreference, DiningStyle } from '@/store/profileStore';
import Link from 'next/link';
import { preloadThemes } from '@/app/itinerary/[id]/ItineraryPageClient';
import { DisplayModeToggle } from '@/components/shared/DisplayModeToggle';

type Tab = 'account' | 'appearance' | 'files' | 'profile' | 'team';

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

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed mt-1 mb-4">{children}</p>;
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
  const { dailyPacing, transportPreference, diningStyle, idealStartTime, baseCurrency, updateProfile } = useProfileStore();

  // Team management state
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('USER');
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserSuccess, setCreateUserSuccess] = useState(false);

  // Personal Details State
  const [personalName, setPersonalName] = useState(session?.user?.name || '');
  const [personalEmail, setPersonalEmail] = useState(session?.user?.email || '');
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [personalSuccess, setPersonalSuccess] = useState<string | null>(null);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Initialize from session when available
  useEffect(() => {
    if (session?.user) {
      setPersonalName(session.user.name || '');
      setPersonalEmail(session.user.email || '');
    }
  }, [session]);

  const handlePersonalDetailsChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalError(null);
    setPersonalSuccess(null);
    setIsSavingPersonal(true);
    
    try {
      await updatePersonalDetails({ name: personalName, email: personalEmail });
      setPersonalSuccess('Personal details updated successfully.');
      setTimeout(() => setPersonalSuccess(null), 2000);
    } catch (error: any) {
      setPersonalError(error.message || 'Failed to update personal details.');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const isAdmin = session?.user?.role === 'ADMIN';

  const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value;
    updateProfile({ baseCurrency: newCurrency });
    await updateBaseCurrency(newCurrency);
  };

  const themes: { id: AestheticPreference; name: string; desc: string; icon: string; status: 'active' | 'coming_soon' }[] = [
    { id: 'CLASSIC', name: 'The Classic', desc: 'Data-dense, functional card layout.', icon: '📋', status: 'active' },
    { id: 'EDITORIAL', name: 'The Editorial', desc: 'Magazine-style luxury reading.', icon: '📖', status: 'active' },
    { id: 'NOTEBOOK', name: 'Field Notes', desc: 'Tactile, analogue journal.', icon: '📓', status: 'active' },
    { id: 'TERMINAL', name: 'Terminal', desc: 'CLI-inspired departure board.', icon: '📟', status: 'active' },
    { id: 'CONCIERGE', name: 'Concierge', desc: 'Minimalist architectural luxury.', icon: '🛎️', status: 'coming_soon' },
  ];

  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: 'account', label: 'Account' },
    { id: 'profile', label: 'Travel Profile' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'files', label: 'Files' },
    { id: 'team', label: 'Team', adminOnly: true },
  ];

  // Filter tabs based on admin status
  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  useEffect(() => {
    if (activeTab === 'files' && session?.user?.username) {
      setIsLoadingDocs(true);
      fetchAllUserDocuments(session.user.username).then(setDocuments).finally(() => setIsLoadingDocs(false));
    }
  }, [activeTab, session?.user?.username]);

  // Load users when Team tab becomes active
  useEffect(() => {
    if (activeTab === 'team' && isAdmin) {
      setIsLoadingUsers(true);
      setUsersError(null);
      getAllUsers()
        .then(setUsers)
        .catch((error) => {
          if (error.message === 'Forbidden') {
            setUsersError('Admin access required');
          } else {
            setUsersError(error.message || 'Failed to load users');
          }
        })
        .finally(() => setIsLoadingUsers(false));
    }
  }, [activeTab, isAdmin]);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    setCreateUserSuccess(false);

    if (!newUserName || !newUserUsername || !newUserPassword) {
      setCreateUserError('All fields are required');
      return;
    }

    setIsCreatingUser(true);
    try {
      const response = await adminCreateUser({
        name: newUserName,
        username: newUserUsername,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      });
      
      if (!response.success) {
        setCreateUserError(response.error || 'Failed to create user');
        setIsCreatingUser(false);
        return;
      }
      
      setCreateUserSuccess(true);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('USER');
      
      // Refresh user list
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      
      setTimeout(() => {
        setShowCreateForm(false);
        setCreateUserSuccess(false);
      }, 2000);
    } catch (error: any) {
      setCreateUserError(error.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return;
    
    try {
      await adminDeleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (error: any) {
      alert(error.message || 'Failed to delete user');
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalStorageBytes = documents.reduce((sum, doc) => sum + (doc.sizeBytes || 0), 0);
  const fade = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.2, ease: 'easeOut' as const } };
  const resetPw = () => { setIsChangingPassword(false); setPasswordError(null); setPasswordSuccess(null); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); };
  const inputCls = "w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 px-0 py-2 border-b border-slate-200 dark:border-slate-800 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-colors placeholder:text-slate-300";

  return (
    <div className="min-h-screen font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800/60 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <Link href={currentTripId ? `/itinerary/${currentTripId}` : '/dashboard'} className="text-xs tracking-wide text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-3 inline-flex items-center gap-1.5">
            <span>←</span><span>{currentTripId ? 'Back to trip' : 'Back to dashboard'}</span>
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Settings</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto min-h-[600px]">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar — vertical on desktop, horizontal scroll on mobile */}
          <nav className="shrink-0 md:w-64 md:border-r border-b md:border-b-0 border-slate-200 dark:border-slate-800/60">
            {/* Mobile: horizontal scrolling tabs */}
            <div className="flex md:hidden gap-1 overflow-x-auto hide-scrollbar px-6 py-3">
              {visibleTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                    activeTab === t.id
                      ? 'text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Desktop: vertical sidebar */}
            <div className="hidden md:flex flex-col gap-0.5 p-4">
              {visibleTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === t.id
                      ? 'text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content area */}
          <main className="flex-1 px-6 md:px-10 py-8 md:py-10">
            <AnimatePresence mode="wait">
              {/* ─── Account ─── */}
              {activeTab === 'account' && (
                <motion.div key="account" {...fade} className="space-y-10 max-w-xl">
                  <section>
                    <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Personal Details</h2>
                    <form onSubmit={handlePersonalDetailsChange} className="space-y-5 max-w-sm">
                      <div>
                        <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Name</label>
                        <input type="text" value={personalName} onChange={(e) => setPersonalName(e.target.value)} className={inputCls} placeholder="Your name" />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
                        <input type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} className={inputCls} placeholder="your@email.com" />
                      </div>
                      {personalError && <p className="text-xs text-red-500 font-medium">{personalError}</p>}
                      {personalSuccess && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{personalSuccess}</p>}
                      <div className="pt-1">
                        <button type="submit" disabled={isSavingPersonal} className="text-sm font-medium text-slate-900 dark:text-slate-100 px-5 py-2 rounded-full border border-slate-900 dark:border-slate-100 hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 transition-all disabled:opacity-40">
                          {isSavingPersonal ? 'Saving…' : 'Save Details'}
                        </button>
                      </div>
                    </form>
                  </section>
                  <Divider />
                  <section>
                    <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Account</h2>
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

              {/* ─── Travel Profile ─── */}
              {activeTab === 'profile' && (
                <motion.div key="profile" {...fade} className="space-y-10 max-w-xl">
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">These preferences shape how our AI builds your itineraries. Adjust them anytime to customise your experience.</p>

                  {/* Daily Pacing */}
                  <section>
                    <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Daily Pacing</h2>
                    <HelperText>Determines how aggressively the AI schedules activities and downtime.</HelperText>
                    <div className="space-y-2">
                      <OptCard on={dailyPacing === 'relaxed'} click={() => updateProfile({ dailyPacing: 'relaxed' })} label="Relaxed" desc="One anchor activity per day with plenty of free time to wander." />
                      <OptCard on={dailyPacing === 'moderate'} click={() => updateProfile({ dailyPacing: 'moderate' })} label="Moderate" desc="2–3 activities with comfortable breathing room between each." />
                      <OptCard on={dailyPacing === 'intensive'} click={() => updateProfile({ dailyPacing: 'intensive' })} label="Intensive" desc="Packed days, maximise every hour. 5+ activities scheduled." />
                    </div>
                  </section>
                  <Divider />

                  {/* Transport Preference */}
                  <section>
                    <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Transport Preference</h2>
                    <HelperText>Instructs the AI on acceptable transit distances and preferred transport modes.</HelperText>
                    <div className="space-y-2">
                      <OptCard on={transportPreference === 'walk'} click={() => updateProfile({ transportPreference: 'walk' })} label="Walk Everywhere" desc="10k+ steps a day. The city is best explored on foot." />
                      <OptCard on={transportPreference === 'public-transport'} click={() => updateProfile({ transportPreference: 'public-transport' })} label="Public Transport" desc="Metro, bus, tram — travel like a local for longer distances." />
                      <OptCard on={transportPreference === 'private'} click={() => updateProfile({ transportPreference: 'private' })} label="Private" desc="Taxis and rideshares. Minimise friction between destinations." />
                    </div>
                  </section>
                  <Divider />

                  {/* Dining Style */}
                  <section>
                    <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Dining Style</h2>
                    <HelperText>Determines if days are built around restaurant reservations or if food is fitted around activities.</HelperText>
                    <div className="flex gap-2">
                      <TglCard on={diningStyle === 'gastronomy'} click={() => updateProfile({ diningStyle: 'gastronomy' })} label="Gastronomy Focus" desc="Build days around reservations and culinary experiences." />
                      <TglCard on={diningStyle === 'convenience'} click={() => updateProfile({ diningStyle: 'convenience' })} label="Convenience" desc="Quick casual bites fitted around the schedule." />
                    </div>
                  </section>
                  <Divider />

                  {/* Ideal Start Time */}
                  <section>
                    <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Ideal Start Time</h2>
                    <HelperText>The earliest time you want your first scheduled activity to begin.</HelperText>
                    <select
                      value={idealStartTime}
                      onChange={(e) => updateProfile({ idealStartTime: e.target.value })}
                      className="bg-transparent text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-colors appearance-none cursor-pointer min-w-[160px]"
                    >
                      <option value="07:00">07:00</option>
                      <option value="07:30">07:30</option>
                      <option value="08:00">08:00</option>
                      <option value="08:30">08:30</option>
                      <option value="09:00">09:00</option>
                      <option value="09:30">09:30</option>
                      <option value="10:00">10:00</option>
                      <option value="10:30">10:30</option>
                      <option value="11:00">11:00</option>
                      <option value="11:30">11:30</option>
                      <option value="12:00">12:00</option>
                    </select>
                  </section>
                  <Divider />

                  {/* Regional Preferences */}
                  <section>
                    <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Regional Preferences</h2>
                    <HelperText>Your home currency for calculating total trip costs.</HelperText>
                    <div className="relative max-w-[200px]">
                      <select
                        value={baseCurrency}
                        onChange={handleCurrencyChange}
                        className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="GBP">🇬🇧 GBP (£)</option>
                        <option value="USD">🇺🇸 USD ($)</option>
                        <option value="EUR">🇪🇺 EUR (€)</option>
                        <option value="AUD">🇦🇺 AUD (A$)</option>
                        <option value="CAD">🇨🇦 CAD (C$)</option>
                        <option value="JPY">🇯🇵 JPY (¥)</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}

              {/* ─── Appearance ─── */}
              {activeTab === 'appearance' && (
                <motion.div key="appearance" {...fade} className="space-y-10 max-w-xl">
                  <section>
                    <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Structural Layout</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Choose how your itineraries are presented.</p>
                    <div className="space-y-2">
                      {themes.map((theme) => (
                        <button key={theme.id} disabled={theme.status === 'coming_soon'} onClick={() => setAestheticPreference(theme.id)} onMouseEnter={() => {
                          const preloadMap: Record<string, () => Promise<any>> = {
                            CLASSIC: preloadThemes.default,
                            EDITORIAL: preloadThemes.editorial,
                            NOTEBOOK: preloadThemes.notebook,
                            TERMINAL: preloadThemes.terminal,
                          };
                          if (preloadMap[theme.id]) {
                            preloadMap[theme.id]();
                          }
                        }} className={`w-full text-left px-5 py-4 rounded-lg border transition-all duration-200 flex items-center gap-4 ${aestheticPreference === theme.id ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/50' : theme.status === 'coming_soon' ? 'border-slate-100 dark:border-slate-800/50 opacity-40 cursor-not-allowed' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
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
                    <div className="mb-8">
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">Display Mode</h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Controls light and dark appearance across the entire app.</p>
                      <DisplayModeToggle />
                    </div>
                  </section>
                  <Divider />
                  <section>
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Destination-Adaptive Colours</h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-sm">Shift the accent palette to match your destination. Disable for default Emerald.</p>
                      </div>
                      <button onClick={toggleDynamicColors} className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors duration-200 shrink-0 mt-0.5 ${useDynamicColors ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${useDynamicColors ? 'translate-x-5 bg-white dark:bg-slate-900' : 'translate-x-1 bg-white dark:bg-slate-400'}`} />
                      </button>
                    </div>
                  </section>
                </motion.div>
              )}

              {/* ─── Files ─── */}
              {activeTab === 'files' && (
                <motion.div key="files" {...fade} className="space-y-6 max-w-2xl">
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

              {/* ─── Team ─── */}
              {activeTab === 'team' && (
                <motion.div key="team" {...fade} className="space-y-8 max-w-2xl">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">User Management</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage user accounts and access permissions.</p>
                  </div>

                  {usersError ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-red-500 dark:text-red-400">{usersError}</p>
                    </div>
                  ) : (
                    <>
                      {/* Create User Form */}
                      {!showCreateForm ? (
                        <button
                          onClick={() => setShowCreateForm(true)}
                          className="text-sm font-medium text-slate-900 dark:text-slate-100 px-4 py-2 rounded-lg border border-slate-900 dark:border-slate-100 hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 transition-all"
                        >
                          + Create User
                        </button>
                      ) : (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Create New User</h3>
                            <button
                              onClick={() => {
                                setShowCreateForm(false);
                                setCreateUserError(null);
                                setNewUserName('');
                                setNewUserUsername('');
                                setNewUserEmail('');
                                setNewUserPassword('');
                                setNewUserRole('USER');
                              }}
                              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                          <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Name</label>
                              <input
                                type="text"
                                value={newUserName}
                                onChange={(e) => { setNewUserName(e.target.value); setCreateUserError(null); }}
                                required
                                className={inputCls}
                                placeholder="Full name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Username</label>
                              <input
                                type="text"
                                value={newUserUsername}
                                onChange={(e) => { setNewUserUsername(e.target.value); setCreateUserError(null); }}
                                required
                                className={inputCls}
                                placeholder="username"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
                              <input
                                type="email"
                                value={newUserEmail}
                                onChange={(e) => { setNewUserEmail(e.target.value); setCreateUserError(null); }}
                                className={inputCls}
                                placeholder="user@email.com"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Temporary Password</label>
                              <input
                                type="password"
                                value={newUserPassword}
                                onChange={(e) => { setNewUserPassword(e.target.value); setCreateUserError(null); }}
                                required
                                className={inputCls}
                                placeholder="••••••••"
                              />
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">
                                Share this temporary password securely — it will not be shown again after you close this form.
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Role</label>
                              <select
                                value={newUserRole}
                                onChange={(e) => { setNewUserRole(e.target.value); setCreateUserError(null); }}
                                className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-colors appearance-none cursor-pointer"
                              >
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            </div>
                            {createUserError && <p className="text-xs text-red-500 font-medium">{createUserError}</p>}
                            {createUserSuccess && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">User created successfully!</p>}
                            <button
                              type="submit"
                              disabled={isCreatingUser}
                              className="text-sm font-medium text-slate-900 dark:text-slate-100 px-5 py-2 rounded-full border border-slate-900 dark:border-slate-100 hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 transition-all disabled:opacity-40"
                            >
                              {isCreatingUser ? 'Creating…' : 'Create User'}
                            </button>
                          </form>
                        </div>
                      )}

                      <Divider />

                      {/* Users table */}
                      {isLoadingUsers ? (
                        <div className="py-16 text-center text-sm text-slate-400 animate-pulse">Loading users…</div>
                      ) : users.length === 0 ? (
                        <div className="py-20 text-center">
                          <p className="text-sm text-slate-400">No users found.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">Name</th>
                                <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">Username</th>
                                <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">Email</th>
                                <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">Role</th>
                                <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">Joined</th>
                                <th className="text-left py-3 text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                              {users.map((user) => (
                                <tr key={user.id} className="group">
                                  <td className="py-3.5 pr-6 text-slate-900 dark:text-slate-100 font-medium">{user.name || 'N/A'}</td>
                                  <td className="py-3.5 pr-6 text-slate-500 dark:text-slate-400 font-mono text-xs">{user.username}</td>
                                  <td className="py-3.5 pr-6 text-slate-500 dark:text-slate-400 text-xs">{user.email || 'N/A'}</td>
                                  <td className="py-3.5 pr-6">
                                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
                                      user.role === 'ADMIN'
                                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}>
                                      {user.role}
                                    </span>
                                  </td>
                                  <td className="py-3.5 pr-6 text-slate-500 dark:text-slate-400 text-xs tabular-nums">
                                    {format(new Date(user.createdAt), 'dd MMM yyyy')}
                                  </td>
                                  <td className="py-3.5">
                                    <button
                                      onClick={() => handleDeleteUser(user.id, user.name || user.username)}
                                      className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}