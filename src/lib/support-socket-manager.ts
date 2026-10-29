"use client";

type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

type SocketEventMap = {
  onMessage: (data: any) => void;
  onOpen: () => void;
  onClose: (code: number, reason: string) => void;
  onError: (error: Event) => void;
  onStateChange: (state: ConnectionState) => void;
};

type SocketEventListener = (...args: any[]) => void;
type TokenFetcher = () => Promise<string | null>;

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
const MAX_RECONNECT_DELAY = 30000;

class SupportSocketManager {
  private socket: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private url: string = "";
  private token: string = "";
  private sessionId: string = "";
  private reconnectAttempt: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Map<keyof SocketEventMap, Set<SocketEventListener>> = new Map();
  private intentionalClose: boolean = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private tokenFetcher: TokenFetcher | null = null;

  setTokenFetcher(fetcher: TokenFetcher): void {
    this.tokenFetcher = fetcher;
  }

  connect(url: string, token: string, sessionId: string): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      if (this.url === url) {
        return Promise.resolve();
      }
      this.disconnectInternal();
    }

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      return this.waitForConnection();
    }

    this.url = url;
    this.token = token;
    this.sessionId = sessionId;
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this.createSocket();
    return this.waitForConnection();
  }

  private waitForConnection(timeoutMs: number = 15000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const onOpenCleanup = this.on("onOpen", () => {
        clearTimeout(timer);
        onOpenCleanup();
        onErrorCleanup();
        resolve();
      });

      const onErrorCleanup = this.on("onError", () => {
        clearTimeout(timer);
        onOpenCleanup();
        onErrorCleanup();
        reject(new Error("WebSocket connection failed"));
      });

      const timer = setTimeout(() => {
        onOpenCleanup();
        onErrorCleanup();
        reject(new Error("WebSocket connection timed out"));
      }, timeoutMs);
    });
  }

  private createSocket(): void {
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
    }

    this.setState("connecting");
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.setState("connected");
      this.startPing();
      this.emit("onOpen");
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.emit("onMessage", data);
      } catch {
        this.emit("onMessage", event.data);
      }
    };

    this.socket.onerror = (error: Event) => {
      this.emit("onError", error);
    };

    this.socket.onclose = (event: CloseEvent) => {
      this.stopPing();
      this.setState(this.intentionalClose ? "disconnected" : "reconnecting");
      this.emit("onClose", event.code, event.reason);

      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(async () => {
      if (this.url && this.token) {
        if (this.tokenFetcher) {
          try {
            const freshToken = await this.tokenFetcher();
            if (freshToken) {
              this.token = freshToken;
              let newUrl = this.url;
              if (newUrl.includes("?")) {
                const parts = newUrl.split("?");
                const params = new URLSearchParams(parts[1]);
                params.set("token", freshToken);
                newUrl = `${parts[0]}?${params.toString()}`;
              } else {
                newUrl = `${newUrl}?token=${encodeURIComponent(freshToken)}`;
              }
              this.url = newUrl;
            }
          } catch (e) {
            console.error("[SocketManager] Failed to fetch fresh token for reconnect:", e);
          }
        }
        this.createSocket();
      }
    }, delay);
  }

  send(data: string | object): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const payload = typeof data === "string" ? data : JSON.stringify(data);
      this.socket.send(payload);
      return true;
    }
    return false;
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.disconnectInternal();
    this.setState("disconnected");
  }

  private disconnectInternal(): void {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  reconnect(): Promise<void> {
    if (!this.url || !this.token) return Promise.reject(new Error("No URL or token to reconnect"));
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this.disconnectInternal();
    this.createSocket();
    return this.waitForConnection();
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  on<E extends keyof SocketEventMap>(event: E, listener: SocketEventMap[E]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as SocketEventListener);
    return () => {
      this.listeners.get(event)?.delete(listener as SocketEventListener);
    };
  }

  off<E extends keyof SocketEventMap>(event: E, listener: SocketEventMap[E]): void {
    this.listeners.get(event)?.delete(listener as SocketEventListener);
  }

  private emit(event: keyof SocketEventMap, ...args: any[]): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(...args);
      } catch (e) {
        console.error(`[SocketManager] Error in ${event} listener:`, e);
      }
    });
  }

  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit("onStateChange", state);
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: "ping" }));
        } catch {
          this.disconnectInternal();
        }
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  destroy(): void {
    this.disconnect();
    this.listeners.clear();
  }
}

const globalSocketManager = new SupportSocketManager();
export { globalSocketManager as supportSocketManager };
export type { ConnectionState, SocketEventMap };
