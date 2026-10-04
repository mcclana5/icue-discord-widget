/**
 * WebSocket Connection Client for Discord Bridge
 */
export class SocketClient {
  constructor(url = 'ws://localhost:8080', onMessageCallback, onStatusCallback) {
    this.url = url;
    this.onMessageCallback = onMessageCallback;
    this.onStatusCallback = onStatusCallback;
    this.socket = null;
    this.reconnectTimer = null;
    this.reconnectInterval = 2000;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('[Widget] Connected to Discord Bridge.');
      if (this.onStatusCallback) this.onStatusCallback('online', 'Connected');
      this.reconnectInterval = 2000;
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'STATE_UPDATE' && this.onMessageCallback) {
          this.onMessageCallback(payload.data);
        }
      } catch (err) {
        console.error('[Widget] Socket parse error:', err);
      }
    };

    this.socket.onclose = () => {
      console.warn('[Widget] Connection lost. Retrying...');
      if (this.onStatusCallback) this.onStatusCallback('disconnected', 'Disconnected');
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, this.reconnectInterval);
        this.reconnectInterval = Math.min(this.reconnectInterval * 1.5, 10000);
      }
    };

    this.socket.onerror = (err) => {
      console.error('[Widget] Socket error:', err);
      if (this.socket) {
        this.socket.close();
      }
    };
  }

  send(payloadObj) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payloadObj));
    }
  }
}
