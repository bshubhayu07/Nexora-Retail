// Real-time WebSocket connection to FastAPI backend

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws/api/v1/dashboard/live';

type WebSocketEventListener = (eventData: any) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<WebSocketEventListener>> = new Map();
  private reconnectInterval = 3000;
  private reconnectTimer: any = null;
  private isExplicitlyClosed = false;
  public isConnected = false;

  public connect(onStatusChange?: (connected: boolean) => void) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;

    try {
      this.socket = new WebSocket(WS_URL);

      this.socket.onopen = () => {
        this.isConnected = true;
        if (onStatusChange) onStatusChange(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const eventType = payload.event || 'message';
          
          // Dispatch to specific event listeners
          if (this.listeners.has(eventType)) {
            this.listeners.get(eventType)?.forEach((listener) => listener(payload.data || payload));
          }

          // Dispatch to wildcard listeners
          if (this.listeners.has('*')) {
            this.listeners.get('*')?.forEach((listener) => listener(payload));
          }
        } catch {
          // Ignore non-json ping/pongs
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        if (onStatusChange) onStatusChange(false);
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect(onStatusChange);
        }
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        if (onStatusChange) onStatusChange(false);
      };
    } catch {
      this.scheduleReconnect(onStatusChange);
    }
  }

  public subscribe(eventType: string, callback: WebSocketEventListener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private scheduleReconnect(onStatusChange?: (connected: boolean) => void) {
    if (this.reconnectTimer || this.isExplicitlyClosed) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(onStatusChange);
    }, this.reconnectInterval);
  }
}

export const liveWs = new WebSocketClient();
