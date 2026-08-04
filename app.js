(() => {
  'use strict';

  const app = document.getElementById('app');
  const audio = document.getElementById('audio');
  const trackPicker = document.getElementById('trackPicker');
  const modalRoot = document.getElementById('modalRoot');
  const toastRoot = document.getElementById('toastRoot');

  const icons = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"></path></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"></path></svg>',
    kebab: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>',
    local: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m8 12 4 4 4-4M12 8v8"></path></svg>',
    linkOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 13.5 8 16a4 4 0 0 1-5.7-5.6l3-3a4 4 0 0 1 5.6 0"></path><path d="m13.5 10.5 2.5-2.5a4 4 0 0 1 5.7 5.6l-3 3a4 4 0 0 1-5.6 0"></path><path d="m3 3 18 18"></path></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3"></path><path d="m7 8 5-5 5 5"></path><path d="M5 12v8h14v-8"></path></svg>',
    pencil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"></path><path d="m14 7 3 3"></path></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"></path></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="m21 15-5-5L5 20"></path></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>'
  };

  const coverGradients = [
    'linear-gradient(145deg, #ff10ad 0%, #b227dc 54%, #4937ff 100%)',
    'linear-gradient(145deg, #7187e6 0%, #82c8e5 100%)',
    'linear-gradient(145deg, #ff735c 0%, #ffcc65 100%)',
    'linear-gradient(145deg, #3ddea9 0%, #3376ff 100%)',
    'linear-gradient(145deg, #8c49ff 0%, #ff4f91 100%)',
    'linear-gradient(145deg, #e3e3e3 0%, #737373 100%)'
  ];

  const runtime = {
    view: 'home',
    playlistId: null,
    activePlaylistId: null,
    activeTrackId: null,
    queue: [],
    queueIndex: -1,
    pickerPlaylistId: null,
    suppressClickUntil: 0,
    drag: null,
    uploadToast: null
  };

  let state = null;
  let saveQueue = Promise.resolve();

  function createId(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function defaultState() {
    return {
      version: 3,
      profile: {
        name: 'RaidenLabs',
        avatar: null,
        joinedAt: '2025-05-01'
      },
      playlists: [
        { id: createId('playlist'), name: 'remix.exe', cover: null, gradient: 0, createdAt: new Date().toISOString(), tracks: [] },
        { id: createId('playlist'), name: 'Linkin Park', cover: null, gradient: 1, createdAt: new Date().toISOString(), tracks: [] }
      ]
    };
  }

  function emptyState() {
    return {
      version: 3,
      profile: {
        name: 'New User',
        avatar: null,
        joinedAt: new Date().toISOString().slice(0, 10)
      },
      playlists: []
    };
  }

  function cleanTrackMetadata(track = {}) {
    return {
      id: track.id || createId('track'),
      title: track.title || stripExtension(track.fileName || 'Untitled'),
      fileName: track.fileName || '',
      fingerprint: track.fingerprint || '',
      size: Number(track.size) || 0,
      lastModified: Number(track.lastModified) || 0,
      type: track.type || '',
      duration: Number(track.duration) || 0,
      addedAt: track.addedAt || new Date().toISOString(),
      storageName: track.storageName || '',
      contentHash: track.contentHash || ''
    };
  }

  function persistedStateSnapshot() {
    return {
      version: 3,
      profile: {
        name: state.profile.name,
        avatar: state.profile.avatar || null,
        joinedAt: state.profile.joinedAt
      },
      playlists: state.playlists.map((playlist, index) => ({
        id: playlist.id,
        name: playlist.name,
        cover: playlist.cover || null,
        gradient: playlist.gradient ?? index % coverGradients.length,
        createdAt: playlist.createdAt || new Date().toISOString(),
        tracks: (playlist.tracks || []).map(cleanTrackMetadata)
      }))
    };
  }

  async function loadState() {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load the library (${response.status}).`);
    const saved = await response.json();
    if (!saved || !Array.isArray(saved.playlists) || !saved.profile) return defaultState();
    saved.playlists.forEach((playlist, index) => {
      playlist.gradient ??= index % coverGradients.length;
      playlist.tracks = Array.isArray(playlist.tracks) ? playlist.tracks.map(cleanTrackMetadata) : [];
    });
    return saved;
  }

  function saveState() {
    const snapshot = persistedStateSnapshot();
    saveQueue = saveQueue.catch(() => undefined).then(async () => {
      const response = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot)
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Could not save changes (${response.status}).`);
      }
    }).catch((error) => {
      console.error(error);
      showToast(error.message || 'Could not save changes.', true);
    });
    return saveQueue;
  }

  async function flushState() {
    await saveQueue.catch(() => undefined);
  }

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getPlaylist(id) {
    return state.playlists.find((playlist) => playlist.id === id) || null;
  }

  function getTrack(playlistId, trackId) {
    return getPlaylist(playlistId)?.tracks.find((track) => track.id === trackId) || null;
  }

  function stripExtension(name) {
    return name.replace(/\.[^/.]+$/, '') || name;
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remaining}`;
  }

  function formatDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }

  function formatJoined(dateValue) {
    const date = new Date(`${dateValue}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateValue;
    return new Intl.DateTimeFormat(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' }).format(date);
  }

  function coverMarkup(playlist, className = '') {
    const gradient = coverGradients[playlist.gradient % coverGradients.length];
    return playlist.cover
      ? `<img class="${className}" src="${playlist.cover}" alt="${escapeHtml(playlist.name)} cover art">`
      : `<span class="cover-placeholder ${className}" style="--cover-gradient:${gradient}"></span>`;
  }

  function render() {
    document.body.classList.toggle('home-view', runtime.view === 'home');
    document.body.classList.toggle('player-visible', Boolean(runtime.activeTrackId));

    let screen = '';
    if (runtime.view === 'playlist') screen = renderPlaylistScreen();
    else if (runtime.view === 'user') screen = renderUserScreen();
    else screen = renderHomeScreen();

    app.innerHTML = `${screen}${renderPlayerDock()}`;
    updatePlayerDom();
  }

  function renderHomeScreen() {
    const playlists = state.playlists.map((playlist) => `
      <article class="playlist-card" data-playlist-id="${playlist.id}">
        <div class="playlist-cover-wrap">
          <button class="playlist-cover" type="button" data-action="open-playlist" data-playlist-id="${playlist.id}" aria-label="Open ${escapeHtml(playlist.name)}. Hold and drag to reorder.">
            ${coverMarkup(playlist)}
          </button>
          <button class="playlist-play" type="button" data-action="play-playlist" data-playlist-id="${playlist.id}" aria-label="Play ${escapeHtml(playlist.name)}">
            ${icons.play}
          </button>
        </div>
        <div class="playlist-meta">
          <div>
            <div class="playlist-name">${escapeHtml(playlist.name)}</div>
            <div class="playlist-owner">${escapeHtml(state.profile.name)}</div>
          </div>
          <button class="kebab" type="button" data-action="edit-playlist" data-playlist-id="${playlist.id}" aria-label="Edit ${escapeHtml(playlist.name)}">${icons.kebab}</button>
        </div>
      </article>
    `).join('');

    return `
      <main class="screen home-screen">
        <header class="topbar">
          <h1 class="topbar-title">iDroid</h1>
          <div class="topbar-actions">
            <button class="icon-button" type="button" data-action="search" aria-label="Search">${icons.search}</button>
            <button class="icon-button" type="button" data-action="open-user" aria-label="User settings">${icons.user}</button>
          </div>
        </header>
        ${playlists ? `<section class="playlist-grid" aria-label="Playlists">${playlists}</section>` : `
          <section class="home-empty"><div><strong>No playlists yet</strong>Tap Add to create your first playlist.</div></section>`}
      </main>
      <button class="home-add" type="button" data-action="new-playlist" aria-label="Add playlist">
        ${icons.plus}<span class="home-add-label">Add</span>
      </button>
    `;
  }

  function renderPlaylistScreen() {
    const playlist = getPlaylist(runtime.playlistId);
    if (!playlist) {
      runtime.view = 'home';
      runtime.playlistId = null;
      return renderHomeScreen();
    }

    const rows = playlist.tracks.map((track, index) => {
      const available = Boolean(track.storageName);
      return `
        <li class="track-row ${available ? '' : 'unavailable'}" data-track-id="${track.id}" data-playlist-id="${playlist.id}">
          <div class="track-index">${index + 1}</div>
          <button class="track-main" type="button" data-action="play-track" data-playlist-id="${playlist.id}" data-track-id="${track.id}" style="border:0;background:transparent;color:inherit;text-align:left;padding:0;">
            <div class="track-title">${escapeHtml(track.title)}</div>
            <div class="track-detail">
              ${available ? icons.local : icons.linkOff}
              <span>${available ? `${formatDate(track.addedAt)} · ${formatDuration(track.duration)}` : 'Audio file unavailable'}</span>
            </div>
          </button>
          <button class="kebab track-more" type="button" data-action="track-menu" data-playlist-id="${playlist.id}" data-track-id="${track.id}" aria-label="Track options">${icons.kebab}</button>
        </li>
      `;
    }).join('');

    return `
      <main class="screen playlist-screen">
        <header class="topbar">
          <button class="icon-button" type="button" data-action="back-home" aria-label="Back">${icons.back}</button>
          <div class="topbar-actions">
            <button class="icon-button" type="button" data-action="search" aria-label="Search">${icons.search}</button>
            <button class="icon-button" type="button" data-action="edit-playlist" data-playlist-id="${playlist.id}" aria-label="Edit playlist">${icons.kebab}</button>
          </div>
        </header>

        <section class="playlist-hero">
          <div class="playlist-hero-cover">${coverMarkup(playlist)}</div>
          <div class="playlist-heading-row">
            <div>
              <h1 class="playlist-title">${escapeHtml(playlist.name)}</h1>
              <div class="playlist-subtitle">${escapeHtml(state.profile.name)} · ${playlist.tracks.length} ${playlist.tracks.length === 1 ? 'track' : 'tracks'} · ${formatTotalDuration(playlist)}</div>
            </div>
            <button class="big-play" type="button" data-action="play-playlist" data-playlist-id="${playlist.id}" aria-label="Play playlist">${icons.play}</button>
          </div>
          <button class="add-tracks" type="button" data-action="choose-track-files" data-playlist-id="${playlist.id}">${icons.plus}<span>Add tracks</span></button>
        </section>

        ${rows ? `<ol class="track-list" aria-label="Tracks">${rows}</ol>` : `
          <section class="track-empty"><div><strong>This playlist is empty</strong>Upload audio from the Files app on your iPhone.</div></section>`}
      </main>
    `;
  }

  function formatTotalDuration(playlist) {
    const total = playlist.tracks.reduce((sum, track) => sum + (Number(track.duration) || 0), 0);
    if (!total) return '0m';
    const minutes = Math.floor(total / 60);
    const seconds = Math.floor(total % 60);
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  function renderUserScreen() {
    const avatar = state.profile.avatar ? `<img src="${state.profile.avatar}" alt="">` : '';
    return `
      <main class="screen user-screen">
        <header class="topbar">
          <button class="icon-button" type="button" data-action="back-home" aria-label="Back">${icons.back}</button>
          <button class="icon-button" type="button" data-action="user-menu" aria-label="Account options">${icons.kebab}</button>
        </header>

        <section class="profile-card">
          <div class="profile-art">${avatar}</div>
          <div class="profile-label">
            <div class="avatar-dot">${avatar}</div>
            <div>
              <div class="profile-name">${escapeHtml(state.profile.name)}</div>
              <div class="profile-date">Joined ${formatJoined(state.profile.joinedAt)}</div>
            </div>
          </div>
        </section>

        <button class="edit-profile" type="button" data-action="edit-profile">${icons.pencil}<span>Edit Profile</span></button>
      </main>
    `;
  }

  function renderPlayerDock() {
    const playlist = getPlaylist(runtime.activePlaylistId);
    const track = getTrack(runtime.activePlaylistId, runtime.activeTrackId);
    const waveform = Array.from({ length: 31 }, (_, index) => {
      const height = 18 + ((index * 17 + 13) % 32);
      return `<span class="wave-bar" style="height:${height}px"></span>`;
    }).join('');

    return `
      <aside class="player-dock ${track ? 'visible' : ''}" aria-label="Now playing">
        <button class="player-toggle" type="button" data-action="toggle-play" aria-label="${audio.paused ? 'Play' : 'Pause'}">${audio.paused ? icons.play : icons.pause}</button>
        <button class="player-text" type="button" data-action="open-current-playlist" style="border:0;background:transparent;color:inherit;text-align:left;padding:0;">
          <div class="player-track">${track ? escapeHtml(track.title) : 'Nothing playing'}</div>
          <div class="player-context">${track && playlist ? `${escapeHtml(playlist.name)} · ${escapeHtml(state.profile.name)}` : ''}</div>
        </button>
        <div class="waveform" data-action="seek" role="slider" aria-label="Playback position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          ${waveform}<span class="wave-progress" style="left:0%"></span>
        </div>
        <button class="player-share" type="button" data-action="share-track" aria-label="Share track information">${icons.share}</button>
      </aside>
    `;
  }

  function updatePlayerDom() {
    const dock = app.querySelector('.player-dock');
    if (!dock) return;
    const toggle = dock.querySelector('.player-toggle');
    if (toggle) {
      toggle.innerHTML = audio.paused ? icons.play : icons.pause;
      toggle.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause');
    }

    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const ratio = duration ? Math.max(0, Math.min(1, audio.currentTime / duration)) : 0;
    const bars = [...dock.querySelectorAll('.wave-bar')];
    bars.forEach((bar, index) => bar.classList.toggle('played', index / bars.length <= ratio));
    const progress = dock.querySelector('.wave-progress');
    if (progress) progress.style.left = `${ratio * 100}%`;
    const waveform = dock.querySelector('.waveform');
    if (waveform) waveform.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
  }

  function goHome() {
    runtime.view = 'home';
    runtime.playlistId = null;
    closeOverlays();
    render();
  }

  function openPlaylist(id) {
    if (!getPlaylist(id)) return;
    runtime.view = 'playlist';
    runtime.playlistId = id;
    closeOverlays();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openUser() {
    runtime.view = 'user';
    runtime.playlistId = null;
    closeOverlays();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeOverlays() {
    modalRoot.innerHTML = '';
    document.querySelectorAll('.menu-popover').forEach((menu) => menu.remove());
  }

  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast${isError ? ' error' : ''}`;
    toast.textContent = message;
    toastRoot.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }

  function openModal(content, compact = false) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal">
        <section class="modal-sheet ${compact ? 'compact' : ''}" role="dialog" aria-modal="true" aria-label="Dialog" data-modal-sheet>
          <div class="modal-handle"></div>
          ${content}
        </section>
      </div>
    `;
    modalRoot.querySelector('[data-modal-sheet]')?.addEventListener('click', (event) => event.stopPropagation());
  }

  function closeModal() {
    modalRoot.innerHTML = '';
  }

  function openPlaylistEditor(playlistId = null) {
    const existing = playlistId ? getPlaylist(playlistId) : null;
    const draft = {
      name: existing?.name || '',
      cover: existing?.cover || null
    };

    openModal(`
      <h2 class="modal-title">${existing ? 'Edit Playlist' : 'New Playlist'}</h2>
      <p class="modal-copy">Change the playlist name and choose cover art stored with your iDroid library.</p>
      <div class="form-grid">
        <div class="field">
          <label for="playlistName">Playlist name</label>
          <input id="playlistName" type="text" maxlength="80" value="${escapeHtml(draft.name)}" autocomplete="off" placeholder="Playlist name">
        </div>
        <div class="field">
          <label for="playlistCover">Cover art</label>
          <label class="file-button" for="playlistCover">
            <span><strong>${draft.cover ? 'Replace cover art' : 'Choose cover art'}</strong><small id="playlistCoverStatus">JPG, PNG, HEIC, or WebP</small></span>
            ${icons.image}
          </label>
          <input id="playlistCover" class="visually-hidden" type="file" accept="image/*">
        </div>
      </div>
      <div class="modal-actions">
        <button class="action-button" type="button" data-modal-cancel>Cancel</button>
        <button class="action-button primary" type="button" data-modal-save>${existing ? 'Save' : 'Create'}</button>
        ${existing ? '<button class="action-button danger full" type="button" data-modal-delete>Delete Playlist</button>' : ''}
      </div>
    `, true);

    const nameInput = modalRoot.querySelector('#playlistName');
    const coverInput = modalRoot.querySelector('#playlistCover');
    const status = modalRoot.querySelector('#playlistCoverStatus');
    nameInput?.focus();

    coverInput?.addEventListener('change', async () => {
      const file = coverInput.files?.[0];
      if (!file) return;
      status.textContent = 'Processing artwork…';
      try {
        draft.cover = await compressImage(file, 720, .76);
        status.textContent = file.name;
      } catch (error) {
        status.textContent = 'Could not use this image';
        showToast('Could not process that image.', true);
      }
    });

    modalRoot.querySelector('[data-modal-cancel]')?.addEventListener('click', closeModal);
    modalRoot.querySelector('[data-modal-save]')?.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        showToast('Enter a playlist name.', true);
        return;
      }
      if (existing) {
        existing.name = name;
        existing.cover = draft.cover;
      } else {
        const playlist = {
          id: createId('playlist'),
          name,
          cover: draft.cover,
          gradient: state.playlists.length % coverGradients.length,
          createdAt: new Date().toISOString(),
          tracks: []
        };
        state.playlists.push(playlist);
      }
      saveState();
      closeModal();
      render();
    });

    modalRoot.querySelector('[data-modal-delete]')?.addEventListener('click', () => confirmDeletePlaylist(existing.id));
  }

  function confirmDeletePlaylist(playlistId) {
    const playlist = getPlaylist(playlistId);
    if (!playlist) return;
    openModal(`
      <h2 class="modal-title">Delete Playlist?</h2>
      <p class="modal-copy">This permanently removes “${escapeHtml(playlist.name)}”, its track list, and music files that are not used by another playlist.</p>
      <div class="modal-actions">
        <button class="action-button" type="button" data-delete-cancel>Cancel</button>
        <button class="action-button danger" type="button" data-delete-confirm>Delete</button>
      </div>
    `, true);
    modalRoot.querySelector('[data-delete-cancel]')?.addEventListener('click', closeModal);
    modalRoot.querySelector('[data-delete-confirm]')?.addEventListener('click', () => {
      if (runtime.activePlaylistId === playlistId) stopPlayback();
      state.playlists = state.playlists.filter((item) => item.id !== playlistId);
      saveState();
      closeModal();
      goHome();
      showToast('Playlist deleted.');
    });
  }

  function openProfileEditor() {
    const draft = { avatar: state.profile.avatar };
    openModal(`
      <h2 class="modal-title">Edit Profile</h2>
      <p class="modal-copy">Update the name and profile picture shown throughout iDroid.</p>
      <div class="form-grid">
        <div class="field">
          <label for="profileName">User name</label>
          <input id="profileName" type="text" maxlength="60" value="${escapeHtml(state.profile.name)}" autocomplete="nickname">
        </div>
        <div class="field">
          <label for="profileImage">Profile picture</label>
          <label class="file-button" for="profileImage">
            <span><strong>${draft.avatar ? 'Replace profile picture' : 'Choose profile picture'}</strong><small id="profileImageStatus">JPG, PNG, HEIC, or WebP</small></span>
            ${icons.image}
          </label>
          <input id="profileImage" class="visually-hidden" type="file" accept="image/*">
        </div>
      </div>
      <div class="modal-actions">
        <button class="action-button" type="button" data-profile-cancel>Cancel</button>
        <button class="action-button primary" type="button" data-profile-save>Save</button>
      </div>
    `, true);

    const nameInput = modalRoot.querySelector('#profileName');
    const imageInput = modalRoot.querySelector('#profileImage');
    const status = modalRoot.querySelector('#profileImageStatus');
    nameInput?.focus();

    imageInput?.addEventListener('change', async () => {
      const file = imageInput.files?.[0];
      if (!file) return;
      status.textContent = 'Processing picture…';
      try {
        draft.avatar = await compressImage(file, 600, .76);
        status.textContent = file.name;
      } catch (error) {
        status.textContent = 'Could not use this image';
        showToast('Could not process that image.', true);
      }
    });

    modalRoot.querySelector('[data-profile-cancel]')?.addEventListener('click', closeModal);
    modalRoot.querySelector('[data-profile-save]')?.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        showToast('Enter a user name.', true);
        return;
      }
      state.profile.name = name;
      state.profile.avatar = draft.avatar;
      saveState();
      closeModal();
      render();
      updateMediaSession();
    });
  }

  function openUserMenu(anchor) {
    openMenu(anchor, [{
      label: 'Delete Account',
      icon: icons.trash,
      danger: true,
      action: confirmDeleteAccount
    }]);
  }

  function confirmDeleteAccount() {
    closeOverlays();
    openModal(`
      <h2 class="modal-title">Delete Account?</h2>
      <p class="modal-copy">This permanently removes the profile, playlists, cover art, and uploaded music from iDroid's Railway storage.</p>
      <div class="modal-actions">
        <button class="action-button" type="button" data-account-cancel>Cancel</button>
        <button class="action-button danger" type="button" data-account-confirm>Delete</button>
      </div>
    `, true);
    modalRoot.querySelector('[data-account-cancel]')?.addEventListener('click', closeModal);
    modalRoot.querySelector('[data-account-confirm]')?.addEventListener('click', () => {
      stopPlayback();
      state = emptyState();
      saveState();
      closeModal();
      goHome();
      showToast('Account data deleted.');
    });
  }

  function openTrackMenu(anchor, playlistId, trackId) {
    openMenu(anchor, [{
      label: 'Remove from Playlist',
      icon: icons.trash,
      danger: true,
      action: () => removeTrack(playlistId, trackId)
    }]);
  }

  function openMenu(anchor, items) {
    document.querySelectorAll('.menu-popover').forEach((menu) => menu.remove());
    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'menu-popover';
    menu.innerHTML = items.map((item, index) => `
      <button class="menu-item ${item.danger ? 'danger' : ''}" type="button" data-menu-index="${index}">${item.icon || ''}<span>${escapeHtml(item.label)}</span></button>
    `).join('');
    document.body.appendChild(menu);
    const menuRect = menu.getBoundingClientRect();
    const left = Math.min(window.innerWidth - menuRect.width - 12, Math.max(12, rect.right - menuRect.width));
    const top = Math.min(window.innerHeight - menuRect.height - 12, rect.bottom + 8);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.addEventListener('click', (event) => {
      const button = event.target.closest('[data-menu-index]');
      if (!button) return;
      const item = items[Number(button.dataset.menuIndex)];
      menu.remove();
      item?.action();
    });
    setTimeout(() => {
      document.addEventListener('pointerdown', function dismiss(event) {
        if (!menu.contains(event.target)) {
          menu.remove();
          document.removeEventListener('pointerdown', dismiss);
        }
      });
    }, 0);
  }

  function removeTrack(playlistId, trackId) {
    const playlist = getPlaylist(playlistId);
    if (!playlist) return;
    if (runtime.activeTrackId === trackId) stopPlayback();
    playlist.tracks = playlist.tracks.filter((track) => track.id !== trackId);
    saveState();
    render();
    showToast('Track removed from playlist.');
  }

  function openSearch() {
    openModal(`
      <h2 class="modal-title">Search</h2>
      <div class="search-panel">
        <div class="search-input-wrap">
          ${icons.search}
          <input id="searchInput" class="search-input" type="search" autocomplete="off" placeholder="Search playlists and tracks">
        </div>
        <div id="searchResults" class="search-results"></div>
      </div>
    `);
    const input = modalRoot.querySelector('#searchInput');
    const results = modalRoot.querySelector('#searchResults');

    const drawResults = () => {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        results.innerHTML = '<div class="no-results">Start typing to search.</div>';
        return;
      }
      const matches = [];
      state.playlists.forEach((playlist) => {
        if (playlist.name.toLowerCase().includes(query)) matches.push({ type: 'playlist', playlist });
        playlist.tracks.forEach((track) => {
          if (track.title.toLowerCase().includes(query) || track.fileName.toLowerCase().includes(query)) {
            matches.push({ type: 'track', playlist, track });
          }
        });
      });
      results.innerHTML = matches.length ? matches.slice(0, 30).map((match, index) => `
        <button class="search-result" type="button" data-search-index="${index}">
          <span class="search-result-art">${coverMarkup(match.playlist)}</span>
          <span>
            <span class="search-result-title">${escapeHtml(match.type === 'track' ? match.track.title : match.playlist.name)}</span>
            <span class="search-result-detail">${match.type === 'track' ? `Track in ${escapeHtml(match.playlist.name)}` : `${match.playlist.tracks.length} tracks`}</span>
          </span>
        </button>
      `).join('') : '<div class="no-results">No matches found.</div>';
      results.onclick = (event) => {
        const button = event.target.closest('[data-search-index]');
        if (!button) return;
        const match = matches[Number(button.dataset.searchIndex)];
        closeModal();
        if (match.type === 'track') {
          openPlaylist(match.playlist.id);
          playTrack(match.playlist.id, match.track.id);
        } else {
          openPlaylist(match.playlist.id);
        }
      };
    };
    input.addEventListener('input', drawResults);
    input.focus();
    drawResults();
  }

  function prepareTrackPicker(playlistId) {
    if (!getPlaylist(playlistId)) return false;
    runtime.pickerPlaylistId = playlistId;
    trackPicker.value = '';
    return true;
  }

  function chooseTrackFiles(playlistId) {
    if (!prepareTrackPicker(playlistId)) return;
    trackPicker.click();
  }

  function isSupportedAudioFile(file) {
    if (file.type?.startsWith('audio/')) return true;
    return /\.(mp3|m4a|aac|wav|aiff|aif|flac|ogg|oga|opus|caf|mp4|m4b)$/i.test(file.name);
  }

  function showUploadProgress(fileName, index, total, percent = 0) {
    if (!runtime.uploadToast || !runtime.uploadToast.isConnected) {
      runtime.uploadToast = document.createElement('div');
      runtime.uploadToast.className = 'toast';
      toastRoot.appendChild(runtime.uploadToast);
    }
    runtime.uploadToast.textContent = `Uploading ${index} of ${total}: ${fileName} · ${Math.round(percent)}%`;
  }

  function clearUploadProgress() {
    runtime.uploadToast?.remove();
    runtime.uploadToast = null;
  }

  function uploadTrackFile(playlistId, file, duration, onProgress) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('POST', `/api/playlists/${encodeURIComponent(playlistId)}/tracks`);
      request.responseType = 'json';
      request.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) onProgress?.((event.loaded / event.total) * 100);
      });
      request.addEventListener('load', () => {
        const result = request.response || {};
        if (request.status >= 200 && request.status < 300) resolve(result);
        else reject(new Error(result.error || `Upload failed (${request.status}).`));
      });
      request.addEventListener('error', () => reject(new Error('The upload connection failed.')));
      request.addEventListener('abort', () => reject(new Error('The upload was cancelled.')));

      const form = new FormData();
      form.append('file', file, file.name);
      form.append('title', stripExtension(file.name));
      form.append('lastModified', String(file.lastModified || 0));
      form.append('duration', String(duration || 0));
      request.send(form);
    });
  }

  async function handleTrackFiles(files) {
    const playlistId = runtime.pickerPlaylistId;
    const supportedFiles = files.filter(isSupportedAudioFile);
    trackPicker.value = '';
    runtime.pickerPlaylistId = null;

    if (!playlistId || !files.length) return;
    if (!supportedFiles.length) {
      showToast('No supported audio files were selected.', true);
      return;
    }

    await flushState();
    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (let index = 0; index < supportedFiles.length; index += 1) {
      const file = supportedFiles[index];
      try {
        showUploadProgress(file.name, index + 1, supportedFiles.length, 0);
        const duration = await readDuration(file);
        const result = await uploadTrackFile(
          playlistId,
          file,
          duration,
          (percent) => showUploadProgress(file.name, index + 1, supportedFiles.length, percent)
        );
        if (result.state) state = result.state;
        if (result.skipped) skipped += 1;
        else added += 1;
      } catch (error) {
        failed += 1;
        console.error(error);
        showToast(`${file.name}: ${error.message}`, true);
      }
    }

    clearUploadProgress();
    render();
    const parts = [];
    if (added) parts.push(`${added} uploaded`);
    if (skipped) parts.push(`${skipped} already added`);
    if (failed) parts.push(`${failed} failed`);
    if (parts.length) showToast(parts.join(' · '), Boolean(failed && !added));
  }

  async function readDuration(file) {
    const url = URL.createObjectURL(file);
    try {
      return await new Promise((resolve) => {
        const probe = document.createElement('audio');
        const timeout = setTimeout(() => resolve(0), 7000);
        probe.preload = 'metadata';
        probe.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve(Number.isFinite(probe.duration) ? probe.duration : 0);
        };
        probe.onerror = () => {
          clearTimeout(timeout);
          resolve(0);
        };
        probe.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function playPlaylist(playlistId) {
    const playlist = getPlaylist(playlistId);
    if (!playlist) return;
    const firstAvailable = playlist.tracks.find((track) => track.storageName);
    if (firstAvailable) {
      playTrack(playlistId, firstAvailable.id);
      return;
    }
    showToast('Upload audio files for this playlist.');
    chooseTrackFiles(playlistId);
  }

  async function playTrack(playlistId, trackId) {
    const playlist = getPlaylist(playlistId);
    const track = getTrack(playlistId, trackId);
    if (!playlist || !track) return;
    if (!track.storageName) {
      showToast('This uploaded audio file is unavailable.', true);
      return;
    }

    runtime.activePlaylistId = playlistId;
    runtime.activeTrackId = trackId;
    runtime.queue = playlist.tracks.filter((item) => item.storageName).map((item) => item.id);
    runtime.queueIndex = runtime.queue.indexOf(trackId);

    const streamUrl = `/api/tracks/${encodeURIComponent(trackId)}/audio`;
    if (audio.dataset.trackId !== trackId) {
      audio.src = streamUrl;
      audio.dataset.trackId = trackId;
      audio.load();
    }
    render();
    updateMediaSession();
    try {
      await audio.play();
    } catch (error) {
      console.warn('Playback did not start.', error);
      showToast('Tap play to start audio.', true);
    }
    updatePlayerDom();
  }

  function togglePlayback() {
    if (!runtime.activeTrackId) return;
    if (audio.paused) audio.play().catch(() => showToast('Playback could not start.', true));
    else audio.pause();
  }

  function stopPlayback() {
    audio.pause();
    audio.removeAttribute('src');
    delete audio.dataset.trackId;
    audio.load();
    runtime.activePlaylistId = null;
    runtime.activeTrackId = null;
    runtime.queue = [];
    runtime.queueIndex = -1;
    render();
  }

  async function playNext(direction = 1) {
    if (!runtime.queue.length) return;
    const nextIndex = (runtime.queueIndex + direction + runtime.queue.length) % runtime.queue.length;
    runtime.queueIndex = nextIndex;
    await playTrack(runtime.activePlaylistId, runtime.queue[nextIndex]);
  }

  function seekFromPointer(event, element) {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = element.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    updatePlayerDom();
  }

  async function shareCurrentTrack() {
    const playlist = getPlaylist(runtime.activePlaylistId);
    const track = getTrack(runtime.activePlaylistId, runtime.activeTrackId);
    if (!playlist || !track) return;
    const shareData = {
      title: track.title,
      text: `${track.title} — ${playlist.name} in iDroid`,
      url: location.href
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        showToast('Track information copied.');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Could not share this track.', true);
    }
  }

  function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const playlist = getPlaylist(runtime.activePlaylistId);
    const track = getTrack(runtime.activePlaylistId, runtime.activeTrackId);
    if (!playlist || !track) return;
    const metadata = {
      title: track.title,
      artist: state.profile.name,
      album: playlist.name
    };
    if (playlist.cover) metadata.artwork = [{ src: playlist.cover, sizes: '512x512' }];
    try {
      navigator.mediaSession.metadata = new MediaMetadata(metadata);
      navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
    } catch (error) {
      console.warn('Media Session metadata was not applied.', error);
    }
  }

  function setupMediaSessionActions() {
    if (!('mediaSession' in navigator)) return;
    const handlers = {
      play: () => audio.play(),
      pause: () => audio.pause(),
      previoustrack: () => playNext(-1),
      nexttrack: () => playNext(1),
      seekbackward: (details) => { audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset || 10)); },
      seekforward: (details) => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (details.seekOffset || 10)); },
      seekto: (details) => {
        if (details.fastSeek && 'fastSeek' in audio) audio.fastSeek(details.seekTime);
        else audio.currentTime = details.seekTime;
      }
    };
    Object.entries(handlers).forEach(([action, handler]) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch (_) { /* Unsupported action. */ }
    });
  }

  function compressImage(file, maxDimension = 900, quality = .82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => {
          const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function handleAppClick(event) {
    if (Date.now() < runtime.suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const playlistId = target.dataset.playlistId;
    const trackId = target.dataset.trackId;

    switch (action) {
      case 'open-playlist': openPlaylist(playlistId); break;
      case 'play-playlist': playPlaylist(playlistId); break;
      case 'edit-playlist': openPlaylistEditor(playlistId); break;
      case 'new-playlist': openPlaylistEditor(); break;
      case 'open-user': openUser(); break;
      case 'back-home': goHome(); break;
      case 'search': openSearch(); break;
      case 'choose-track-files': chooseTrackFiles(playlistId); break;
      case 'play-track': playTrack(playlistId, trackId); break;
      case 'track-menu': openTrackMenu(target, playlistId, trackId); break;
      case 'edit-profile': openProfileEditor(); break;
      case 'user-menu': openUserMenu(target); break;
      case 'toggle-play': togglePlayback(); break;
      case 'open-current-playlist': if (runtime.activePlaylistId) openPlaylist(runtime.activePlaylistId); break;
      case 'share-track': shareCurrentTrack(); break;
      case 'seek': seekFromPointer(event, target); break;
      case 'close-modal': closeModal(); break;
      default: break;
    }
  }

  function beginLongPress(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest('.playlist-play, .kebab, .track-main, button:not(.playlist-cover)')) return;

    const cover = event.target.closest('.playlist-cover');
    const row = event.target.closest('.track-row');
    if (!cover && !row) return;

    const item = cover ? cover.closest('.playlist-card') : row;
    const container = cover ? item.parentElement : row.parentElement;
    const type = cover ? 'playlist' : 'track';
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;

    const drag = {
      type,
      item,
      container,
      pointerId,
      startX,
      startY,
      active: false,
      timer: null
    };

    drag.timer = setTimeout(() => {
      drag.active = true;
      item.classList.add('dragging');
      document.body.style.touchAction = 'none';
      try { item.setPointerCapture(pointerId); } catch (_) { /* Pointer capture can fail on old Safari. */ }
      if (navigator.vibrate) navigator.vibrate(20);
    }, 360);
    runtime.drag = drag;
  }

  function moveLongPress(event) {
    const drag = runtime.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active && distance > 12) {
      clearTimeout(drag.timer);
      runtime.drag = null;
      return;
    }
    if (!drag.active) return;
    event.preventDefault();
    const hovered = document.elementFromPoint(event.clientX, event.clientY)?.closest(drag.type === 'playlist' ? '.playlist-card' : '.track-row');
    if (!hovered || hovered === drag.item || hovered.parentElement !== drag.container) return;
    const rect = hovered.getBoundingClientRect();
    const before = drag.type === 'playlist'
      ? (event.clientY < rect.top + rect.height / 2 || (Math.abs(event.clientY - (rect.top + rect.height / 2)) < rect.height / 3 && event.clientX < rect.left + rect.width / 2))
      : event.clientY < rect.top + rect.height / 2;
    drag.container.insertBefore(drag.item, before ? hovered : hovered.nextSibling);
  }

  function endLongPress(event) {
    const drag = runtime.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    clearTimeout(drag.timer);
    if (drag.active) {
      drag.item.classList.remove('dragging');
      document.body.style.touchAction = '';
      runtime.suppressClickUntil = Date.now() + 450;
      if (drag.type === 'playlist') {
        const order = [...drag.container.querySelectorAll('.playlist-card')].map((element) => element.dataset.playlistId);
        state.playlists.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      } else {
        const playlist = getPlaylist(drag.item.dataset.playlistId);
        const order = [...drag.container.querySelectorAll('.track-row')].map((element) => element.dataset.trackId);
        if (playlist) playlist.tracks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      }
      saveState();
      render();
    }
    runtime.drag = null;
  }

  app.addEventListener('click', handleAppClick);
  app.addEventListener('pointerdown', beginLongPress);
  window.addEventListener('pointermove', moveLongPress, { passive: false });
  window.addEventListener('pointerup', endLongPress);
  window.addEventListener('pointercancel', endLongPress);

  modalRoot.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close-modal"]')) closeModal();
  });

  trackPicker.addEventListener('change', () => handleTrackFiles([...trackPicker.files]));
  trackPicker.addEventListener('cancel', () => {
    runtime.pickerPlaylistId = null;
  });

  audio.addEventListener('timeupdate', updatePlayerDom);
  audio.addEventListener('durationchange', updatePlayerDom);
  audio.addEventListener('play', () => { updatePlayerDom(); updateMediaSession(); });
  audio.addEventListener('pause', () => { updatePlayerDom(); updateMediaSession(); });
  audio.addEventListener('ended', () => playNext(1));
  audio.addEventListener('error', () => showToast('This audio format could not be played.', true));


  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker registration failed.', error)));
  }

  async function initialize() {
    try {
      state = await loadState();
      setupMediaSessionActions();
      render();
    } catch (error) {
      console.error(error);
      app.innerHTML = `
        <main class="screen home-screen">
          <section class="home-empty"><div><strong>iDroid could not load</strong>${escapeHtml(error.message || 'Check the Railway deployment and persistent volume.')}</div></section>
        </main>
      `;
    }
  }

  initialize();
})();
