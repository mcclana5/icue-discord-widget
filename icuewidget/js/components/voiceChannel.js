const DEAFENED_BADGE_SVG = `<svg class="icon-badge" viewBox="0 0 24 24" aria-hidden="true"><path fill="#949ba4" d="M12 3a9 9 0 0 0-9 9v7a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5v-2a7 7 0 0 1 14 0v2h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3v-7a9 9 0 0 0-9-9z"/><line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="#f23f43" stroke-width="2.5" stroke-linecap="round"/></svg>`;

const MUTED_BADGE_SVG = `<svg class="icon-badge" viewBox="0 0 24 24" aria-hidden="true"><path fill="#949ba4" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a1 1 0 0 0-2 0 3 3 0 0 1-6 0 1 1 0 0 0-2 0 5 5 0 0 0 4 4.9V19H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-3.1A5 5 0 0 0 17 11z"/><line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="#f23f43" stroke-width="2.5" stroke-linecap="round"/></svg>`;

/**
 * Render Voice Channel Header & Participants List Component
 */
export function renderVoiceChannelHeader(guildRowEl, guildIconEl, guildNameEl, channelNameEl, memberCountEl, data) {
  if (guildRowEl) {
    guildRowEl.style.display = 'flex';
    if (guildNameEl) guildNameEl.innerText = data.guildName || 'Discord Server';
    if (guildIconEl) {
      if (data.guildIcon) {
        guildIconEl.src = data.guildIcon;
        guildIconEl.style.display = 'inline-block';
      } else {
        guildIconEl.style.display = 'none';
      }
    }
  }

  if (channelNameEl) channelNameEl.innerText = '🔊 ' + (data.channelName || 'Voice Channel');

  const membersList = data.members || [];
  if (memberCountEl) {
    memberCountEl.style.display = 'inline-block';
    memberCountEl.innerText = membersList.length + ' connected';
  }
}

/**
 * Update active member list cards with smooth transitions & speaking rings
 * @param {HTMLElement} membersGrid 
 * @param {Array} members 
 */
export function updateMembersGrid(membersGrid, members) {
  if (!membersGrid) return;

  const existingCards = new Map();
  membersGrid.querySelectorAll('.member-card').forEach(card => {
    existingCards.set(card.getAttribute('data-id'), card);
  });

  const activeIds = new Set(members.map(m => m.id));

  // Remove left members with smooth slide & fade out
  existingCards.forEach((card, id) => {
    if (!activeIds.has(id)) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(-6px)';
      setTimeout(() => card.remove(), 200);
    }
  });

  members.forEach((m) => {
    let card = existingCards.get(m.id);

    if (!card) {
      card = document.createElement('div');
      card.className = 'member-card joining';
      card.setAttribute('data-id', m.id);

      const wrapper = document.createElement('div');
      wrapper.className = 'avatar-wrapper';

      const img = document.createElement('img');
      img.className = 'avatar-img';
      img.src = m.avatar;
      img.alt = m.displayName;
      wrapper.appendChild(img);

      const nameLabel = document.createElement('span');
      nameLabel.className = 'member-name';
      nameLabel.innerText = m.displayName;

      const statusIcons = document.createElement('div');
      statusIcons.className = 'member-status-icons';

      const badge = document.createElement('div');
      badge.className = 'badge-overlay';
      badge.style.display = 'none';
      statusIcons.appendChild(badge);

      card.appendChild(wrapper);
      card.appendChild(nameLabel);
      card.appendChild(statusIcons);
      membersGrid.appendChild(card);

      requestAnimationFrame(() => {
        card.classList.remove('joining');
      });
    }

    // Update speaking state (Native Discord green inset ring)
    const wrapper = card.querySelector('.avatar-wrapper');
    if (m.isSpeaking) {
      wrapper.classList.add('speaking');
    } else {
      wrapper.classList.remove('speaking');
    }

    // Update mute/deafen badge on right side (Discord style with red slash line)
    const badge = card.querySelector('.badge-overlay');
    if (m.mute || m.deafen) {
      badge.style.display = 'flex';
      badge.innerHTML = m.deafen ? DEAFENED_BADGE_SVG : MUTED_BADGE_SVG;
    } else {
      badge.style.display = 'none';
    }
  });
}
