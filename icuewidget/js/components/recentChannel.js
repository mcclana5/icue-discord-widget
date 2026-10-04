import { ACTIONS } from '../actions.js';
import { attachButtonHandler } from './controls.js';

/**
 * Render Grid of Recent Voice Channel Cards
 * @param {HTMLElement} gridEl 
 * @param {HTMLElement} idleWrapEl 
 * @param {HTMLElement} emptyTextEl 
 * @param {Array|Object} recentData 
 * @param {Function} sendAction 
 */
export function renderRecentChannels(gridEl, idleWrapEl, emptyTextEl, recentData, sendAction) {
  let channels = [];
  if (Array.isArray(recentData)) {
    channels = recentData;
  } else if (recentData && recentData.channelId) {
    channels = [recentData];
  }

  if (channels.length === 0) {
    if (gridEl) {
      gridEl.style.display = 'none';
      gridEl.innerHTML = '';
    }
    if (idleWrapEl) idleWrapEl.style.display = 'flex';
    if (emptyTextEl) emptyTextEl.innerText = 'No recent voice channels';
    return;
  }

  if (idleWrapEl) idleWrapEl.style.display = 'none';
  if (!gridEl) return;

  gridEl.style.display = 'flex';
  gridEl.innerHTML = '';

  channels.forEach((ch) => {
    const card = document.createElement('div');
    card.className = 'recent-card';

    // Remove 'X' button in top right
    const removeBtn = document.createElement('button');
    removeBtn.className = 'recent-card-remove';
    removeBtn.setAttribute('title', 'Remove from recent history');
    removeBtn.setAttribute('aria-label', 'Remove from recent history');
    removeBtn.innerText = '✕';

    removeBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      sendAction({ action: ACTIONS.REMOVE_RECENT_CHANNEL, channelId: ch.channelId });
    };

    // Guild Icon / Avatar
    let iconEl;
    if (ch.guildIcon) {
      iconEl = document.createElement('img');
      iconEl.className = 'recent-card-icon';
      iconEl.src = ch.guildIcon;
      iconEl.alt = ch.guildName || 'Server Icon';
    } else {
      iconEl = document.createElement('div');
      iconEl.className = 'recent-card-icon';
      const initial = (ch.guildName || 'S').charAt(0).toUpperCase();
      iconEl.innerText = initial;
    }

    // Info wrapper
    const infoWrap = document.createElement('div');
    infoWrap.className = 'recent-card-info';

    const guildSpan = document.createElement('span');
    guildSpan.className = 'recent-card-guild';
    guildSpan.innerText = ch.guildName || 'Discord Server';

    const channelSpan = document.createElement('span');
    channelSpan.className = 'recent-card-channel';
    channelSpan.innerText = '🔊 ' + (ch.channelName || 'Voice Channel');

    infoWrap.appendChild(guildSpan);
    infoWrap.appendChild(channelSpan);

    // Join Button
    const joinBtn = document.createElement('button');
    joinBtn.className = 'recent-card-join';
    joinBtn.innerText = 'Join Voice';

    attachButtonHandler(joinBtn, { action: ACTIONS.JOIN_RECENT_VOICE, channelId: ch.channelId }, sendAction);

    card.appendChild(removeBtn);
    card.appendChild(iconEl);
    card.appendChild(infoWrap);
    card.appendChild(joinBtn);

    gridEl.appendChild(card);
  });
}

