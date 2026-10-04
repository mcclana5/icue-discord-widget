const { WebSocketServer } = require('ws');
const stateManager = require('./stateManager');

class WsBridgeServer {
  constructor(port = 8080, onActionCallback) {
    this.port = port;
    this.onActionCallback = onActionCallback;
    this.wss = new WebSocketServer({ port: this.port });

    console.log(`[iCUE Bridge] WebSocket server running on ws://localhost:${this.port}`);

    this.wss.on('connection', (ws) => {
      console.log('[iCUE Bridge] iCUE Widget connected to bridge.');

      // Send initial state upon connection
      this.sendToClient(ws, stateManager.getFormattedState());

      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message);
          if (this.onActionCallback) {
            this.onActionCallback(parsed);
          }
        } catch (err) {
          console.error('[iCUE Bridge] Invalid WebSocket message:', err);
        }
      });
    });
  }

  broadcastState() {
    const payload = JSON.stringify({
      type: 'STATE_UPDATE',
      data: stateManager.getFormattedState()
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === 1 /* OPEN */) {
        client.send(payload);
      }
    });
  }

  sendToClient(ws, data) {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify({ type: 'STATE_UPDATE', data }));
    }
  }
}

module.exports = WsBridgeServer;
