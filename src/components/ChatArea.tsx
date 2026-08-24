import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, 
  FolderLock, 
  Sparkles, 
  Flame, 
  Camera, 
  Phone, 
  Video as VideoIcon, 
  MoreVertical, 
  Info, 
  UploadCloud,
  ChevronLeft
} from 'lucide-react';
import { Conversation, Message, MediaItem, User, ReplyContext } from '../types';
import { MessageItem } from './MessageItem';
import { MessageComposer } from './MessageComposer';

interface ChatAreaProps {
  currentUser: User;
  conversation: Conversation | null;
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (text: string, mediaList: Partial<MediaItem>[], fileDataMap: Record<string, string>) => void;
  onOpenLiveCamera: () => void;
  onOpenMediaVault: () => void;
  onOpenMediaViewer: (media: MediaItem, allMedia: MediaItem[]) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onViewOnceOpen: (messageId: string, media: MediaItem) => void;
  onTypingStatus: (isTyping: boolean) => void;
  onBackToSidebar?: () => void;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentUser,
  conversation,
  messages,
  isTyping,
  onSendMessage,
  onOpenLiveCamera,
  onOpenMediaVault,
  onOpenMediaViewer,
  onToggleReaction,
  onDeleteMessage,
  onViewOnceOpen,
  onTypingStatus,
  onBackToSidebar,
  onOpenAuthModal,
}) => {
  const [replyContext, setReplyContext] = useState<ReplyContext | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const otherUser = conversation?.participants.find((p) => p.id !== currentUser.id) || conversation?.participants[0];

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleReplyTo = (msg: Message) => {
    const sender = conversation?.participants.find((p) => p.id === msg.senderId) || currentUser;
    setReplyContext({
      id: msg.id,
      senderId: msg.senderId,
      senderName: sender.displayName,
      text: msg.text,
      mediaType: msg.media && msg.media[0] ? msg.media[0].type : undefined,
    });
  };

  // Drag and drop handlers for photos & videos
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      const mediaList: Partial<MediaItem>[] = [];
      const fileDataMap: Record<string, string> = {};

      for (const file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise<void>((resolve) => {
          reader.onloadend = () => {
            const id = `drop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            fileDataMap[id] = reader.result as string;
            mediaList.push({
              id,
              type: file.type.startsWith('video/') ? 'video' : 'image',
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
            });
            resolve();
          };
        });
      }

      onSendMessage('', mediaList, fileDataMap);
    }
  };

  if (!conversation || !otherUser) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 p-8 text-center">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-indigo-400 shadow-xl shadow-indigo-500/5">
          <Camera className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">Direct Private Media</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Share high-resolution photos, 4K video clips, and view-once self-destructing snaps in encrypted private messages.
        </p>

        {onOpenAuthModal && (
          <div className="flex items-center gap-3">
            <button
              id="btn-empty-login"
              onClick={() => onOpenAuthModal('login')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              Sign In / Switch Profile
            </button>
            <button
              id="btn-empty-register"
              onClick={() => onOpenAuthModal('register')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition cursor-pointer"
            >
              Create Account / Register
            </button>
          </div>
        )}
      </div>
    );
  }

  // Collect all media from the conversation for lightbox navigation
  const allMediaInConv: MediaItem[] = [];
  messages.forEach((m) => {
    if (m.media) {
      m.media.forEach((item) => allMediaInConv.push(item));
    }
  });

  return (
    <div
      id="chat-area-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 h-full flex flex-col bg-slate-950 overflow-hidden"
    >
      {/* Drag & Drop Visual Backdrop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center border-3 border-dashed border-indigo-500 rounded-3xl m-4 pointer-events-none animate-in fade-in zoom-in-95">
          <UploadCloud className="w-16 h-16 text-indigo-400 mb-2 animate-bounce" />
          <h3 className="text-xl font-bold text-white">Drop Photos or Videos Here</h3>
          <p className="text-xs text-slate-300">Instantly share in private direct chat</p>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="h-[73px] px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between z-10 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3.5">
          {onBackToSidebar && (
            <button
              onClick={onBackToSidebar}
              className="md:hidden p-1.5 rounded-xl bg-slate-800 text-slate-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <img
              src={otherUser.avatar}
              alt={otherUser.displayName}
              className="w-11 h-11 rounded-full object-cover border border-slate-700 shadow-md"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
                otherUser.status === 'online'
                  ? 'bg-emerald-500'
                  : otherUser.status === 'away'
                  ? 'bg-amber-500'
                  : 'bg-slate-500'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-100 text-sm md:text-base">{otherUser.displayName}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 font-mono">
                @{otherUser.username}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              {isTyping ? (
                <span className="text-indigo-400 font-bold uppercase tracking-wider animate-pulse">Capturing Media...</span>
              ) : otherUser.status === 'online' ? (
                <span className="text-emerald-400 uppercase tracking-widest font-bold">Online Now</span>
              ) : (
                <span className="text-slate-400">{otherUser.bio || 'Digital Creator'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Tools in Sleek Theme */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn-open-media-vault"
            onClick={onOpenMediaVault}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition transform active:scale-95"
            title="Open Shared Media Vault"
          >
            <FolderLock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Media Vault</span>
          </button>

          <button
            id="btn-chat-camera"
            onClick={onOpenLiveCamera}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition"
            title="Instant Live Camera"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Capture</span>
          </button>
        </div>
      </header>

      {/* Messages Stream Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4 scrollbar-thin"
      >
        {/* End-to-End Encryption Notice Banner */}
        <div className="flex justify-center my-1">
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-slate-400 text-[10px] font-medium shadow-xs">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>Direct private session • Media verified</span>
          </div>
        </div>

        {/* Message Items List */}
        {messages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
            <Camera className="w-12 h-12 stroke-1 opacity-40 text-indigo-400" />
            <div>
              <p className="text-sm font-bold text-slate-300">No messages yet</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Take a quick live photo, record a video clip, or send a greeting to start sharing with {otherUser.displayName}!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === currentUser.id;
            const sender = isSelf ? currentUser : otherUser;

            return (
              <MessageItem
                key={msg.id}
                message={msg}
                isSelf={isSelf}
                sender={sender}
                onOpenMedia={(media) => onOpenMediaViewer(media, allMediaInConv)}
                onToggleReaction={onToggleReaction}
                onDeleteMessage={onDeleteMessage}
                onReplyTo={handleReplyTo}
                onViewOnceOpen={(msgId, media) => onViewOnceOpen(msgId, media)}
              />
            );
          })
        )}

        {/* Remote typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pl-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-indigo-300 text-xs font-medium">{otherUser.displayName} is preparing media...</span>
          </div>
        )}
      </div>

      {/* Message Composer Area */}
      <MessageComposer
        onSendMessage={onSendMessage}
        onOpenLiveCamera={onOpenLiveCamera}
        onTyping={onTypingStatus}
        replyContext={replyContext}
        onCancelReply={() => setReplyContext(null)}
        recipientName={otherUser.displayName}
      />
    </div>
  );
};
