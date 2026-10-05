const RPC = require('discord-rpc');
const stateManager = require('./stateManager');
const cacheManager = require('./cacheManager');

/**
 * Discord RPC Service handling Local IPC Transport connection to Discord Desktop App
 */
class DiscordService {
  constructor(clientId, clientSecret, onStateChanged) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.onStateChanged = onStateChanged;
    this.rpcClient = null;
    this.activeChannelId = null;
  }

  init() {
    this.activeChannelId = null;
    RPC.register(this.clientId);
    this.rpcClient = new RPC.Client({ transport: 'ipc' });

    this.rpcClient.on('ready', async () => {
      console.log(`[Discord RPC] Connected to Discord Desktop App as ${this.rpcClient.user.username}`);
      
      if (this.rpcClient.accessToken) {
        cacheManager.saveToken(this.rpcClient.accessToken);
      }

      stateManager.setDiscordConnected(true);
      if (this.rpcClient.user) {
        stateManager.setSelfUser(this.rpcClient.user);
      }
      this.notifyState();

      try {
        await this.rpcClient.subscribe('VOICE_CHANNEL_SELECT');
        await this.rpcClient.subscribe('VOICE_SETTINGS_UPDATE');

        try {
          const settings = await this.rpcClient.getVoiceSettings();
          if (settings) {
            stateManager.setSelfVoiceState(settings.mute, settings.deaf);
          }
        } catch (e) {
          console.warn('[Discord RPC] Could not fetch initial voice settings:', e.message);
        }

        await this.checkCurrentVoiceChannel();
      } catch (err) {
        console.error('[Discord RPC] Channel setup error:', err);
      }
    });

    this.setupEventListeners();
    this.login();
  }

  login() {
    const savedToken = cacheManager.loadToken();

    const loginOpts = {
      clientId: this.clientId,
      scopes: ['rpc', 'rpc.voice.read', 'rpc.voice.write']
    };

    if (savedToken) {
      loginOpts.accessToken = savedToken;
    } else if (this.clientSecret && this.clientSecret.trim().length > 0) {
      loginOpts.clientSecret = this.clientSecret.trim();
      loginOpts.redirectUri = 'http://localhost';
    }

    this.rpcClient.login(loginOpts).catch((err) => {
      if (savedToken) {
        cacheManager.clearToken();
      }

      if (err.message && err.message.includes('RPC_CONNECTION_TIMEOUT')) {
        console.warn('[Discord RPC] Searching for Discord Desktop App... Make sure Discord is open.');
      } else {
        console.warn(`[Discord RPC] Connection status: ${err.message}. Retrying in 5s...`);
      }
      this.activeChannelId = null;
      stateManager.setDiscordConnected(false);
      this.notifyState();
      setTimeout(() => this.init(), 5000);
    });
  }

  setupEventListeners() {
    this.rpcClient.on('VOICE_CHANNEL_SELECT', async (data) => {
      if (data && data.channel_id) {
        console.log(`[Discord RPC] Joined voice channel ID: ${data.channel_id}`);
        await this.subscribeToChannel(data.channel_id, true);
      } else {
        console.log('[Discord RPC] Left voice channel.');
        this.unsubscribeFromCurrentChannel();
        stateManager.setVoiceChannel(null);
        this.notifyState();
      }
    });

    const handleSpeakingStart = (data) => {
      const uid = data?.user_id || data?.userId;
      if (uid) {
        stateManager.setSpeaking(uid, true);
        this.notifyState();
      }
    };

    const handleSpeakingStop = (data) => {
      const uid = data?.user_id || data?.userId;
      if (uid) {
        stateManager.setSpeaking(uid, false);
        this.notifyState();
      }
    };

    this.rpcClient.on('SPEAKING_START', handleSpeakingStart);
    this.rpcClient.on('SPEAKING_STOP', handleSpeakingStop);

    const handleVoiceStateUpdate = (data) => {
      if (process.env.VERBOSE_LOGGING === 'true') {
        console.log('[Discord RPC] VOICE_STATE event payload:', JSON.stringify(data));
      }
      if (data && data.user) {
        stateManager.updateMember(data);
        this.notifyState();
      }
    };

    this.rpcClient.on('VOICE_STATE_CREATE', handleVoiceStateUpdate);
    this.rpcClient.on('VOICE_STATE_UPDATE', handleVoiceStateUpdate);

    this.rpcClient.on('VOICE_STATE_DELETE', (data) => {
      if (data && data.user) {
        stateManager.removeMember(data.user.id);
        this.notifyState();
      }
    });

    this.rpcClient.on('VOICE_SETTINGS_UPDATE', (data) => {
      if (data) {
        stateManager.setSelfVoiceState(data.mute, data.deaf);

        if (this.rpcClient.user && stateManager.state.voiceMembers.has(this.rpcClient.user.id)) {
          const selfMember = stateManager.state.voiceMembers.get(this.rpcClient.user.id);
          if (selfMember) {
            selfMember.mute = !!data.mute;
            selfMember.deafen = !!data.deaf;
          }
        }

        this.notifyState();
      }
    });

    this.rpcClient.on('disconnected', () => {
      console.warn('[Discord RPC] Disconnected from Discord app. Retrying connection in 5s...');
      this.activeChannelId = null;
      stateManager.setDiscordConnected(false);
      this.notifyState();
      setTimeout(() => this.init(), 5000);
    });
  }

  async checkCurrentVoiceChannel() {
    try {
      const selectedChannel = await this.rpcClient.request('GET_SELECTED_VOICE_CHANNEL');
      if (selectedChannel && selectedChannel.id) {
        console.log(`[Discord RPC] Detected active voice channel ID: ${selectedChannel.id}`);
        await this.subscribeToChannel(selectedChannel.id, true);
      } else {
        console.log('[Discord RPC] Not currently in a voice channel.');
      }
    } catch (err) {
      console.log('[Discord RPC] Not currently in a voice channel.');
    }
  }

  async subscribeToChannel(channelId, force = false) {
    if (!channelId) return;
    if (!force && this.activeChannelId === channelId) {
      return;
    }
    if (this.activeChannelId && this.activeChannelId !== channelId) {
      this.unsubscribeFromCurrentChannel();
    }

    this.activeChannelId = channelId;

    try {
      const channel = await this.rpcClient.getChannel(channelId);
      let gName = channel.guild_id ? 'Discord Server' : 'Direct Call';
      let gIcon = null;

      if (channel.guild_id) {
        try {
          const guild = await this.rpcClient.getGuild(channel.guild_id);
          if (guild) {
            gName = guild.name || gName;
            if (guild.icon_url) {
              gIcon = guild.icon_url;
            } else if (guild.icon) {
              gIcon = `https://cdn.discordapp.com/icons/${channel.guild_id}/${guild.icon}.png`;
            }
          }
        } catch (e) { }
      }

      stateManager.setVoiceChannel(
        channelId,
        channel.name,
        gName,
        gIcon
      );

      if (channel.voice_states) {
        channel.voice_states.forEach((vs) => stateManager.updateMember(vs));
      }

      Promise.allSettled([
        this.rpcClient.subscribe('VOICE_STATE_CREATE', { channel_id: channelId }),
        this.rpcClient.subscribe('VOICE_STATE_UPDATE', { channel_id: channelId }),
        this.rpcClient.subscribe('VOICE_STATE_DELETE', { channel_id: channelId }),
        this.rpcClient.subscribe('SPEAKING_START', { channel_id: channelId }),
        this.rpcClient.subscribe('SPEAKING_STOP', { channel_id: channelId })
      ]).then(() => {
        console.log(`[Discord RPC] Active voice events connected for: ${stateManager.state.channelName}`);
      });
    } catch (err) {
      console.error('[Discord RPC] Error fetching channel details:', err);
    }

    this.notifyState();
  }

  unsubscribeFromCurrentChannel() {
    if (!this.activeChannelId || !this.rpcClient) return;
    const cId = this.activeChannelId;
    this.activeChannelId = null;

    try {
      this.rpcClient.unsubscribe('VOICE_STATE_CREATE', { channel_id: cId }).catch(() => { });
      this.rpcClient.unsubscribe('VOICE_STATE_UPDATE', { channel_id: cId }).catch(() => { });
      this.rpcClient.unsubscribe('VOICE_STATE_DELETE', { channel_id: cId }).catch(() => { });
      this.rpcClient.unsubscribe('SPEAKING_START', { channel_id: cId }).catch(() => { });
      this.rpcClient.unsubscribe('SPEAKING_STOP', { channel_id: cId }).catch(() => { });
    } catch (e) { }
  }

  async leaveVoiceChannel() {
    if (this.rpcClient) {
      try {
        await this.rpcClient.request('SELECT_VOICE_CHANNEL', { channel_id: null });
        console.log('[Discord RPC] Voice channel disconnect requested.');
      } catch (err) {
        console.error('[Discord RPC] Leave voice error:', err);
      }
    }
  }

  async joinVoiceChannel(channelId) {
    const targetId = channelId || (stateManager.recentChannels && stateManager.recentChannels.length > 0 ? stateManager.recentChannels[0].channelId : null);
    if (this.rpcClient && targetId) {
      try {
        await this.rpcClient.request('SELECT_VOICE_CHANNEL', { channel_id: targetId });
        console.log(`[Discord RPC] Join voice channel requested for ID: ${targetId}`);
      } catch (err) {
        console.error('[Discord RPC] Join voice error:', err);
      }
    }
  }

  removeRecentChannel(channelId) {
    stateManager.removeRecentChannel(channelId);
    this.notifyState();
  }

  clearNotification(channelId) {
    stateManager.clearNotification(channelId);
    this.notifyState();
  }

  toggleMute() {
    if (this.rpcClient) {
      const targetMute = !stateManager.state.selfMute;
      this.rpcClient.setVoiceSettings({ mute: targetMute })
        .then((res) => {
          if (res) {
            stateManager.setSelfVoiceState(res.mute, res.deaf);
            this.notifyState();
          }
        })
        .catch(console.error);
    }
  }

  toggleDeafen() {
    if (this.rpcClient) {
      const targetDeaf = !stateManager.state.selfDeafen;
      this.rpcClient.setVoiceSettings({ deaf: targetDeaf })
        .then((res) => {
          if (res) {
            stateManager.setSelfVoiceState(res.mute, res.deaf);
            this.notifyState();
          }
        })
        .catch(console.error);
    }
  }

  notifyState() {
    if (this.onStateChanged) {
      this.onStateChanged();
    }
  }

  async destroy() {
    this.unsubscribeFromCurrentChannel();
    if (this.rpcClient) {
      try {
        await this.rpcClient.destroy();
      } catch (e) { }
      this.rpcClient = null;
    }
  }
}

module.exports = DiscordService;
