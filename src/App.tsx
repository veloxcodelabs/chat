import React, { useState, useEffect, useRef } from 'react';
import { SocketClient } from './utils/socket';
import { User, Conversation, Message, MediaItem } from './types';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { CameraRecorderModal } from './components/CameraRecorderModal';
import { MediaViewerModal } from './components/MediaViewerModal';
import { MediaVaultDrawer } from './components/MediaVaultDrawer';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'u_user',
    username: 'you',
    displayName: 'You (Alex)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    bio: 'Photographer & Visual Creator 📸✨',
    lastSeen: Date.now(),
  });

  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);

  // Modals & Drawers
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [activeMediaForViewer, setActiveMediaForViewer] = useState<MediaItem | null>(null);

  const socketRef = useRef<SocketClient | null>(null);

  // 1. Initialize Socket and Load Users & Conversations
  useEffect(() => {
    const socket = new SocketClient(currentUser.id);
    socketRef.current = socket;

    // Listen to real-time events
    socket.on('message:new', (payload: { message: Message }) => {
      const { message } = payload;
      
      // Update messages if for current conversation
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        if (
          (activeConversation && message.conversationId === activeConversation.id) ||
          (activeConversation &&
            ((message.senderId === currentUser.id && message.receiverId === getOtherUserId(activeConversation)) ||
              (message.senderId === getOtherUserId(activeConversation) && message.receiverId === currentUser.id)))
        ) {
          return [...prev, message];
        }
        return prev;
      });

      // Refresh conversations list
      loadConversations(currentUser.id);
    });

    socket.on('message:reaction', (payload: { messageId: string; reactions: Record<string, string[]> }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m))
      );
    });

    socket.on('message:delete', (payload: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
      loadConversations(currentUser.id);
    });

    socket.on('message:view_once', (payload: { messageId: string; viewOnceOpenedBy: string[]; media?: any[] }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId
            ? { ...m, viewOnceOpenedBy: payload.viewOnceOpenedBy, media: payload.media || m.media }
            : m
        )
      );
    });

    socket.on('typing:update', (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (activeConversation && payload.userId !== currentUser.id) {
        setIsRemoteTyping(payload.isTyping);
      }
    });

    socket.on('user:presence', (payload: { user: User }) => {
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === payload.user.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...payload.user };
          return updated;
        }
        return [...prev, payload.user];
      });
      loadConversations(currentUser.id);
    });

    loadUsers();
    loadConversations(currentUser.id);

    return () => {
      socket.disconnect();
    };
  }, [currentUser.id]);

  // Helper to find the other participant ID
  const getOtherUserId = (conv: Conversation | null): string => {
    if (!conv) return '';
    const other = conv.participants.find((p) => p.id !== currentUser.id);
    return other ? other.id : '';
  };

  // 2. Fetch Users
  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);

        // Check if there was a saved logged-in user in localStorage
        const savedUserId = localStorage.getItem('prism_logged_user_id');
        if (savedUserId && savedUserId !== currentUser.id) {
          const matched = data.users.find((u: User) => u.id === savedUserId);
          if (matched) {
            setCurrentUser(matched);
            loadConversations(matched.id);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  // 3. Fetch Conversations for Active User
  const loadConversations = async (userId: string) => {
    try {
      const res = await fetch(`/api/conversations?userId=${userId}`);
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);

        // Auto select first conversation if none selected
        setActiveConversation((prev) => {
          if (prev) {
            const updated = data.conversations.find((c: Conversation) => c.id === prev.id);
            return updated || prev;
          }
          return data.conversations[0] || null;
        });
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  };

  // 4. Fetch Messages when Active Conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    const otherUserId = getOtherUserId(activeConversation);
    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `/api/messages/${activeConversation.id}?userId=${currentUser.id}&otherUserId=${otherUserId}`
        );
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }

        // Mark as read
        fetch('/api/conversations/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, otherUserId }),
        });
      } catch (e) {
        console.error('Failed to load messages:', e);
      }
    };

    fetchMessages();

    // Fallback periodic poll to guarantee real-time sync in sandboxed environments
    const interval = setInterval(fetchMessages, 3500);
    return () => clearInterval(interval);
  }, [activeConversation?.id, currentUser.id]);

  // Handle Switch User (e.g. from You to Elena to test 2-way live chat)
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('prism_logged_user_id', user.id);
    if (socketRef.current) {
      socketRef.current.setUserId(user.id);
    }
    setActiveConversation(null);
    loadConversations(user.id);
  };

  // Handle Authentication Success (Login or Register)
  const handleAuthSuccess = (user: User) => {
    handleSelectUser(user);
    loadUsers();
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('prism_logged_user_id');
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  // Open Auth Modal for specific mode
  const handleOpenAuthModal = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Create new custom persona from persona modal
  const handleCreateUser = async (userData: { displayName: string; username: string; avatar: string; bio: string }) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (data.user) {
        setUsers((prev) => [...prev, data.user]);
        handleSelectUser(data.user);
      }
    } catch (e) {
      console.error('Create user error:', e);
    }
  };

  // Send Message with attached photos/videos
  const handleSendMessage = async (
    text: string,
    mediaList: Partial<MediaItem>[],
    fileDataMap: Record<string, string>
  ) => {
    if (!activeConversation) return;

    const otherUserId = getOtherUserId(activeConversation);
    const uploadedMediaItems: MediaItem[] = [];

    // Upload any attached media files
    for (const media of mediaList) {
      const fileData = media.id ? fileDataMap[media.id] : undefined;
      if (fileData) {
        try {
          const uploadRes = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData,
              type: media.type,
              fileName: media.fileName,
              fileSize: media.fileSize,
              mimeType: media.mimeType,
              caption: media.caption,
              filter: media.filter,
              isViewOnce: media.isViewOnce,
              expiresInSeconds: media.expiresInSeconds,
              duration: media.duration,
            }),
          });
          const uploadData = await uploadRes.json();
          if (uploadData.mediaItem) {
            uploadedMediaItems.push(uploadData.mediaItem);
          }
        } catch (e) {
          console.error('Media upload error:', e);
        }
      }
    }

    try {
      const payload = {
        conversationId: activeConversation.id,
        senderId: currentUser.id,
        receiverId: otherUserId,
        text,
        media: uploadedMediaItems,
        isViewOnce: uploadedMediaItems.some((m) => m.isViewOnce),
      };

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.message) {
        // Optimistically add to state
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        loadConversations(currentUser.id);
      }
    } catch (e) {
      console.error('Failed to post message:', e);
    }
  };

  // Send photo/video directly from live camera recorder modal
  const handleSendCameraMedia = (media: Partial<MediaItem>, fileData: string) => {
    const tempId = `cam_${Date.now()}`;
    const fileDataMap: Record<string, string> = { [tempId]: fileData };
    handleSendMessage('', [{ ...media, id: tempId }], fileDataMap);
  };

  // Toggle message reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, userId: currentUser.id }),
      });
    } catch (e) {
      console.error('Reaction toggle error:', e);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (e) {
      console.error('Delete message error:', e);
    }
  };

  // Open View Once media
  const handleViewOnceOpen = async (messageId: string, media: MediaItem) => {
    setActiveMediaForViewer(media);
    try {
      await fetch(`/api/messages/${messageId}/view-once`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    } catch (e) {
      console.error('View-once reveal error:', e);
    }
  };

  // Typing status relay
  const handleTypingStatus = (isTyping: boolean) => {
    if (socketRef.current && activeConversation) {
      socketRef.current.send('typing:update', {
        conversationId: activeConversation.id,
        userId: currentUser.id,
        isTyping,
      });
    }
  };

  const otherUser = activeConversation?.participants.find((p) => p.id !== currentUser.id) || users[1] || currentUser;

  // Extract all media in active conversation for the vault drawer
  const allMediaInConv: MediaItem[] = [];
  messages.forEach((m) => {
    if (m.media) {
      m.media.forEach((item) => allMediaInConv.push(item));
    }
  });

  return (
    <div id="app-root" className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        currentUser={currentUser}
        conversations={conversations}
        activeConversationId={activeConversation?.id || null}
        onSelectConversation={(conv) => setActiveConversation(conv)}
        onOpenUserSwitcher={() => setIsUserSwitcherOpen(true)}
        onOpenQuickCamera={() => setIsCameraOpen(true)}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={handleLogout}
      />

      {/* Main Chat Area */}
      <main className="flex-1 h-full flex flex-col min-w-0">
        <ChatArea
          currentUser={currentUser}
          conversation={activeConversation}
          messages={messages}
          isTyping={isRemoteTyping}
          onSendMessage={handleSendMessage}
          onOpenLiveCamera={() => setIsCameraOpen(true)}
          onOpenMediaVault={() => setIsVaultOpen(true)}
          onOpenMediaViewer={(media) => setActiveMediaForViewer(media)}
          onToggleReaction={handleToggleReaction}
          onDeleteMessage={handleDeleteMessage}
          onViewOnceOpen={handleViewOnceOpen}
          onTypingStatus={handleTypingStatus}
          onOpenAuthModal={handleOpenAuthModal}
        />
      </main>

      {/* Live Camera & Video Recording Studio Modal */}
      {isCameraOpen && (
        <CameraRecorderModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onSendMedia={handleSendCameraMedia}
          recipientName={otherUser?.displayName || 'Contact'}
        />
      )}

      {/* High-Fidelity Photo & Video Lightbox Viewer Modal */}
      {!!activeMediaForViewer && (
        <MediaViewerModal
          media={activeMediaForViewer}
          allMediaList={allMediaInConv}
          isOpen={!!activeMediaForViewer}
          onClose={() => setActiveMediaForViewer(null)}
          onNavigate={(media) => setActiveMediaForViewer(media)}
        />
      )}

      {/* Shared Media Vault & Gallery Drawer */}
      {isVaultOpen && (
        <MediaVaultDrawer
          isOpen={isVaultOpen}
          onClose={() => setIsVaultOpen(false)}
          mediaList={allMediaInConv}
          otherUser={otherUser}
          onSelectMedia={(media) => {
            setIsVaultOpen(false);
            setActiveMediaForViewer(media);
          }}
        />
      )}

      {/* User / Persona Switcher Modal */}
      {isUserSwitcherOpen && (
        <UserSwitcherModal
          isOpen={isUserSwitcherOpen}
          onClose={() => setIsUserSwitcherOpen(false)}
          users={users}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          onCreateUser={handleCreateUser}
        />
      )}

      {/* Dedicated Login & Registration Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          availableUsers={users}
        />
      )}
    </div>
  );
}
