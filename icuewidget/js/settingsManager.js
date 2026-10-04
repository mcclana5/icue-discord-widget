/**
 * Generic Client Settings & Preference Store with localStorage persistence
 */
const STORAGE_KEY = 'icue_widget_settings';

const DEFAULT_SETTINGS = {
  uiScale: 140,
  cardWidth: 140
};

class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS, ...this.load() };
    this.applySettings(true);
  }

  /**
   * Load settings from localStorage
   * @returns {Object}
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) { }
    return {};
  }

  /**
   * Save current settings to localStorage
   */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) { }
  }

  /**
   * Get a setting value
   * @param {string} key 
   * @returns {*}
   */
  get(key) {
    return this.settings[key];
  }

  /**
   * Set a setting value and apply changes
   * @param {string} key 
   * @param {*} value 
   * @param {boolean} updateModalScale 
   */
  set(key, value, updateModalScale = false) {
    this.settings[key] = value;
    this.save();
    this.applySettings(updateModalScale);
  }

  /**
   * Apply settings to the document DOM (e.g. CSS variables)
   * @param {boolean} updateModalScale 
   */
  applySettings(updateModalScale = false) {
    const scale = parseInt(this.settings.uiScale || 100, 10);
    const scaleFactor = (scale / 100).toFixed(2);
    const cardWidthPx = parseInt(this.settings.cardWidth || 140, 10);

    document.documentElement.style.setProperty('--ui-scale', scaleFactor);
    document.documentElement.style.setProperty('--card-width-px', `${cardWidthPx}px`);

    if (updateModalScale) {
      document.documentElement.style.setProperty('--modal-scale', scaleFactor);
    }
  }

  /**
   * Get current UI scale percentage
   * @returns {number}
   */
  getUiScale() {
    return parseInt(this.settings.uiScale || 100, 10);
  }

  /**
   * Set UI scale percentage
   * @param {number|string} scalePercentage 
   * @param {boolean} updateModalScale 
   */
  setUiScale(scalePercentage, updateModalScale = false) {
    this.set('uiScale', parseInt(scalePercentage, 10), updateModalScale);
  }

  /**
   * Get recent channel card width in pixels
   * @returns {number}
   */
  getCardWidth() {
    return parseInt(this.settings.cardWidth || 140, 10);
  }

  /**
   * Set recent channel card width in pixels
   * @param {number|string} widthPx 
   */
  setCardWidth(widthPx) {
    this.set('cardWidth', parseInt(widthPx, 10), false);
  }
}

export const settingsManager = new SettingsManager();

