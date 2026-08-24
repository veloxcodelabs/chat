import React, { useState } from 'react';
import { X, UserPlus, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onSelectUser: (user: User) => void;
  onCreateUser: (userData: { displayName: string; username: string; avatar: string; bio: string }) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
];

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSelectUser,
  onCreateUser,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newBio, setNewBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim() || !newUsername.trim()) return;

    onCreateUser({
      displayName: newDisplayName.trim(),
      username: newUsername.trim(),
      avatar: selectedAvatar,
      bio: newBio.trim() || 'Media creator',
    });

    setIsCreating(false);
    setNewDisplayName('');
    setNewUsername('');
    setNewBio('');
  };

  if (!isOpen) return null;

  return (
    <div 
      id="user-switcher-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 overflow-hidden"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100">Active Identity</h3>
            <p className="text-xs text-slate-400">
              Switch profile or create a contact to test real-time media sharing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isCreating ? (
          <div className="mt-4 space-y-4">
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
              {users.map((user) => {
                const isSelected = user.id === currentUser.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition border ${
                      isSelected
                        ? 'bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={user.avatar}
                          alt={user.displayName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                            user.status === 'online'
                              ? 'bg-emerald-500'
                              : user.status === 'away'
                              ? 'bg-amber-500'
                              : 'bg-slate-500'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-100">
                            {user.displayName}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">@{user.username}</p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              id="btn-show-create-contact"
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>Create New Persona / Contact</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Choose Profile Avatar
              </label>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                {AVATAR_PRESETS.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt="avatar option"
                    onClick={() => setSelectedAvatar(url)}
                    className={`w-11 h-11 rounded-full object-cover cursor-pointer border-2 transition ${
                      selectedAvatar === url
                        ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/20'
                        : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Display Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Elena Rossi"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Username / Handle
              </label>
              <input
                type="text"
                required
                placeholder="e.g. elena_prod"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Bio / Status (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Digital Producer 🎥"
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                type="submit"
                id="btn-submit-create-persona"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition transform active:scale-95"
              >
                Save & Connect
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
