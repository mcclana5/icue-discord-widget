const fs = require('fs');
const path = require('path');

const getStorageDir = () => {
  try {
    const baseDir = process.env.LOCALAPPDATA || process.env.APPDATA || __dirname;
    const targetDir = path.join(baseDir, 'DiscordICUEBridge');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  } catch (e) {
    return __dirname;
  }
};

const STORAGE_DIR = getStorageDir();
const TOKEN_FILE = path.join(STORAGE_DIR, '.token.json');
const RECENT_CHANNEL_FILE = path.join(STORAGE_DIR, '.recent_channel.json');

/**
 * Dedicated persistence manager for backend JSON file caches
 */
class CacheManager {
  /**
   * Load saved OAuth access token
   * @returns {string|null}
   */
  loadToken() {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        return data.accessToken || null;
      }
    } catch (e) { }
    return null;
  }

  /**
   * Save OAuth access token
   * @param {string} accessToken 
   */
  saveToken(accessToken) {
    if (!accessToken) return;
    try {
      fs.writeFileSync(TOKEN_FILE, JSON.stringify({ accessToken }), 'utf8');
    } catch (e) { }
  }

  /**
   * Clear saved OAuth token
   */
  clearToken() {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        fs.unlinkSync(TOKEN_FILE);
      }
    } catch (e) { }
  }

  /**
   * Load recent voice channels array
   * @returns {Array}
   */
  loadRecentChannels() {
    try {
      if (fs.existsSync(RECENT_CHANNEL_FILE)) {
        const raw = fs.readFileSync(RECENT_CHANNEL_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        } else if (parsed && typeof parsed === 'object' && parsed.channelId) {
          return [parsed];
        }
      }
    } catch (e) { }
    return [];
  }

  /**
   * Save recent voice channels array to disk
   * @param {Array} channelsArray 
   */
  saveRecentChannels(channelsArray) {
    try {
      const list = Array.isArray(channelsArray) ? channelsArray : [];
      fs.writeFileSync(RECENT_CHANNEL_FILE, JSON.stringify(list), 'utf8');
    } catch (e) { }
  }

  /**
   * Add or update a recent voice channel
   * @param {Object} channelObj 
   * @returns {Array}
   */
  addRecentChannel(channelObj) {
    if (!channelObj || !channelObj.channelId) return this.loadRecentChannels();

    let list = this.loadRecentChannels();
    // Filter out existing instance of the same channelId
    list = list.filter(item => item.channelId !== channelObj.channelId);
    // Add new channel to top of array
    list.unshift(channelObj);
    // Keep top 6 channels max
    if (list.length > 6) {
      list = list.slice(0, 6);
    }

    this.saveRecentChannels(list);
    return list;
  }

  /**
   * Remove a channel from recent channels array by channelId
   * @param {string} channelId 
   * @returns {Array}
   */
  removeRecentChannel(channelId) {
    if (!channelId) return this.loadRecentChannels();
    let list = this.loadRecentChannels();
    list = list.filter(item => item.channelId !== channelId);
    this.saveRecentChannels(list);
    return list;
  }
}

module.exports = new CacheManager();
