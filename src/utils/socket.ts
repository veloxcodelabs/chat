// Client-side WebSocket & API utilities

export class SocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private userId: string;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: any = null;
  private isExplicitlyClosed = false;

  constructor(userId: string) {
    this.userId = userId;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}`;
    this.connect();
  }

  public setUserId(newUserId: string) {
    this.userId = newUserId;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send('auth:init', { userId: newUserId });
    }
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.send('auth:init', { userId: this.userId });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type) {
            const callbacks = this.listeners.get(msg.type);
            if (callbacks) {
              callbacks.forEach((cb) => cb(msg.payload));
            }
            // Also trigger global listener
            const globalCallbacks = this.listeners.get('*');
            if (globalCallbacks) {
              globalCallbacks.forEach((cb) => cb(msg));
            }
          }
        } catch (e) {
          console.error('Socket message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed) {
          this.reconnectTimer = setTimeout(() => this.connect(), 2000);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error, will auto-reconnect', err);
      };
    } catch (e) {
      console.warn('Socket connect failed:', e);
    }
  }

  public on(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  public send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Convert file to Base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// Format byte sizes
export function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Format duration in mm:ss
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Format timestamp
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const min = 60 * 1000;
  const hour = min * 60;
  const day = hour * 24;

  if (diff < min) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const MEDIA_FILTERS = [
  { id: 'normal', name: 'Normal', css: '' },
  { id: 'vivid', name: 'Vivid', css: 'contrast-125 saturate-150' },
  { id: 'warm', name: 'Warm', css: 'sepia-25 saturate-125 hue-rotate-15' },
  { id: 'golden', name: 'Golden Hour', css: 'brightness-105 contrast-110 sepia-40 saturate-140' },
  { id: 'cyber', name: 'Cyberpunk', css: 'contrast-125 saturate-150 hue-rotate-190' },
  { id: 'noir', name: 'Noir Mono', css: 'grayscale contrast-130' },
  { id: 'vintage', name: 'Vintage 90s', css: 'sepia-30 contrast-90 brightness-110 saturate-85' },
];
