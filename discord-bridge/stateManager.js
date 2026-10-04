const cacheManager = require('./cacheManager');

/**
 * Centralized State Store for Discord Voice Overview Widget
 */
class StateManager {
  constructor() {
    this.recentChannels = cacheManager.loadRecentChannels();

    this.state = {
      discordConnected: false,
      inVoice: false,
      currentUser: null,
      guildName: null,
      guildIcon: null,
      channelName: null,
      channelId: null,
      selfMute: false,
      selfDeafen: false,
      speakingUsers: new Set(),
      voiceMembers: new Map() // userId -> member object
    };
  }

  setDiscordConnected(connected) {
    this.state.discordConnected = connected;
    if (!connected) {
      this.state.inVoice = false;
      this.state.currentUser = null;
    }
  }

  setSelfUser(user) {
    if (!user) {
      this.state.currentUser = null;
      return;
    }
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    this.state.currentUser = {
      id: user.id,
      username: user.username,
      globalName: user.global_name || user.username,
      avatar: avatarUrl
    };
  }

  setVoiceChannel(channelId, channelName, guildName, guildIcon) {
    if (!channelId) {
      this.state.inVoice = false;
      this.state.channelId = null;
      this.state.channelName = null;
      this.state.guildName = null;
      this.state.guildIcon = null;
      this.state.voiceMembers.clear();
      this.state.speakingUsers.clear();
    } else {
      this.state.inVoice = true;
      this.state.channelId = channelId;
      this.state.channelName = channelName || 'Voice Channel';
      this.state.guildName = guildName || 'Discord Voice';
      this.state.guildIcon = guildIcon || null;

      const recentObj = {
        channelId,
        channelName: this.state.channelName,
        guildName: this.state.guildName,
        guildIcon: this.state.guildIcon,
        timestamp: Date.now()
      };

      this.recentChannels = cacheManager.addRecentChannel(recentObj);
    }
  }

  removeRecentChannel(channelId) {
    if (!channelId) return;
    this.recentChannels = cacheManager.removeRecentChannel(channelId);
  }

  setSelfVoiceState(mute, deafen) {
    this.state.selfMute = !!mute;
    this.state.selfDeafen = !!deafen;
  }

  updateMember(memberData) {
    if (!memberData || !memberData.user) return;
    const u = memberData.user;
    const vs = memberData.voice_state || {};
    
    this.state.voiceMembers.set(u.id, {
      id: u.id,
      username: u.username,
      displayName: memberData.nick || u.global_name || u.username,
      avatar: u.avatar
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`
        : 'https://cdn.discordapp.com/embed/avatars/0.png',
      mute: vs.mute || vs.self_mute || memberData.mute || false,
      deafen: vs.deaf || vs.self_deaf || false
    });
  }

  removeMember(userId) {
    this.state.voiceMembers.delete(userId);
    this.state.speakingUsers.delete(userId);
  }

  setSpeaking(userId, isSpeaking) {
    if (!userId) return;
    const verbose = process.env.VERBOSE_LOGGING === 'true';
    const member = this.state.voiceMembers.get(userId);
    const memberName = member ? (member.displayName || member.username) : userId;

    if (isSpeaking) {
      if (!this.state.speakingUsers.has(userId)) {
        if (verbose) console.log(`[Discord] ${memberName} START_SPEAKING`);
        this.state.speakingUsers.add(userId);
      }
    } else {
      if (this.state.speakingUsers.has(userId)) {
        if (verbose) console.log(`[Discord] ${memberName} STOP_SPEAKING`);
        this.state.speakingUsers.delete(userId);
      }
    }
  }

  getFormattedState() {
    return {
      discordConnected: this.state.discordConnected,
      inVoice: this.state.inVoice,
      currentUser: this.state.currentUser,
      guildName: this.state.guildName,
      guildIcon: this.state.guildIcon,
      channelName: this.state.channelName,
      channelId: this.state.channelId,
      selfMute: this.state.selfMute,
      selfDeafen: this.state.selfDeafen,
      recentChannels: this.recentChannels,
      members: Array.from(this.state.voiceMembers.values()).map((m) => ({
        ...m,
        isSpeaking: this.state.speakingUsers.has(m.id)
      }))
    };
  }
}

module.exports = new StateManager();
