const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const WsBridgeServer = require('./wsServer');
const DiscordService = require('./discordService');
const stateManager = require('./stateManager');
const ACTIONS = require('./actions');

const PORT = process.env.PORT || 8080;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1556021811630571611';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

// 1. Initialize WebSocket Server for iCUE Widgets
const wsServer = new WsBridgeServer(PORT, (msg) => {
  const action = typeof msg === 'string' ? msg : msg?.action;
  
  switch (action) {
    case ACTIONS.TOGGLE_MUTE:
      discordService.toggleMute();
      break;
    case ACTIONS.TOGGLE_DEAFEN:
      discordService.toggleDeafen();
      break;
    case ACTIONS.LEAVE_VOICE:
      discordService.leaveVoiceChannel();
      break;
    case ACTIONS.JOIN_RECENT_VOICE:
      discordService.joinVoiceChannel(msg.channelId);
      break;
    case ACTIONS.REMOVE_RECENT_CHANNEL:
      discordService.removeRecentChannel(msg.channelId);
      break;
    case ACTIONS.REFRESH:
      wsServer.broadcastState();
      break;
    default:
      console.warn('[iCUE Bridge] Unknown action received:', action);
  }
});

// 2. Initialize Discord RPC Service
const discordService = new DiscordService(CLIENT_ID, CLIENT_SECRET, () => {
  wsServer.broadcastState();
});

discordService.init();

// Graceful Process Shutdown Handler
const handleShutdown = async (signal) => {
  console.log(`\n[iCUE Bridge] Received ${signal}. Shutting down gracefully...`);
  if (discordService) {
    await discordService.destroy();
  }
  process.exit(0);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
