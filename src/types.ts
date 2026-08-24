export type MediaType = 'image' | 'video' | 'audio';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  bio?: string;
  lastSeen?: number;
  isSelf?: boolean;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number; // seconds
  caption?: string;
  filter?: string;
  isViewOnce?: boolean;
  viewOnceOpenedAt?: number;
  viewOnceExpired?: boolean;
  expiresInSeconds?: number;
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // user IDs
}

export interface ReplyContext {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  mediaType?: MediaType;
  thumbnailUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text?: string;
  media?: MediaItem[];
  createdAt: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  replyTo?: ReplyContext;
  isViewOnce?: boolean;
  viewOnceOpenedBy?: string[];
  expiresAt?: number;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: number;
  isPinned?: boolean;
  isMuted?: boolean;
  customTheme?: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface WSMessage {
  type: 
    | 'auth:init'
    | 'message:send'
    | 'message:new'
    | 'message:status'
    | 'message:reaction'
    | 'message:delete'
    | 'message:view_once'
    | 'typing:update'
    | 'user:presence'
    | 'conversation:read';
  payload: any;
}
