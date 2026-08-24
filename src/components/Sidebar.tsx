import React, { useState } from 'react';
import { 
  Search, 
  Camera, 
  Image as ImageIcon, 
  Video, 
  Flame, 
  Users, 
  Plus, 
  Lock, 
  CheckCheck, 
  Pin,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  LogIn,
  UserPlus,
  LogOut
} from 'lucide-react';
import { Conversation, User } from '../types';
import { formatTimeAgo } from '../utils/socket';

interface SidebarProps {
  currentUser: User;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conv: Conversation) => void;
  onOpenUserSwitcher: () => void;
  onOpenQuickCamera: () => void;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenUserSwitcher,
  onOpenQuickCamera,
  onOpenAuthModal,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'media' | 'unread'>('all');

  const filteredConversations = conversations.filter((conv) => {
    const otherUser = conv.participants.find((p) => p.id !== currentUser.id) || conv.participants[0];
    const matchesSearch =
      otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.lastMessage?.text && conv.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'media') {
      return conv.lastMessage?.media && conv.lastMessage.media.length > 0;
    }
    if (activeFilter === 'unread') {
      return conv.unreadCount > 0;
    }
    return true;
  });

  return (
    <aside className="w-80 md:w-96 h-full bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 flex flex-col shrink-0">
      {/* Top Auth Bar with Dedicated Login & Registration Buttons */}
      <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[11px] font-semibold text-slate-300 truncate">
            {currentUser.displayName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="btn-sidebar-login"
            onClick={() => onOpenAuthModal('login')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/80 transition cursor-pointer"
            title="Log in with username"
          >
            <LogIn className="w-3.5 h-3.5 text-indigo-400" />
            <span>Log In</span>
          </button>

          <button
            id="btn-sidebar-register"
            onClick={() => onOpenAuthModal('register')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition cursor-pointer"
            title="Create a new account"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
        </div>
      </div>

      {/* Identity & Profile Bar */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div 
          onClick={onOpenUserSwitcher}
          className="flex items-center gap-3 p-1.5 -m-1.5 rounded-2xl hover:bg-slate-800/60 cursor-pointer transition group flex-1 min-w-0"
          title="Click to switch persona or add contact"
        >
          <div className="relative shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.displayName}
              className="w-10 h-10 rounded-full object-cover border border-slate-700 ring-2 ring-transparent group-hover:ring-indigo-500/40 transition"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
                currentUser.status === 'online'
                  ? 'bg-emerald-500'
                  : currentUser.status === 'away'
                  ? 'bg-amber-500'
                  : 'bg-slate-500'
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition truncate">
                {currentUser.displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] shrink-0">Active</span>
              <span>•</span>
              <span className="truncate">@{currentUser.username}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          <button
            id="btn-sidebar-quick-camera"
            onClick={onOpenQuickCamera}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition shadow-xs border border-slate-700/60 cursor-pointer"
            title="Instant Camera / Record Video"
          >
            <Camera className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Brand Header Subtle Tag */}
      <div className="px-5 pt-3 pb-1 flex items-center justify-between">
        <span className="text-base font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
          Prism Media
        </span>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          Direct E2EE
        </span>
      </div>

      {/* Search Input */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search messages, photos, clips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/70 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 transition"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          All Chats
        </button>
        <button
          onClick={() => setActiveFilter('media')}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
            activeFilter === 'media'
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <ImageIcon className="w-3 h-3" />
          <span>Photos & Clips</span>
        </button>
        <button
          onClick={() => setActiveFilter('unread')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
            activeFilter === 'unread'
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Unread
        </button>
      </div>

      {/* Conversation Thread List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 scrollbar-thin">
        {filteredConversations.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <p className="text-xs">No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherUser = conv.participants.find((p) => p.id !== currentUser.id) || conv.participants[0];
            const isSelected = activeConversationId === conv.id;
            const lastMsg = conv.lastMessage;
            const hasMedia = lastMsg?.media && lastMsg.media.length > 0;
            const isLastVideo = hasMedia && lastMsg?.media?.some((m) => m.type === 'video');
            const isLastViewOnce = lastMsg?.isViewOnce || (hasMedia && lastMsg?.media?.some((m) => m.isViewOnce));

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${
                  isSelected
                    ? 'bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border-indigo-500/30 shadow-sm'
                    : 'border-transparent hover:bg-slate-800/50'
                }`}
              >
                {/* Avatar with status */}
                <div className="relative shrink-0">
                  <img
                    src={otherUser.avatar}
                    alt={otherUser.displayName}
                    className="w-12 h-12 rounded-full object-cover border border-slate-700"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                      otherUser.status === 'online'
                        ? 'bg-emerald-500'
                        : otherUser.status === 'away'
                        ? 'bg-amber-500'
                        : 'bg-slate-500'
                    }`}
                  />
                </div>

                {/* Conversation preview info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-sm truncate font-semibold ${
                        isSelected ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {otherUser.displayName}
                    </span>
                    {conv.updatedAt && (
                      <span
                        className={`text-[10px] shrink-0 uppercase ${
                          isSelected ? 'text-indigo-400 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {formatTimeAgo(conv.updatedAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                      {isLastViewOnce ? (
                        <span className="flex items-center gap-1 text-red-400 font-medium italic">
                          <Flame className="w-3.5 h-3.5" />
                          View Once Media
                        </span>
                      ) : isLastVideo ? (
                        <span className="flex items-center gap-1 text-indigo-400 font-medium italic">
                          <Video className="w-3.5 h-3.5" />
                          Video clip
                        </span>
                      ) : hasMedia ? (
                        <span className="flex items-center gap-1 text-violet-400 font-medium italic">
                          <ImageIcon className="w-3.5 h-3.5" />
                          {lastMsg?.media?.length && lastMsg.media.length > 1
                            ? `${lastMsg.media.length} Photos`
                            : 'Photo'}
                        </span>
                      ) : (
                        <span className="truncate">{lastMsg?.text || 'Direct message thread'}</span>
                      )}
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shrink-0 shadow-xs">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Note */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 px-4">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-indigo-400" />
          <span>End-to-End Encrypted</span>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition text-[11px] cursor-pointer"
          title="Sign out or switch identity"
        >
          <LogOut className="w-3 h-3" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
