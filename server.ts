import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// High payload limit for photos and video uploads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

// In-Memory Storage for Users, Conversations, Messages, and Media
interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  bio?: string;
  lastSeen: number;
  password?: string;
}

interface StoredMedia {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  caption?: string;
  filter?: string;
  isViewOnce?: boolean;
  viewOnceOpenedAt?: number;
  viewOnceExpired?: boolean;
  expiresInSeconds?: number;
}

interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text?: string;
  media?: StoredMedia[];
  createdAt: number;
  status: 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string[]>;
  replyTo?: {
    id: string;
    senderId: string;
    senderName: string;
    text?: string;
    mediaType?: 'image' | 'video' | 'audio';
    thumbnailUrl?: string;
  };
  isViewOnce?: boolean;
  viewOnceOpenedBy?: string[];
  expiresAt?: number;
}

// Initial Seed Users
const initialUsers: UserRecord[] = [
  {
    id: 'u_user',
    username: 'you',
    displayName: 'You (Alex)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    bio: 'Photographer & Visual Creator 📸✨',
    lastSeen: Date.now(),
  },
  {
    id: 'u_elena',
    username: 'elena_v',
    displayName: 'Elena Vance',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    bio: 'Director of Photography 🎬 | Golden hour lover',
    lastSeen: Date.now() - 1000 * 60 * 2,
  },
  {
    id: 'u_marcus',
    username: 'marcus_c',
    displayName: 'Marcus Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    bio: 'Cinematographer & Drone Pilot 🛸',
    lastSeen: Date.now() - 1000 * 60 * 15,
  },
  {
    id: 'u_sophie',
    username: 'sophie_t',
    displayName: 'Sophie Taylor',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    status: 'away',
    bio: 'Adventure traveler 🏔️ Send clips!',
    lastSeen: Date.now() - 1000 * 60 * 45,
  },
  {
    id: 'u_maya',
    username: 'maya_design',
    displayName: 'Maya Lin',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    status: 'offline',
    bio: 'Art director & Motion Designer 🎨',
    lastSeen: Date.now() - 1000 * 60 * 180,
  }
];

let users: UserRecord[] = [...initialUsers];

// Seed initial rich conversations and media
const mediaStore = new Map<string, { mimeType: string; buffer: Buffer }>();

let messages: MessageRecord[] = [
  {
    id: 'm_1',
    conversationId: 'conv_elena',
    senderId: 'u_elena',
    receiverId: 'u_user',
    text: 'Hey! Check out these test shots from the coastal shoot at sunset 🌅 Let me know which grading you prefer!',
    createdAt: Date.now() - 1000 * 60 * 45,
    status: 'read',
    media: [
      {
        id: 'med_elena_1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=80',
        fileName: 'sunset_beach_look1.jpg',
        fileSize: 2450000,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        caption: 'Warm cinematic sunset grade #01',
        filter: 'golden',
      },
      {
        id: 'med_elena_2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=400&auto=format&fit=crop&q=80',
        fileName: 'ocean_waves_mood.jpg',
        fileSize: 3120000,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1280,
        caption: 'Cool turquoise tone #02',
        filter: 'vivid',
      }
    ],
    reactions: { '🔥': ['u_user'], '❤️': ['u_user'] }
  },
  {
    id: 'm_2',
    conversationId: 'conv_elena',
    senderId: 'u_user',
    receiverId: 'u_elena',
    text: 'The warm sunset grade looks incredible! I just captured a quick 4K drone clip over the cliffs too.',
    createdAt: Date.now() - 1000 * 60 * 30,
    status: 'read',
    media: [
      {
        id: 'med_user_drone',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-ocean-waves-crashing-on-a-rocky-shore-41315-large.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&auto=format&fit=crop&q=80',
        fileName: 'cliff_waves_cinematic.mp4',
        fileSize: 6400000,
        mimeType: 'video/mp4',
        duration: 12,
        caption: 'Drone pass over the west cliff',
      }
    ]
  },
  {
    id: 'm_3',
    conversationId: 'conv_elena',
    senderId: 'u_elena',
    receiverId: 'u_user',
    text: 'Also sending you a quick secret sneak peek preview (view-once photo from the upcoming campaign)! 🤫',
    createdAt: Date.now() - 1000 * 60 * 10,
    status: 'delivered',
    isViewOnce: true,
    media: [
      {
        id: 'med_elena_vo',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&auto=format&fit=crop&q=80',
        fileName: 'confidential_location.jpg',
        fileSize: 1800000,
        mimeType: 'image/jpeg',
        caption: 'New secret shoot location (Expires after opening)',
        isViewOnce: true,
        expiresInSeconds: 10,
      }
    ]
  },
  {
    id: 'm_4',
    conversationId: 'conv_marcus',
    senderId: 'u_marcus',
    receiverId: 'u_user',
    text: 'Yo Alex! Check out this mountain peak hyperlapse video we rendered this morning 🏔️⚡',
    createdAt: Date.now() - 1000 * 60 * 120,
    status: 'read',
    media: [
      {
        id: 'med_marcus_vid',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-fog-over-the-mountain-peaks-at-sunset-41484-large.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
        fileName: 'fog_peaks_4k.mp4',
        fileSize: 8900000,
        mimeType: 'video/mp4',
        duration: 14,
        caption: 'Sunset fog rolling over the ridge',
      }
    ],
    reactions: { '😮': ['u_user'] }
  },
  {
    id: 'm_5',
    conversationId: 'conv_sophie',
    senderId: 'u_sophie',
    receiverId: 'u_user',
    text: 'Can you send over the raw photos from Tokyo night walk when you have a moment? 🗼',
    createdAt: Date.now() - 1000 * 60 * 300,
    status: 'read',
    media: [
      {
        id: 'med_sophie_1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=400&auto=format&fit=crop&q=80',
        fileName: 'shinjuku_neon.jpg',
        fileSize: 3400000,
        mimeType: 'image/jpeg',
        caption: 'Tokyo Shinjuku cross street lights',
        filter: 'cyber',
      }
    ]
  }
];

// Helper to compute conversation ID between two users
function getConversationId(u1: string, u2: string): string {
  const [first, second] = [u1, u2].sort();
  return `conv_${first}_${second}`;
}

// REST API Endpoints

// 0. Auth Registration Endpoint
app.post('/api/auth/register', (req, res) => {
  const { username, password, displayName, avatar, bio } = req.body;
  if (!username || !displayName) {
    return res.status(400).json({ error: 'Username and Display Name are required' });
  }

  const cleanUsername = username.toLowerCase().replace(/\s+/g, '_').trim();
  const existingUser = users.find(u => u.username.toLowerCase() === cleanUsername);
  if (existingUser) {
    return res.status(409).json({ error: 'Username already taken. Please choose another or log in.' });
  }

  const userId = `u_${Date.now()}`;
  const newUser: UserRecord = {
    id: userId,
    username: cleanUsername,
    displayName: displayName.trim(),
    avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    bio: bio?.trim() || 'New creator on Prism',
    lastSeen: Date.now(),
    password: password || undefined,
  };

  users.push(newUser);

  broadcast({
    type: 'user:presence',
    payload: { user: newUser }
  });

  res.json({ success: true, user: newUser, token: `token_${userId}` });
});

// 0.1 Auth Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const cleanUsername = username.toLowerCase().replace(/\s+/g, '_').trim();
  let user = users.find(u => u.username.toLowerCase() === cleanUsername);

  // If user doesn't exist, create a dynamic profile or return error
  if (!user) {
    // Check if user was searching by display name
    user = users.find(u => u.displayName.toLowerCase() === username.toLowerCase().trim());
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found. Please register a new account!' });
  }

  // Update status to online
  user.status = 'online';
  user.lastSeen = Date.now();

  broadcast({
    type: 'user:presence',
    payload: { user }
  });

  res.json({ success: true, user, token: `token_${user.id}` });
});

// 1. Get all users
app.get('/api/users', (req, res) => {
  res.json({ users });
});

// 2. Create or update a custom user
app.post('/api/users', (req, res) => {
  const { id, username, displayName, avatar, bio } = req.body;
  if (!username || !displayName) {
    return res.status(400).json({ error: 'Username and Display Name required' });
  }

  const userId = id || `u_${Date.now()}`;
  const existingIdx = users.findIndex(u => u.id === userId);

  const newUser: UserRecord = {
    id: userId,
    username: username.toLowerCase().replace(/\s+/g, '_'),
    displayName,
    avatar: avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
    status: 'online',
    bio: bio || 'Media creator',
    lastSeen: Date.now()
  };

  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...newUser };
  } else {
    users.push(newUser);
  }

  broadcast({
    type: 'user:presence',
    payload: { user: newUser }
  });

  res.json({ user: newUser });
});

// 3. Get conversations for a specific user
app.get('/api/conversations', (req, res) => {
  const currentUserId = (req.query.userId as string) || 'u_user';
  
  // Find all other users
  const otherUsers = users.filter(u => u.id !== currentUserId);

  const conversations = otherUsers.map(otherUser => {
    const convId1 = getConversationId(currentUserId, otherUser.id);
    // Also match legacy seed conv IDs if any
    const matchingMessages = messages.filter(
      m =>
        (m.senderId === currentUserId && m.receiverId === otherUser.id) ||
        (m.senderId === otherUser.id && m.receiverId === currentUserId) ||
        (otherUser.id === 'u_elena' && m.conversationId === 'conv_elena') ||
        (otherUser.id === 'u_marcus' && m.conversationId === 'conv_marcus') ||
        (otherUser.id === 'u_sophie' && m.conversationId === 'conv_sophie') ||
        (otherUser.id === 'u_maya' && m.conversationId === 'conv_maya')
    ).sort((a, b) => a.createdAt - b.createdAt);

    const lastMessage = matchingMessages[matchingMessages.length - 1];
    const unreadCount = matchingMessages.filter(
      m => m.receiverId === currentUserId && m.status !== 'read'
    ).length;

    const currentUserObj = users.find(u => u.id === currentUserId) || initialUsers[0];

    return {
      id: convId1,
      participantIds: [currentUserId, otherUser.id],
      participants: [currentUserObj, otherUser],
      lastMessage,
      unreadCount,
      updatedAt: lastMessage ? lastMessage.createdAt : Date.now() - 1000 * 60 * 60 * 24
    };
  }).sort((a, b) => b.updatedAt - a.updatedAt);

  res.json({ conversations });
});

// 4. Get messages for conversation
app.get('/api/messages/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const currentUserId = (req.query.userId as string) || 'u_user';
  const otherUserId = req.query.otherUserId as string;

  let filtered = messages.filter(m => {
    if (m.conversationId === conversationId) return true;
    if (otherUserId) {
      return (
        (m.senderId === currentUserId && m.receiverId === otherUserId) ||
        (m.senderId === otherUserId && m.receiverId === currentUserId)
      );
    }
    return false;
  }).sort((a, b) => a.createdAt - b.createdAt);

  res.json({ messages: filtered });
});

// 5. Upload Media (High efficiency base64 data-url or buffer)
app.post('/api/media/upload', (req, res) => {
  try {
    const {
      fileData, // base64 string or data url
      type, // 'image' | 'video' | 'audio'
      fileName,
      fileSize,
      mimeType,
      width,
      height,
      duration,
      caption,
      filter,
      isViewOnce,
      expiresInSeconds
    } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'Missing fileData payload' });
    }

    const mediaId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Store binary buffer if base64
    let mediaUrl = fileData;
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const commaIdx = fileData.indexOf(',');
      if (commaIdx !== -1) {
        const rawBase64 = fileData.substring(commaIdx + 1);
        const buffer = Buffer.from(rawBase64, 'base64');
        mediaStore.set(mediaId, { mimeType: mimeType || 'application/octet-stream', buffer });
        mediaUrl = `/api/media/${mediaId}`;
      }
    }

    const mediaItem: StoredMedia = {
      id: mediaId,
      type: type || 'image',
      url: mediaUrl,
      thumbnailUrl: mediaUrl,
      fileName: fileName || `shared_media_${Date.now()}.${type === 'video' ? 'mp4' : type === 'audio' ? 'webm' : 'jpg'}`,
      fileSize: fileSize || 1024 * 50,
      mimeType: mimeType || (type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/webm' : 'image/jpeg'),
      width,
      height,
      duration,
      caption,
      filter,
      isViewOnce: !!isViewOnce,
      expiresInSeconds: expiresInSeconds || 10,
    };

    res.json({ mediaItem });
  } catch (err: any) {
    console.error('Media upload error:', err);
    res.status(500).json({ error: 'Failed to process media' });
  }
});

// 6. Serve uploaded media
app.get('/api/media/:mediaId', (req, res) => {
  const { mediaId } = req.params;
  const stored = mediaStore.get(mediaId);
  if (!stored) {
    return res.status(404).send('Media not found');
  }
  res.setHeader('Content-Type', stored.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(stored.buffer);
});

// 7. Post new message
app.post('/api/messages', (req, res) => {
  const {
    conversationId,
    senderId,
    receiverId,
    text,
    media,
    replyTo,
    isViewOnce
  } = req.body;

  if (!senderId || !receiverId) {
    return res.status(400).json({ error: 'senderId and receiverId required' });
  }

  const messageId = `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const actualConvId = conversationId || getConversationId(senderId, receiverId);

  const newMessage: MessageRecord = {
    id: messageId,
    conversationId: actualConvId,
    senderId,
    receiverId,
    text: text || '',
    media: media || [],
    createdAt: Date.now(),
    status: 'delivered',
    reactions: {},
    replyTo,
    isViewOnce: !!isViewOnce,
    viewOnceOpenedBy: []
  };

  messages.push(newMessage);

  // Broadcast to all connected sockets
  broadcast({
    type: 'message:new',
    payload: { message: newMessage }
  });

  res.json({ message: newMessage });
});

// 8. Toggle Reaction
app.post('/api/messages/:id/reaction', (req, res) => {
  const { id } = req.params;
  const { emoji, userId } = req.body;

  const msg = messages.find(m => m.id === id);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (!msg.reactions) {
    msg.reactions = {};
  }

  const currentUsers = msg.reactions[emoji] || [];
  if (currentUsers.includes(userId)) {
    // Remove reaction
    msg.reactions[emoji] = currentUsers.filter(u => u !== userId);
    if (msg.reactions[emoji].length === 0) {
      delete msg.reactions[emoji];
    }
  } else {
    // Add reaction
    msg.reactions[emoji] = [...currentUsers, userId];
  }

  broadcast({
    type: 'message:reaction',
    payload: { messageId: id, reactions: msg.reactions }
  });

  res.json({ messageId: id, reactions: msg.reactions });
});

// 9. View-Once media opened
app.post('/api/messages/:id/view-once', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const msg = messages.find(m => m.id === id);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (!msg.viewOnceOpenedBy) {
    msg.viewOnceOpenedBy = [];
  }

  if (!msg.viewOnceOpenedBy.includes(userId)) {
    msg.viewOnceOpenedBy.push(userId);
  }

  if (msg.media) {
    msg.media = msg.media.map(item => ({
      ...item,
      viewOnceOpenedAt: item.viewOnceOpenedAt || Date.now(),
      viewOnceExpired: true
    }));
  }

  broadcast({
    type: 'message:view_once',
    payload: {
      messageId: id,
      viewOnceOpenedBy: msg.viewOnceOpenedBy,
      media: msg.media
    }
  });

  res.json({ success: true, message: msg });
});

// 10. Mark messages as read
app.post('/api/conversations/read', (req, res) => {
  const { userId, otherUserId } = req.body;
  if (!userId || !otherUserId) {
    return res.status(400).json({ error: 'userId and otherUserId required' });
  }

  let updatedCount = 0;
  messages.forEach(m => {
    if (m.senderId === otherUserId && m.receiverId === userId && m.status !== 'read') {
      m.status = 'read';
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    broadcast({
      type: 'conversation:read',
      payload: { readerId: userId, otherUserId }
    });
  }

  res.json({ success: true, updatedCount });
});

// 11. Delete Message
app.delete('/api/messages/:id', (req, res) => {
  const { id } = req.params;
  const index = messages.findIndex(m => m.id === id);
  if (index !== -1) {
    messages.splice(index, 1);
    broadcast({
      type: 'message:delete',
      payload: { messageId: id }
    });
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Message not found' });
});

// 12. Clear/Reset demo data
app.post('/api/reset-demo', (req, res) => {
  users = [...initialUsers];
  res.json({ success: true });
});

// Setup HTTP Server & WebSockets
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface ClientMeta {
  ws: WebSocket;
  userId?: string;
}

const clients = new Set<ClientMeta>();

wss.on('connection', (ws: WebSocket) => {
  const client: ClientMeta = { ws };
  clients.add(client);

  ws.on('message', (raw: string) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'auth:init') {
        client.userId = data.payload?.userId;
        // Update user status to online
        if (client.userId) {
          const user = users.find(u => u.id === client.userId);
          if (user) {
            user.status = 'online';
            user.lastSeen = Date.now();
            broadcast({
              type: 'user:presence',
              payload: { user }
            });
          }
        }
      } else if (data.type === 'typing:update') {
        // Relay typing event to all other clients
        broadcast({
          type: 'typing:update',
          payload: data.payload
        }, ws);
      }
    } catch (e) {
      console.error('WS parse error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(client);
    if (client.userId) {
      const user = users.find(u => u.id === client.userId);
      if (user) {
        user.status = 'offline';
        user.lastSeen = Date.now();
        broadcast({
          type: 'user:presence',
          payload: { user }
        });
      }
    }
  });
});

function broadcast(msg: any, ignoreSocket?: WebSocket) {
  const payload = JSON.stringify(msg);
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN && client.ws !== ignoreSocket) {
      client.ws.send(payload);
    }
  }
}

// Vite integration
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Private Media Messenger running on http://localhost:${PORT}`);
  });
}

start();
