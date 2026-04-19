'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getCollaborators, addCollaborator, removeCollaborator } from '@/app/actions/collaborators';

// eslint-disable-next-line @next/next/no-server-actions-in-client-components
export default function CollaboratorsModal({ 
  tripId, 
  isOpen, 
  onClose 
}: { 
  tripId: string; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [owner, setOwner] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUsers = async () => {
    const data = await getCollaborators(tripId);
    if (data) {
      setOwner(data.owner);
      setCollaborators(data.collaborators);
    }
  };

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen, tripId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    const result = await addCollaborator(tripId, newUsername.trim());
    
    if (result.error) {
      setError(result.error);
    } else {
      setNewUsername('');
      await fetchUsers();
    }
    setIsLoading(false);
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator? They will lose access immediately.')) return;
    await removeCollaborator(tripId, userId);
    await fetchUsers();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg !bg-white dark:!bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 !text-slate-900 dark:!text-white">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black !text-slate-900 dark:!text-white">Manage Access</h2>
            <p className="text-sm font-medium !text-slate-500">Invite friends to view and edit this trip.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full !bg-slate-100 dark:!bg-slate-800 hover:!bg-slate-200 !text-slate-500 transition-colors">✕</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          <form onSubmit={handleAdd} className="mb-8">
            <label className="block text-[10px] font-bold !text-slate-500 uppercase tracking-widest mb-2">Invite by Username</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. sarah_travels"
                className="flex-1 px-4 py-3 !bg-slate-50 dark:!bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-medium !text-slate-900 dark:!text-white"
              />
              <button 
                type="submit" 
                disabled={isLoading}
                className="px-6 py-3 !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-md disabled:opacity-50"
              >
                {isLoading ? '...' : 'Invite'}
              </button>
            </div>
            {error && <p className="text-xs font-bold text-red-500 mt-2">{error}</p>}
          </form>

          <div>
            <h3 className="text-[10px] font-bold !text-slate-500 uppercase tracking-widest mb-3">Who has access</h3>
            <div className="flex flex-col gap-3">
              
              {owner && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 !bg-slate-50 dark:!bg-slate-950/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full !bg-brand-100 !text-brand-700 flex items-center justify-center font-bold text-sm">
                      {owner.name?.charAt(0) || owner.username.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold !text-slate-900 dark:!text-white leading-tight">{owner.name || owner.username}</p>
                      <p className="text-xs !text-slate-500">@{owner.username}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest !text-slate-400 !bg-slate-200 dark:!bg-slate-800 px-2 py-1 rounded-md">Owner</span>
                </div>
              )}

              {collaborators.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 !bg-white dark:!bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full !bg-slate-200 dark:!bg-slate-800 !text-slate-600 dark:!text-slate-300 flex items-center justify-center font-bold text-sm">
                      {user.name?.charAt(0) || user.username.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold !text-slate-900 dark:!text-white leading-tight">{user.name || user.username}</p>
                      <p className="text-xs !text-slate-500">@{user.username}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemove(user.id)}
                    className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {collaborators.length === 0 && (
                <p className="text-sm !text-slate-500 italic py-2">No collaborators added yet.</p>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}