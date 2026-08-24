import React, { useState } from 'react';
import { 
  Check, 
  CheckCheck, 
  Flame, 
  Play, 
  SmilePlus, 
  Trash2, 
  Reply, 
  Download, 
  Eye, 
  Lock, 
  Sparkles,
  Volume2
} from 'lucide-react';
import { Message, MediaItem, User } from '../types';
import { formatBytes, formatDuration, MEDIA_FILTERS } from '../utils/socket';

interface MessageItemProps {
  message: Message;
  isSelf: boolean;
  sender: User;
  onOpenMedia: (media: MediaItem, allMedia: MediaItem[]) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onReplyTo: (message: Message) => void;
  onViewOnceOpen: (messageId: string, media: MediaItem) => void;
}

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '😮', '👏', '🎉', '💯'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isSelf,
  sender,
  onOpenMedia,
  onToggleReaction,
  onDeleteMessage,
  onReplyTo,
  onViewOnceOpen,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const reactions = message.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div
      id={`msg-${message.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowEmojiPicker(false);
      }}
      className={`relative group flex gap-3 my-3 max-w-[85%] md:max-w-[70%] ${
        isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
      }`}
    >
      {/* Sender Avatar for incoming messages */}
      {!isSelf && (
        <img
          src={sender.avatar}
          alt={sender.displayName}
          className="w-8 h-8 rounded-full object-cover shrink-0 mt-1 border border-slate-700 shadow-sm"
        />
      )}

      <div className={`relative flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
        {/* Reply To Reference snippet */}
        {message.replyTo && (
          <div
            className={`mb-1 px-3 py-1.5 rounded-xl text-xs border border-slate-700/80 flex items-center gap-2 bg-slate-900/90 text-slate-300 ${
              isSelf ? 'rounded-tr-none' : 'rounded-tl-none'
            }`}
          >
            <Reply className="w-3 h-3 text-indigo-400 rotate-180" />
            <div className="truncate">
              <span className="font-semibold text-slate-100 mr-1">{message.replyTo.senderName}:</span>
              <span className="text-slate-400">
                {message.replyTo.text || (message.replyTo.mediaType ? `[Shared ${message.replyTo.mediaType}]` : '')}
              </span>
            </div>
          </div>
        )}

        {/* Main Message Bubble in Sleek Interface Theme */}
        <div
          className={`relative rounded-2xl overflow-hidden shadow-lg transition-all ${
            isSelf
              ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-600/10'
              : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/80'
          }`}
        >
          {/* Media Items (Photos / Videos / View-Once) */}
          {message.media && message.media.length > 0 && (
            <div className="space-y-1.5 p-1.5">
              {message.media.map((mediaItem) => {
                const filterObj = MEDIA_FILTERS.find((f) => f.id === mediaItem.filter);

                // If View Once
                if (mediaItem.isViewOnce) {
                  const isExpired = mediaItem.viewOnceExpired || (message.viewOnceOpenedBy && message.viewOnceOpenedBy.includes(isSelf ? 'other' : sender.id));
                  
                  return (
                    <div
                      key={mediaItem.id}
                      onClick={() => {
                        if (!isExpired) {
                          onViewOnceOpen(message.id, mediaItem);
                        }
                      }}
                      className={`relative flex items-center gap-3 p-4 rounded-xl cursor-pointer select-none transition border ${
                        isExpired
                          ? 'bg-slate-900/90 border-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-900 hover:bg-slate-850 border-red-500/40 text-slate-100 shadow-sm'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isExpired ? 'bg-slate-800 text-slate-500' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        <Flame className={`w-5 h-5 ${!isExpired ? 'animate-pulse' : ''}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                            {isExpired ? 'Media Expired' : '1x View Once'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isExpired
                            ? 'This photo/video self-destructed'
                            : `Tap to reveal (${mediaItem.expiresInSeconds || 10}s timer)`}
                        </p>
                      </div>
                    </div>
                  );
                }

                // Regular Photo
                if (mediaItem.type === 'image') {
                  return (
                    <div
                      key={mediaItem.id}
                      onClick={() => onOpenMedia(mediaItem, message.media || [])}
                      className="group/img relative rounded-xl overflow-hidden cursor-pointer max-w-sm max-h-96 bg-slate-900 border border-slate-700/60 shadow-md"
                    >
                      <img
                        src={mediaItem.url}
                        alt={mediaItem.caption || 'Photo'}
                        className={`w-full max-h-96 object-cover group-hover/img:scale-102 transition duration-300 ${
                          filterObj?.css || ''
                        }`}
                      />
                      {mediaItem.caption && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-xs text-white">
                          {mediaItem.caption}
                        </div>
                      )}
                    </div>
                  );
                }

                // Video Card (Matching Sleek Interface player style)
                if (mediaItem.type === 'video') {
                  return (
                    <div
                      key={mediaItem.id}
                      onClick={() => onOpenMedia(mediaItem, message.media || [])}
                      className="group/vid relative rounded-xl overflow-hidden cursor-pointer max-w-sm bg-slate-900 border border-slate-700/80 shadow-md"
                    >
                      <video
                        src={mediaItem.url}
                        className={`w-full max-h-80 object-cover ${filterObj?.css || ''}`}
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg group-hover/vid:scale-110 transition">
                          <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[11px] border-l-white border-b-[7px] border-b-transparent ml-1"></div>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 text-[10px] text-white/90 font-mono">
                        <span>{mediaItem.duration ? formatDuration(mediaItem.duration) : 'Video'} • MP4</span>
                      </div>
                      {mediaItem.caption && (
                        <div className="p-2.5 text-xs text-slate-200">
                          {mediaItem.caption}
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          )}

          {/* Text message body */}
          {message.text && (
            <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap select-text">
              {message.text}
            </div>
          )}

          {/* Time & Read Status checkmarks */}
          <div
            className={`flex items-center justify-end gap-1 px-3 pb-2 text-[10px] ${
              isSelf ? 'text-indigo-200' : 'text-slate-400'
            }`}
          >
            <span>{formattedTime}</span>
            {isSelf && (
              message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-white" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />
              ) : (
                <Check className="w-3.5 h-3.5 text-indigo-200" />
              )
            )}
          </div>
        </div>

        {/* Reaction Badges */}
        {hasReactions && (
          <div className="flex flex-wrap gap-1 mt-1 z-10">
            {Object.entries(reactions).map(([emoji, userList]) => {
              const users = (userList || []) as string[];
              return (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction(message.id, emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition border ${
                    users.includes(isSelf ? 'u_user' : sender.id)
                      ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-semibold text-[11px]">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Floating Quick Action Bar on Hover */}
        {isHovered && (
          <div
            className={`absolute top-0 -translate-y-1/2 flex items-center gap-1 p-1 rounded-full bg-slate-900 border border-slate-700 shadow-xl z-20 animate-in fade-in zoom-in-95 duration-150 ${
              isSelf ? 'right-4' : 'left-4'
            }`}
          >
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition"
                title="Add Reaction"
              >
                <SmilePlus className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-400" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-full mb-1 left-0 flex items-center gap-1 p-1.5 rounded-full bg-slate-950 border border-slate-700 shadow-2xl z-30">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onToggleReaction(message.id, emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-7 h-7 flex items-center justify-center text-sm rounded-full hover:scale-125 transition transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => onReplyTo(message)}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            {isSelf && (
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
                title="Delete for everyone"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
