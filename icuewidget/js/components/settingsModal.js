import { settingsManager } from '../settingsManager.js';

/**
 * Settings Modal Component Controller
 */
export function initSettingsModal(btnSettings, modalEl, btnClose, sliderEl, valueBadgeEl, presetBtns, cardWidthSliderEl, cardWidthBadgeEl) {
  if (!modalEl) return;

  function updateSliderDisplay() {
    const currentScale = settingsManager.getUiScale();
    if (valueBadgeEl) valueBadgeEl.innerText = `${currentScale}%`;
    if (sliderEl) sliderEl.value = currentScale;

    const currentCardW = settingsManager.getCardWidth();
    if (cardWidthBadgeEl) cardWidthBadgeEl.innerText = `${currentCardW}px`;
    if (cardWidthSliderEl) cardWidthSliderEl.value = currentCardW;

    presetBtns.forEach(btn => {
      const pVal = parseInt(btn.getAttribute('data-scale'), 10);
      if (pVal === currentScale) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function toggleModal() {
    const isOpening = modalEl.style.display !== 'block';
    
    if (isOpening) {
      settingsManager.applySettings(true); // Sync modal scale on open
      updateSliderDisplay();
      modalEl.style.display = 'block';
    } else {
      modalEl.style.display = 'none';
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

    btnSettings.addEventListener('pointerdown', handleSettingsClick, { capture: true });
    btnSettings.addEventListener('touchstart', handleSettingsClick, { capture: true, passive: false });
    btnSettings.addEventListener('click', handleSettingsClick, { capture: true });
  }

  if (btnClose) {
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      modalEl.style.display = 'none';
    });
  }

  if (sliderEl) {
    sliderEl.addEventListener('input', (e) => {
      const newScale = e.target.value;
      settingsManager.setUiScale(newScale, false);
      if (valueBadgeEl) valueBadgeEl.innerText = `${newScale}%`;

      presetBtns.forEach(btn => {
        const pVal = parseInt(btn.getAttribute('data-scale'), 10);
        if (pVal === parseInt(newScale, 10)) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    });
  }

  if (cardWidthSliderEl) {
    cardWidthSliderEl.addEventListener('input', (e) => {
      const newWidth = e.target.value;
      settingsManager.setCardWidth(newWidth);
      if (cardWidthBadgeEl) cardWidthBadgeEl.innerText = `${newWidth}px`;
    });
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pScale = btn.getAttribute('data-scale');
      if (pScale) {
        settingsManager.setUiScale(pScale, false);
        updateSliderDisplay();
      }
    });
  });
}

