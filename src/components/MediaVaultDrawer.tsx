import React, { useState } from 'react';
import { X, Image, Video, Music, Search, Download, ExternalLink, Flame, Sparkles, FolderLock } from 'lucide-react';
import { MediaItem, User } from '../types';
import { formatBytes, formatDuration, formatTimeAgo, MEDIA_FILTERS } from '../utils/socket';

interface MediaVaultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaList: MediaItem[];
  otherUser: User;
  onSelectMedia: (media: MediaItem) => void;
}

export const MediaVaultDrawer: React.FC<MediaVaultDrawerProps> = ({
  isOpen,
  onClose,
  mediaList,
  otherUser,
  onSelectMedia,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredMedia = mediaList.filter((item) => {
    if (activeTab !== 'all' && item.type !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.fileName.toLowerCase().includes(q) ||
        (item.caption && item.caption.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const photoCount = mediaList.filter((m) => m.type === 'image').length;
  const videoCount = mediaList.filter((m) => m.type === 'video').length;
  const audioCount = mediaList.filter((m) => m.type === 'audio').length;

  return (
    <div 
      id="media-vault-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-40 flex justify-end bg-slate-950/60 backdrop-blur-xs"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-250"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FolderLock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Shared Media Vault</h3>
              <p className="text-xs text-slate-400">
                Encrypted repository with {otherUser.displayName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card Summary in Sleek Theme */}
        <div className="p-6 flex flex-col items-center text-center border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative mb-3">
            <img
              src={otherUser.avatar}
              alt={otherUser.displayName}
              className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/40 shadow-xl shadow-indigo-500/10"
            />
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-slate-900 bg-emerald-500" />
          </div>
          <h4 className="font-bold text-slate-100 text-base">{otherUser.displayName}</h4>
          <p className="text-xs text-slate-400 font-mono mt-0.5">@{otherUser.username}</p>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-2 px-6 py-3 bg-slate-950/60 border-b border-slate-800 text-center">
          <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
            <span className="block text-base font-bold text-slate-100">{photoCount}</span>
            <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">Photos</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
            <span className="block text-base font-bold text-slate-100">{videoCount}</span>
            <span className="text-[10px] text-violet-400 uppercase font-bold tracking-wider">Videos</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
            <span className="block text-base font-bold text-slate-100">{audioCount}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Audio</span>
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="p-4 space-y-3 border-b border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search captions or file names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({mediaList.length})
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'image'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Photos ({photoCount})
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'video'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Videos ({videoCount})
            </button>
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {filteredMedia.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <Image className="w-10 h-10 stroke-1 opacity-40 text-indigo-400" />
              <p className="text-sm font-semibold text-slate-300">No media found</p>
              <p className="text-xs max-w-xs text-slate-500">
                Photos and videos you exchange in this private chat will automatically sync here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filteredMedia.map((item) => {
                const filterObj = MEDIA_FILTERS.find((f) => f.id === item.filter);
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectMedia(item)}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-700/80 cursor-pointer hover:border-indigo-500/60 transition shadow-sm"
                  >
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        className={`w-full h-full object-cover group-hover:scale-105 transition duration-300 ${
                          filterObj?.css || ''
                        }`}
                      />
                    ) : (
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={item.caption || item.fileName}
                        className={`w-full h-full object-cover group-hover:scale-105 transition duration-300 ${
                          filterObj?.css || ''
                        }`}
                      />
                    )}

                    {/* Overlay Badges */}
                    {item.type === 'video' && (
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 text-[9px] text-white font-mono">
                        <Video className="w-3 h-3 text-indigo-400" />
                        {item.duration ? formatDuration(item.duration) : 'Video'}
                      </div>
                    )}

                    {item.isViewOnce && (
                      <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-500/90 text-white shadow-sm">
                        <Flame className="w-3 h-3" />
                      </div>
                    )}

                    {/* Hover detail overlay */}
                    <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="text-right">
                        <ExternalLink className="w-3.5 h-3.5 text-indigo-300 inline-block" />
                      </div>
                      {item.caption && (
                        <p className="text-[10px] text-slate-200 truncate font-medium">
                          {item.caption}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
