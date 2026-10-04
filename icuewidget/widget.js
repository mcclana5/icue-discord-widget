(() => {
  // icuewidget/js/actions.js
  var ACTIONS = Object.freeze({
    TOGGLE_MUTE: "TOGGLE_MUTE",
    TOGGLE_DEAFEN: "TOGGLE_DEAFEN",
    LEAVE_VOICE: "LEAVE_VOICE",
    JOIN_RECENT_VOICE: "JOIN_RECENT_VOICE",
    REMOVE_RECENT_CHANNEL: "REMOVE_RECENT_CHANNEL",
    REFRESH: "REFRESH"
  });

  // icuewidget/js/settingsManager.js
  var STORAGE_KEY = "icue_widget_settings";
  var DEFAULT_SETTINGS = {
    uiScale: 140,
    cardWidth: 140
  };
  var SettingsManager = class {
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
      } catch (e) {
      }
      return {};
    }
    /**
     * Save current settings to localStorage
     */
    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch (e) {
      }
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
      document.documentElement.style.setProperty("--ui-scale", scaleFactor);
      document.documentElement.style.setProperty("--card-width-px", `${cardWidthPx}px`);
      if (updateModalScale) {
        document.documentElement.style.setProperty("--modal-scale", scaleFactor);
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
      this.set("uiScale", parseInt(scalePercentage, 10), updateModalScale);
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
      this.set("cardWidth", parseInt(widthPx, 10), false);
    }
  };
  var settingsManager = new SettingsManager();

  // icuewidget/js/socketClient.js
  var SocketClient = class {
    constructor(url = "ws://localhost:8080", onMessageCallback, onStatusCallback) {
      this.url = url;
      this.onMessageCallback = onMessageCallback;
      this.onStatusCallback = onStatusCallback;
      this.socket = null;
      this.reconnectTimer = null;
      this.reconnectInterval = 2e3;
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
        console.log("[Widget] Connected to Discord Bridge.");
        if (this.onStatusCallback) this.onStatusCallback("online", "Connected");
        this.reconnectInterval = 2e3;
      };
      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "STATE_UPDATE" && this.onMessageCallback) {
            this.onMessageCallback(payload.data);
          }
        } catch (err) {
          console.error("[Widget] Socket parse error:", err);
        }
      };
      this.socket.onclose = () => {
        console.warn("[Widget] Connection lost. Retrying...");
        if (this.onStatusCallback) this.onStatusCallback("disconnected", "Disconnected");
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, this.reconnectInterval);
          this.reconnectInterval = Math.min(this.reconnectInterval * 1.5, 1e4);
        }
      };
      this.socket.onerror = (err) => {
        console.error("[Widget] Socket error:", err);
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
  };

  // icuewidget/js/components/voiceChannel.js
  var DEAFENED_BADGE_SVG = `<svg class="icon-badge" viewBox="0 0 24 24" aria-hidden="true"><path fill="#949ba4" d="M12 3a9 9 0 0 0-9 9v7a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5v-2a7 7 0 0 1 14 0v2h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3v-7a9 9 0 0 0-9-9z"/><line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="#f23f43" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  var MUTED_BADGE_SVG = `<svg class="icon-badge" viewBox="0 0 24 24" aria-hidden="true"><path fill="#949ba4" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a1 1 0 0 0-2 0 3 3 0 0 1-6 0 1 1 0 0 0-2 0 5 5 0 0 0 4 4.9V19H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-3.1A5 5 0 0 0 17 11z"/><line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="#f23f43" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  function renderVoiceChannelHeader(guildRowEl, guildIconEl, guildNameEl, channelNameEl, memberCountEl, data) {
    if (guildRowEl) {
      guildRowEl.style.display = "flex";
      if (guildNameEl) guildNameEl.innerText = data.guildName || "Discord Server";
      if (guildIconEl) {
        if (data.guildIcon) {
          guildIconEl.src = data.guildIcon;
          guildIconEl.style.display = "inline-block";
        } else {
          guildIconEl.style.display = "none";
        }
      }
    }
    if (channelNameEl) channelNameEl.innerText = "\u{1F50A} " + (data.channelName || "Voice Channel");
    const membersList = data.members || [];
    if (memberCountEl) {
      memberCountEl.style.display = "inline-block";
      memberCountEl.innerText = membersList.length + " connected";
    }
  }
  function updateMembersGrid(membersGrid, members) {
    if (!membersGrid) return;
    const existingCards = /* @__PURE__ */ new Map();
    membersGrid.querySelectorAll(".member-card").forEach((card) => {
      existingCards.set(card.getAttribute("data-id"), card);
    });
    const activeIds = new Set(members.map((m) => m.id));
    existingCards.forEach((card, id) => {
      if (!activeIds.has(id)) {
        card.style.opacity = "0";
        card.style.transform = "translateY(-6px)";
        setTimeout(() => card.remove(), 200);
      }
    });
    members.forEach((m) => {
      let card = existingCards.get(m.id);
      if (!card) {
        card = document.createElement("div");
        card.className = "member-card joining";
        card.setAttribute("data-id", m.id);
        const wrapper2 = document.createElement("div");
        wrapper2.className = "avatar-wrapper";
        const img = document.createElement("img");
        img.className = "avatar-img";
        img.src = m.avatar;
        img.alt = m.displayName;
        wrapper2.appendChild(img);
        const nameLabel = document.createElement("span");
        nameLabel.className = "member-name";
        nameLabel.innerText = m.displayName;
        const statusIcons = document.createElement("div");
        statusIcons.className = "member-status-icons";
        const badge2 = document.createElement("div");
        badge2.className = "badge-overlay";
        badge2.style.display = "none";
        statusIcons.appendChild(badge2);
        card.appendChild(wrapper2);
        card.appendChild(nameLabel);
        card.appendChild(statusIcons);
        membersGrid.appendChild(card);
        requestAnimationFrame(() => {
          card.classList.remove("joining");
        });
      }
      const wrapper = card.querySelector(".avatar-wrapper");
      if (m.isSpeaking) {
        wrapper.classList.add("speaking");
      } else {
        wrapper.classList.remove("speaking");
      }
      const badge = card.querySelector(".badge-overlay");
      if (m.mute || m.deafen) {
        badge.style.display = "flex";
        badge.innerHTML = m.deafen ? DEAFENED_BADGE_SVG : MUTED_BADGE_SVG;
      } else {
        badge.style.display = "none";
      }
    });
  }

  // icuewidget/js/components/controls.js
  var MIC_UNMUTED_SVG = `<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a1 1 0 0 0-2 0 3 3 0 0 1-6 0 1 1 0 0 0-2 0 5 5 0 0 0 4 4.9V19H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-3.1A5 5 0 0 0 17 11z"/></svg>`;
  var MIC_MUTED_SVG = `<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a1 1 0 0 0-2 0 3 3 0 0 1-6 0 1 1 0 0 0-2 0 5 5 0 0 0 4 4.9V19H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-3.1A5 5 0 0 0 17 11z"/><line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  var DEAFEN_OFF_SVG = `<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 0 0-9 9v7a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5v-2a7 7 0 0 1 14 0v2h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3v-7a9 9 0 0 0-9-9z"/></svg>`;
  var DEAFEN_ON_SVG = `<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 0 0-9 9v7a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5v-2a7 7 0 0 1 14 0v2h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3v-7a9 9 0 0 0-9-9z"/><line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  function updateActionControls(btnMute, btnDeafen, btnDisconnect, muted, deafened, inVoice) {
    if (btnMute) {
      if (muted) {
        btnMute.classList.add("active-muted");
        btnMute.innerHTML = `${MIC_MUTED_SVG}<span class="btn-label">Unmute</span>`;
      } else {
        btnMute.classList.remove("active-muted");
        btnMute.innerHTML = `${MIC_UNMUTED_SVG}<span class="btn-label">Mute</span>`;
      }
    }
    if (btnDeafen) {
      if (deafened) {
        btnDeafen.classList.add("active-muted");
        btnDeafen.innerHTML = `${DEAFEN_ON_SVG}<span class="btn-label">Undeafen</span>`;
      } else {
        btnDeafen.classList.remove("active-muted");
        btnDeafen.innerHTML = `${DEAFEN_OFF_SVG}<span class="btn-label">Deafen</span>`;
      }
    }
    if (btnDisconnect) {
      btnDisconnect.style.display = inVoice ? "flex" : "none";
    }
  }
  function attachButtonHandler(btn, actionPayload, sendAction) {
    if (!btn) return;
    let lastTrigger = 0;
    const handler = (e) => {
      const now = Date.now();
      if (now - lastTrigger < 300) return;
      lastTrigger = now;
      if (e && e.cancelable) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      const payload = typeof actionPayload === "string" ? { action: actionPayload } : actionPayload;
      console.log(`[Widget Action] ${payload.action} triggered via ${e ? e.type : "event"}`);
      sendAction(payload);
    };
    btn.addEventListener("pointerdown", handler, { capture: true });
    btn.addEventListener("touchstart", handler, { capture: true, passive: false });
    btn.addEventListener("click", handler, { capture: true });
  }

  // icuewidget/js/components/recentChannel.js
  function renderRecentChannels(gridEl, idleWrapEl, emptyTextEl, recentData, sendAction) {
    let channels = [];
    if (Array.isArray(recentData)) {
      channels = recentData;
    } else if (recentData && recentData.channelId) {
      channels = [recentData];
    }
    if (channels.length === 0) {
      if (gridEl) {
        gridEl.style.display = "none";
        gridEl.innerHTML = "";
      }
      if (idleWrapEl) idleWrapEl.style.display = "flex";
      if (emptyTextEl) emptyTextEl.innerText = "No recent voice channels";
      return;
    }
    if (idleWrapEl) idleWrapEl.style.display = "none";
    if (!gridEl) return;
    gridEl.style.display = "flex";
    gridEl.innerHTML = "";
    channels.forEach((ch) => {
      const card = document.createElement("div");
      card.className = "recent-card";
      const removeBtn = document.createElement("button");
      removeBtn.className = "recent-card-remove";
      removeBtn.setAttribute("title", "Remove from recent history");
      removeBtn.setAttribute("aria-label", "Remove from recent history");
      removeBtn.innerText = "\u2715";
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        sendAction({ action: ACTIONS.REMOVE_RECENT_CHANNEL, channelId: ch.channelId });
      };
      let iconEl;
      if (ch.guildIcon) {
        iconEl = document.createElement("img");
        iconEl.className = "recent-card-icon";
        iconEl.src = ch.guildIcon;
        iconEl.alt = ch.guildName || "Server Icon";
      } else {
        iconEl = document.createElement("div");
        iconEl.className = "recent-card-icon";
        const initial = (ch.guildName || "S").charAt(0).toUpperCase();
        iconEl.innerText = initial;
      }
      const infoWrap = document.createElement("div");
      infoWrap.className = "recent-card-info";
      const guildSpan = document.createElement("span");
      guildSpan.className = "recent-card-guild";
      guildSpan.innerText = ch.guildName || "Discord Server";
      const channelSpan = document.createElement("span");
      channelSpan.className = "recent-card-channel";
      channelSpan.innerText = "\u{1F50A} " + (ch.channelName || "Voice Channel");
      infoWrap.appendChild(guildSpan);
      infoWrap.appendChild(channelSpan);
      const joinBtn = document.createElement("button");
      joinBtn.className = "recent-card-join";
      joinBtn.innerText = "Join Voice";
      attachButtonHandler(joinBtn, { action: ACTIONS.JOIN_RECENT_VOICE, channelId: ch.channelId }, sendAction);
      card.appendChild(removeBtn);
      card.appendChild(iconEl);
      card.appendChild(infoWrap);
      card.appendChild(joinBtn);
      gridEl.appendChild(card);
    });
  }

  // icuewidget/js/components/settingsModal.js
  function initSettingsModal(btnSettings, modalEl, btnClose, sliderEl, valueBadgeEl, presetBtns, cardWidthSliderEl, cardWidthBadgeEl) {
    if (!modalEl) return;
    function updateSliderDisplay() {
      const currentScale = settingsManager.getUiScale();
      if (valueBadgeEl) valueBadgeEl.innerText = `${currentScale}%`;
      if (sliderEl) sliderEl.value = currentScale;
      const currentCardW = settingsManager.getCardWidth();
      if (cardWidthBadgeEl) cardWidthBadgeEl.innerText = `${currentCardW}px`;
      if (cardWidthSliderEl) cardWidthSliderEl.value = currentCardW;
      presetBtns.forEach((btn) => {
        const pVal = parseInt(btn.getAttribute("data-scale"), 10);
        if (pVal === currentScale) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    function toggleModal() {
      const isOpening = modalEl.style.display !== "block";
      if (isOpening) {
        settingsManager.applySettings(true);
        updateSliderDisplay();
        modalEl.style.display = "block";
      } else {
        modalEl.style.display = "none";
      }
    }
    if (btnSettings) {
      let lastSetTrigger = 0;
      const handleSettingsClick = (e) => {
        const now = Date.now();
        if (now - lastSetTrigger < 300) return;
        lastSetTrigger = now;
        if (e && e.cancelable) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        toggleModal();
      };
      btnSettings.addEventListener("pointerdown", handleSettingsClick, { capture: true });
      btnSettings.addEventListener("touchstart", handleSettingsClick, { capture: true, passive: false });
      btnSettings.addEventListener("click", handleSettingsClick, { capture: true });
    }
    if (btnClose) {
      btnClose.addEventListener("click", (e) => {
        e.stopPropagation();
        modalEl.style.display = "none";
      });
    }
    if (sliderEl) {
      sliderEl.addEventListener("input", (e) => {
        const newScale = e.target.value;
        settingsManager.setUiScale(newScale, false);
        if (valueBadgeEl) valueBadgeEl.innerText = `${newScale}%`;
        presetBtns.forEach((btn) => {
          const pVal = parseInt(btn.getAttribute("data-scale"), 10);
          if (pVal === parseInt(newScale, 10)) {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        });
      });
    }
    if (cardWidthSliderEl) {
      cardWidthSliderEl.addEventListener("input", (e) => {
        const newWidth = e.target.value;
        settingsManager.setCardWidth(newWidth);
        if (cardWidthBadgeEl) cardWidthBadgeEl.innerText = `${newWidth}px`;
      });
    }
    presetBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const pScale = btn.getAttribute("data-scale");
        if (pScale) {
          settingsManager.setUiScale(pScale, false);
          updateSliderDisplay();
        }
      });
    });
  }

  // icuewidget/js/widget.js
  (function() {
    const statusDot = document.getElementById("status-dot");
    const statusText = document.getElementById("status-text");
    const userAvatarEl = document.getElementById("user-avatar");
    const channelInfoEl = document.getElementById("channel-info");
    const guildRowEl = document.getElementById("guild-row");
    const guildIconEl = document.getElementById("guild-icon");
    const guildNameEl = document.getElementById("guild-name");
    const channelNameEl = document.getElementById("channel-name");
    const memberCountEl = document.getElementById("member-count");
    const membersGrid = document.getElementById("members-grid");
    const emptyState = document.getElementById("empty-state");
    const emptyText = document.getElementById("empty-text");
    const idleStatusWrap = document.getElementById("idle-status-wrap");
    const recentChannelsGrid = document.getElementById("recent-channels-grid");
    const bridgeOnboardingCard = document.getElementById("bridge-onboarding-card");
    const controlsBar = document.getElementById("controls-bar");
    const btnMute = document.getElementById("btn-mute");
    const btnDeafen = document.getElementById("btn-deafen");
    const btnDisconnect = document.getElementById("btn-disconnect");
    const btnSettings = document.getElementById("btn-settings");
    const settingsModal = document.getElementById("settings-modal");
    const btnCloseSettings = document.getElementById("btn-close-settings");
    const scaleSlider = document.getElementById("scale-slider");
    const scaleValueBadge = document.getElementById("scale-value");
    const presetButtons = document.querySelectorAll(".preset-btn");
    const cardWidthSlider = document.getElementById("card-width-slider");
    const cardWidthValueBadge = document.getElementById("card-width-value");
    initSettingsModal(btnSettings, settingsModal, btnCloseSettings, scaleSlider, scaleValueBadge, presetButtons, cardWidthSlider, cardWidthValueBadge);
    const socketClient = new SocketClient(
      "ws://localhost:8080",
      (data) => renderState(data),
      (statusClass, text) => {
        if (statusDot) statusDot.className = `status-dot ${statusClass}`;
        if (statusText) statusText.innerText = text;
        if (statusClass === "disconnected") renderDisconnectedState();
      }
    );
    function sendAction(payload) {
      socketClient.send(payload);
    }
    attachButtonHandler(btnMute, ACTIONS.TOGGLE_MUTE, sendAction);
    attachButtonHandler(btnDeafen, ACTIONS.TOGGLE_DEAFEN, sendAction);
    attachButtonHandler(btnDisconnect, ACTIONS.LEAVE_VOICE, sendAction);
    function renderState(data) {
      if (data.discordConnected && data.currentUser && data.currentUser.avatar) {
        if (userAvatarEl) {
          userAvatarEl.src = data.currentUser.avatar;
          userAvatarEl.title = `Logged in as ${data.currentUser.globalName || data.currentUser.username}`;
          userAvatarEl.style.display = "inline-block";
        }
      } else {
        if (userAvatarEl) userAvatarEl.style.display = "none";
      }
      if (!data.discordConnected) {
        if (channelInfoEl) channelInfoEl.style.display = "none";
        if (membersGrid) membersGrid.style.display = "none";
        if (emptyState) emptyState.style.display = "flex";
        if (recentChannelsGrid) recentChannelsGrid.style.display = "none";
        if (idleStatusWrap) idleStatusWrap.style.display = "flex";
        if (bridgeOnboardingCard) bridgeOnboardingCard.style.display = "flex";
        if (emptyText) emptyText.innerText = "Waiting for Discord Desktop App...";
        if (controlsBar) controlsBar.style.display = "none";
        updateActionControls(btnMute, btnDeafen, btnDisconnect, false, false, false);
        return;
      }
      if (bridgeOnboardingCard) bridgeOnboardingCard.style.display = "none";
      if (!data.inVoice) {
        if (channelInfoEl) channelInfoEl.style.display = "none";
        if (membersGrid) membersGrid.style.display = "none";
        if (emptyState) emptyState.style.display = "flex";
        if (controlsBar) controlsBar.style.display = "none";
        const recentList = data.recentChannels || (data.recentChannel ? [data.recentChannel] : []);
        renderRecentChannels(recentChannelsGrid, idleStatusWrap, emptyText, recentList, sendAction);
        updateActionControls(btnMute, btnDeafen, btnDisconnect, data.selfMute, data.selfDeafen, false);
        return;
      }
      if (emptyState) emptyState.style.display = "none";
      if (channelInfoEl) channelInfoEl.style.display = "block";
      if (membersGrid) membersGrid.style.display = "flex";
      if (controlsBar) controlsBar.style.display = "flex";
      renderVoiceChannelHeader(guildRowEl, guildIconEl, guildNameEl, channelNameEl, memberCountEl, data);
      updateMembersGrid(membersGrid, data.members || []);
      updateActionControls(btnMute, btnDeafen, btnDisconnect, data.selfMute, data.selfDeafen, true);
    }
    function renderDisconnectedState() {
      if (userAvatarEl) userAvatarEl.style.display = "none";
      if (channelInfoEl) channelInfoEl.style.display = "none";
      if (membersGrid) membersGrid.style.display = "none";
      if (emptyState) emptyState.style.display = "flex";
      if (recentChannelsGrid) recentChannelsGrid.style.display = "none";
      if (idleStatusWrap) idleStatusWrap.style.display = "flex";
      if (bridgeOnboardingCard) bridgeOnboardingCard.style.display = "flex";
      if (emptyText) emptyText.innerText = "Reconnecting to local bridge...";
      if (controlsBar) controlsBar.style.display = "none";
    }
    socketClient.connect();
  })();
})();
