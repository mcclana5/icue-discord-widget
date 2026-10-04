import { ACTIONS } from './actions.js';
import { settingsManager } from './settingsManager.js';
import { SocketClient } from './socketClient.js';
import { renderVoiceChannelHeader, updateMembersGrid } from './components/voiceChannel.js';
import { renderRecentChannels } from './components/recentChannel.js';
import { updateActionControls, attachButtonHandler } from './components/controls.js';
import { initSettingsModal } from './components/settingsModal.js';

(function () {
  // DOM Elements
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const userAvatarEl = document.getElementById('user-avatar');
  const channelInfoEl = document.getElementById('channel-info');
  const guildRowEl = document.getElementById('guild-row');
  const guildIconEl = document.getElementById('guild-icon');
  const guildNameEl = document.getElementById('guild-name');
  const channelNameEl = document.getElementById('channel-name');
  const memberCountEl = document.getElementById('member-count');
  const membersGrid = document.getElementById('members-grid');
  const emptyState = document.getElementById('empty-state');
  const emptyText = document.getElementById('empty-text');
  const idleStatusWrap = document.getElementById('idle-status-wrap');
  const recentChannelsGrid = document.getElementById('recent-channels-grid');
  const bridgeOnboardingCard = document.getElementById('bridge-onboarding-card');
  const controlsBar = document.getElementById('controls-bar');

  const btnMute = document.getElementById('btn-mute');
  const btnDeafen = document.getElementById('btn-deafen');
  const btnDisconnect = document.getElementById('btn-disconnect');
  const btnSettings = document.getElementById('btn-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const scaleSlider = document.getElementById('scale-slider');
  const scaleValueBadge = document.getElementById('scale-value');
  const presetButtons = document.querySelectorAll('.preset-btn');
  const cardWidthSlider = document.getElementById('card-width-slider');
  const cardWidthValueBadge = document.getElementById('card-width-value');
  const btnToggleOnboarding = document.getElementById('btn-toggle-onboarding');
  const onboardingToggleIcon = document.getElementById('onboarding-toggle-icon');

  function updateOnboardingState(minimized) {
    if (!bridgeOnboardingCard) return;
    if (minimized) {
      bridgeOnboardingCard.classList.add('minimized');
      if (onboardingToggleIcon) {
        onboardingToggleIcon.innerHTML = '<path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>';
      }
    } else {
      bridgeOnboardingCard.classList.remove('minimized');
      if (onboardingToggleIcon) {
        onboardingToggleIcon.innerHTML = '<path fill="currentColor" d="M19 13H5v-2h14v2z"/>';
      }
    }
  }

  let isOnboardingMinimized = localStorage.getItem('icue_onboarding_minimized') === 'true';
  updateOnboardingState(isOnboardingMinimized);

  if (btnToggleOnboarding) {
    btnToggleOnboarding.addEventListener('click', (e) => {
      e.stopPropagation();
      isOnboardingMinimized = !isOnboardingMinimized;
      localStorage.setItem('icue_onboarding_minimized', isOnboardingMinimized ? 'true' : 'false');
      updateOnboardingState(isOnboardingMinimized);
    });
  }

  if (bridgeOnboardingCard) {
    bridgeOnboardingCard.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (isOnboardingMinimized) {
        isOnboardingMinimized = false;
        localStorage.setItem('icue_onboarding_minimized', 'false');
        updateOnboardingState(false);
      }
    });
  }

  // Initialize Settings Modal & Settings Manager
  initSettingsModal(btnSettings, settingsModal, btnCloseSettings, scaleSlider, scaleValueBadge, presetButtons, cardWidthSlider, cardWidthValueBadge);

  // Initialize WebSocket Client
  const socketClient = new SocketClient(
    'ws://localhost:8080',
    (data) => renderState(data),
    (statusClass, text) => {
      if (statusDot) statusDot.className = `status-dot ${statusClass}`;
      if (statusText) statusText.innerText = text;
      if (statusClass === 'disconnected') renderDisconnectedState();
    }
  );

  function sendAction(payload) {
    socketClient.send(payload);
  }

  // Attach Action Button Handlers
  attachButtonHandler(btnMute, ACTIONS.TOGGLE_MUTE, sendAction);
  attachButtonHandler(btnDeafen, ACTIONS.TOGGLE_DEAFEN, sendAction);
  attachButtonHandler(btnDisconnect, ACTIONS.LEAVE_VOICE, sendAction);

  // Render App State
  function renderState(data) {
    if (data.discordConnected && data.currentUser && data.currentUser.avatar) {
      if (userAvatarEl) {
        userAvatarEl.src = data.currentUser.avatar;
        userAvatarEl.title = `Logged in as ${data.currentUser.globalName || data.currentUser.username}`;
        userAvatarEl.style.display = 'inline-block';
      }
    } else {
      if (userAvatarEl) userAvatarEl.style.display = 'none';
    }

    if (!data.discordConnected) {
      if (channelInfoEl) channelInfoEl.style.display = 'none';
      if (membersGrid) membersGrid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      if (recentChannelsGrid) recentChannelsGrid.style.display = 'none';
      if (idleStatusWrap) idleStatusWrap.style.display = 'flex';
      if (bridgeOnboardingCard) bridgeOnboardingCard.style.display = 'flex';
      if (emptyText) emptyText.innerText = 'Waiting for Discord Desktop App...';
      if (controlsBar) controlsBar.style.display = 'none';
      updateActionControls(btnMute, btnDeafen, btnDisconnect, false, false, false);
      return;
    }

    // Connected to Discord Bridge
    if (bridgeOnboardingCard) bridgeOnboardingCard.style.display = 'none';

    if (!data.inVoice) {
      if (channelInfoEl) channelInfoEl.style.display = 'none';
      if (membersGrid) membersGrid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      if (controlsBar) controlsBar.style.display = 'none';

      const recentList = data.recentChannels || (data.recentChannel ? [data.recentChannel] : []);
      renderRecentChannels(recentChannelsGrid, idleStatusWrap, emptyText, recentList, sendAction);
      updateActionControls(btnMute, btnDeafen, btnDisconnect, data.selfMute, data.selfDeafen, false);
      return;
    }

    // Active in Voice Channel
    if (emptyState) emptyState.style.display = 'none';
    if (channelInfoEl) channelInfoEl.style.display = 'block';
    if (membersGrid) membersGrid.style.display = 'flex';
    if (controlsBar) controlsBar.style.display = 'flex';

    renderVoiceChannelHeader(guildRowEl, guildIconEl, guildNameEl, channelNameEl, memberCountEl, data);
    updateMembersGrid(membersGrid, data.members || []);
    updateActionControls(btnMute, btnDeafen, btnDisconnect, data.selfMute, data.selfDeafen, true);
  }

  function renderDisconnectedState() {
    if (userAvatarEl) userAvatarEl.style.display = 'none';
    if (channelInfoEl) channelInfoEl.style.display = 'none';
    if (membersGrid) membersGrid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
    if (recentChannelsGrid) recentChannelsGrid.style.display = 'none';
    if (idleStatusWrap) idleStatusWrap.style.display = 'flex';
    if (bridgeOnboardingCard) bridgeOnboardingCard.style.display = 'flex';
    if (emptyText) emptyText.innerText = 'Reconnecting to local bridge...';
    if (controlsBar) controlsBar.style.display = 'none';
  }

  // Connect WebSocket
  socketClient.connect();
})();

