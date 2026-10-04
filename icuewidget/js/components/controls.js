const MIC_UNMUTED_SVG = `<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a1 1 0 0 0-2 0 3 3 0 0 1-6 0 1 1 0 0 0-2 0 5 5 0 0 0 4 4.9V19H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-3.1A5 5 0 0 0 17 11z"/></svg>`;

const MIC_MUTED_SVG = `<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a1 1 0 0 0-2 0 3 3 0 0 1-6 0 1 1 0 0 0-2 0 5 5 0 0 0 4 4.9V19H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-3.1A5 5 0 0 0 17 11z"/><line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/></svg>`;

const DEAFEN_OFF_SVG = `<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 0 0-9 9v7a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5v-2a7 7 0 0 1 14 0v2h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3v-7a9 9 0 0 0-9-9z"/></svg>`;

const DEAFEN_ON_SVG = `<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 0 0-9 9v7a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5v-2a7 7 0 0 1 14 0v2h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3v-7a9 9 0 0 0-9-9z"/><line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/></svg>`;

/**
 * Action Controls Bar Component (Mute, Deafen, Disconnect)
 */

/**
 * Update Mute, Deafen, and Disconnect button active states & labels
 */
export function updateActionControls(btnMute, btnDeafen, btnDisconnect, muted, deafened, inVoice) {
  if (btnMute) {
    if (muted) {
      btnMute.classList.add('active-muted');
      btnMute.innerHTML = `${MIC_MUTED_SVG}<span class="btn-label">Unmute</span>`;
    } else {
      btnMute.classList.remove('active-muted');
      btnMute.innerHTML = `${MIC_UNMUTED_SVG}<span class="btn-label">Mute</span>`;
    }
  }

  if (btnDeafen) {
    if (deafened) {
      btnDeafen.classList.add('active-muted');
      btnDeafen.innerHTML = `${DEAFEN_ON_SVG}<span class="btn-label">Undeafen</span>`;
    } else {
      btnDeafen.classList.remove('active-muted');
      btnDeafen.innerHTML = `${DEAFEN_OFF_SVG}<span class="btn-label">Deafen</span>`;
    }
  }

  if (btnDisconnect) {
    btnDisconnect.style.display = inVoice ? 'flex' : 'none';
  }
}

/**
 * Attach multi-input capture event listener (pointerdown, touchstart, click)
 * @param {HTMLElement} btn 
 * @param {Object|string} actionPayload 
 * @param {Function} sendAction 
 */
export function attachButtonHandler(btn, actionPayload, sendAction) {
  if (!btn) return;
  let lastTrigger = 0;

  const handler = (e) => {
    const now = Date.now();
    if (now - lastTrigger < 300) return;
    lastTrigger = now;

    if (e && e.cancelable) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const payload = typeof actionPayload === 'string' ? { action: actionPayload } : actionPayload;
    console.log(`[Widget Action] ${payload.action} triggered via ${e ? e.type : 'event'}`);
    sendAction(payload);
  };

  btn.addEventListener('pointerdown', handler, { capture: true });
  btn.addEventListener('touchstart', handler, { capture: true, passive: false });
  btn.addEventListener('click', handler, { capture: true });
}
