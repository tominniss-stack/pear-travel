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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0a0a0a] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 text-zinc-900 dark:text-white">
        
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-white">Manage Access</h2>
            <p className="text-sm font-medium text-zinc-500 mt-2">Invite friends to view and edit this trip.</p>
          </div>
          <button onClick={onClose} className="p-2 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">✕</button>
        </div>

        <div className="overflow-y-auto custom-scrollbar -mx-2 px-2">
          
          <form onSubmit={handleAdd} className="mb-8">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Invite by Username</label>
            <div className="flex items-end gap-4">
              <input 
                type="text" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. sarah_travels"
                className="flex-1 bg-transparent text-base text-zinc-900 dark:text-white px-0 py-3 border-b-2 border-zinc-200 focus:border-zinc-900 dark:border-zinc-800 dark:focus:border-white focus:outline-none transition-colors placeholder:text-zinc-400 rounded-none"
              />
              <button 
                type="submit" 
                disabled={isLoading}
                className="px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-medium transition-transform active:scale-95 disabled:opacity-50 shrink-0 mb-1"
              >
                {isLoading ? '...' : 'Invite'}
              </button>
            </div>
            {error && <p className="text-xs font-bold text-red-500 mt-2">{error}</p>}
          </form>

          <div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Who has access</h3>
            <div className="flex flex-col gap-3">
              
              {owner && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-bold text-sm">
                      {owner.name?.charAt(0) || owner.username.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">{owner.name || owner.username}</p>
                      <p className="text-xs text-zinc-500">@{owner.username}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded-md">Owner</span>
                </div>
              )}

              {collaborators.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-bold text-sm">
                      {user.name?.charAt(0) || user.username.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">{user.name || user.username}</p>
                      <p className="text-xs text-zinc-500">@{user.username}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemove(user.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {collaborators.length === 0 && (
                <p className="text-sm text-zinc-500 italic py-2">No collaborators added yet.</p>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}