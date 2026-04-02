'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { fetchAllUserDocuments, deleteDocument } from '@/app/actions/documents';
import { useTripStore } from '@/store/tripStore';
import type { AestheticPreference } from '@/types';
import Link from 'next/link';

type Tab = 'account' | 'appearance' | 'files';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('account');
  
  // Storage State
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Appearance State
  const { aestheticPreference, setAestheticPreference, useDynamicColors, toggleDynamicColors, currentTripId } = useTripStore();

  const themes: { id: AestheticPreference; name: string; desc: string; icon: string; status: 'active' | 'coming_soon' }[] = [
    { id: 'CLASSIC', name: 'The Classic', desc: 'Data-dense, highly functional card-based layout.', icon: '📋', status: 'active' },
    { id: 'EDITORIAL', name: 'The Editorial', desc: 'A curated, magazine-style luxury reading experience.', icon: '📖', status: 'active' },
    // ── FIX: Changed status to 'active' so the button is clickable ──
    { id: 'NOTEBOOK', name: 'Field Notes', desc: 'Tactile, analogue journal aesthetics.', icon: '📓', status: 'active' },
    { id: 'TERMINAL', name: 'Terminal', desc: 'CLI-inspired green-on-black departure board.', icon: '📟', status: 'coming_soon' },
    { id: 'CONCIERGE', name: 'Concierge', desc: 'Ultra-minimalist architectural luxury.', icon: '🛎️', status: 'coming_soon' },
  ];

  // Load documents safely when switching to the tab
  useEffect(() => {
    if (activeTab === 'files' && session?.user?.username) {
      setIsLoadingDocs(true);
      fetchAllUserDocuments(session.user.username)
        .then(setDocuments)
        .finally(() => setIsLoadingDocs(false));
    }
  }, [activeTab, session?.user?.username]);

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to permanently delete this file? This will remove it from your ledger.')) return;
    
    setIsDeletingId(docId);
    const result = await deleteDocument(docId);
    if (result.success) {
      setDocuments(docs => docs.filter(d => d.id !== docId));
    }
    setIsDeletingId(null);
  };

  // Helper to format bytes to MB/KB
  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalStorageBytes = documents.reduce((sum, doc) => sum + (doc.sizeBytes || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 animate-in fade-in duration-500 font-sans">
      <div className="mb-8">
        <Link 
          href={currentTripId ? `/itinerary/${currentTripId}` : '/dashboard'} 
          className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors mb-4 inline-block"
        >
          ← Back to {currentTripId ? 'Trip' : 'Dashboard'}
        </Link>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Settings</h1>
      </div>
      
      <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
        
        {/* ── Sidebar Navigation ── */}
        <div className="w-full md:w-64 flex flex-row md:flex-col gap-2 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
          <button 
            onClick={() => setActiveTab('account')}
            className={`flex-shrink-0 text-left px-5 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'account' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'}`}
          >
            Account Profile
          </button>
          <button 
            onClick={() => setActiveTab('appearance')}
            className={`flex-shrink-0 text-left px-5 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'appearance' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'}`}
          >
            Appearance
          </button>
          <button 
            onClick={() => setActiveTab('files')}
            className={`flex-shrink-0 text-left px-5 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'files' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'}`}
          >
            Files & Storage
          </button>
        </div>

        {/* ── Main Content Area ── */}
        <div className="flex-1 w-full">
          
          {/* 1. Account Tab (Preserved) */}
          {activeTab === 'account' && (
            <div className="space-y-8 animate-fade-in">
              <section className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">User Profile</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Username</label>
                    <div className="text-slate-900 dark:text-slate-100 font-mono bg-slate-50 dark:bg-slate-950 px-5 py-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      {session?.user?.username || 'Loading...'}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">Security</h2>
                <button className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 text-sm">
                  Change Password
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 font-medium leading-relaxed max-w-md">
                  Password change functionality will be wired securely in the next update.
                </p>
              </section>

              <section className="pt-4">
                <button 
                  onClick={handleLogout}
                  className="px-8 py-3.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold transition-all border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-sm"
                >
                  Log Out Securely
                </button>
              </section>
            </div>
          )}

          {/* 2. Appearance Tab (New) */}
          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-fade-in">
              <section className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">Structural Layout</h2>
                <p className="text-sm text-slate-500 mb-8 max-w-xl">Customize how your travel itineraries look and feel.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      disabled={theme.status === 'coming_soon'}
                      onClick={() => setAestheticPreference(theme.id)}
                      className={`text-left p-6 rounded-2xl border-2 transition-all flex flex-col gap-3 relative overflow-hidden ${
                        aestheticPreference === theme.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md scale-[1.02]'
                          : theme.status === 'coming_soon'
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                      }`}
                    >
                      {theme.status === 'coming_soon' && (
                        <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          Soon
                        </span>
                      )}
                      {aestheticPreference === theme.id && (
                        <span className="absolute top-4 right-4 text-brand-500 text-xl">
                          ✓
                        </span>
                      )}
                      <span className="text-3xl">{theme.icon}</span>
                      <div>
                        <h3 className={`font-bold ${aestheticPreference === theme.id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-900 dark:text-white'}`}>
                          {theme.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{theme.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Dynamic Colors Toggle */}
                <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      🎨 Destination-Adaptive Colors
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
                      Automatically shift the app's accent colors to match the vibe of your destination city. If disabled, Pear Travel will use the default Emerald branding.
                    </p>
                  </div>
                  <button
                    onClick={toggleDynamicColors}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                      useDynamicColors ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        useDynamicColors ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* 3. Files & Storage Tab (Preserved) */}
          {activeTab === 'files' && (
            <div className="space-y-8 animate-fade-in">
              <section className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                
                {/* Storage Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Receipts & Documents</h2>
                    <p className="text-sm font-medium text-slate-500">Manage all physical files attached to your trips.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Usage</span>
                      <span className="block text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatSize(totalStorageBytes)}</span>
                    </div>
                    <div className="bg-brand-50 dark:bg-brand-900/30 px-4 py-2.5 rounded-xl border border-brand-100 dark:border-brand-800/50 text-brand-700 dark:text-brand-400 flex items-center gap-2">
                       <span className="text-xl font-black tabular-nums leading-none">{documents.length}</span>
                       <span className="text-[10px] font-black uppercase tracking-wider">Files</span>
                    </div>
                  </div>
                </div>

                {/* Storage Body */}
                {isLoadingDocs ? (
                  <div className="py-12 text-center text-sm font-bold text-slate-400 animate-pulse">Loading secure vault...</div>
                ) : documents.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center">
                    <span className="text-4xl mb-4 opacity-40">🗄️</span>
                    <p className="text-slate-500 font-bold mb-1">Your vault is empty.</p>
                    <p className="text-xs text-slate-400">Files uploaded to your Ledger or Itinerary will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                          <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-widest text-slate-400">File</th>
                          <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-widest text-slate-400 hidden sm:table-cell">Trip</th>
                          <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-widest text-slate-400 hidden md:table-cell">Date & Size</th>
                          <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-widest text-slate-400 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {documents.map(doc => (
                          <tr key={doc.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-4 px-4 align-middle">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl text-slate-300 dark:text-slate-600 group-hover:text-brand-400 transition-colors">
                                  {doc.mimeType?.includes('pdf') ? '📄' : '🖼️'}
                                </span>
                                <div className="flex flex-col min-w-0">
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 truncate max-w-[150px] sm:max-w-xs transition-colors">
                                    {doc.fileName}
                                  </a>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase sm:hidden mt-0.5 truncate">{doc.tripDestination}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 align-middle hidden sm:table-cell">
                              <span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-black uppercase tracking-wider truncate max-w-[120px]">
                                {doc.tripDestination}
                              </span>
                            </td>
                            <td className="py-4 px-4 align-middle hidden md:table-cell">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {format(new Date(doc.uploadedAt), 'dd MMM yyyy')}
                                </span>
                                <span className="text-[10px] text-slate-400 tabular-nums">{formatSize(doc.sizeBytes)}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 align-middle text-right">
                              <button 
                                onClick={() => handleDelete(doc.id)}
                                disabled={isDeletingId === doc.id}
                                className={`w-8 h-8 inline-flex items-center justify-center rounded-full transition-all ${
                                  isDeletingId === doc.id 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 cursor-pointer shadow-sm'
                                }`}
                                title="Delete file permanently"
                              >
                                {isDeletingId === doc.id ? '...' : '🗑'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}