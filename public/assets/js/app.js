(() => {
  'use strict';

  const app = document.getElementById('app');
  const primaryAudio = document.getElementById('audio');
  let standbyAudio = document.getElementById('audioStandby');
  if (!standbyAudio) {
    standbyAudio = document.createElement('audio');
    standbyAudio.id = 'audioStandby';
    standbyAudio.preload = 'auto';
    standbyAudio.setAttribute('playsinline', '');
    standbyAudio.setAttribute('aria-hidden', 'true');
    document.body.appendChild(standbyAudio);
  }
  let audio = primaryAudio;
  const audioPlayers = [primaryAudio, standbyAudio];
  const trackPicker = document.getElementById('trackPicker');
  const modalRoot = document.getElementById('modalRoot');
  const toastRoot = document.getElementById('toastRoot');

  const icons = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
    user: '<img class="asset-icon" src="./assets/icons/user.svg" alt="">',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>',
    plus: '<img class="asset-icon" src="./assets/icons/add.svg" alt="">',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"></path></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"></path></svg>',
    kebab: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>',
    local: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m8 12 4 4 4-4M12 8v8"></path></svg>',
    linkOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 13.5 8 16a4 4 0 0 1-5.7-5.6l3-3a4 4 0 0 1 5.6 0"></path><path d="m13.5 10.5 2.5-2.5a4 4 0 0 1 5.7 5.6l-3 3a4 4 0 0 1-5.6 0"></path><path d="m3 3 18 18"></path></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3"></path><path d="m7 8 5-5 5 5"></path><path d="M5 12v8h14v-8"></path></svg>',
    previous: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="3" height="14" rx="1"></rect><path d="m20 5-11 7 11 7z"></path></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="17" y="5" width="3" height="14" rx="1"></rect><path d="m4 5 11 7-11 7z"></path></svg>',
    repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2.5 21 6l-4 3.5"></path><path d="M3 11V9a3 3 0 0 1 3-3h15"></path><path d="m7 21.5-4-3.5L7 14.5"></path><path d="M21 13v2a3 3 0 0 1-3 3H3"></path></svg>',
    pencil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"></path><path d="m14 7 3 3"></path></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"></path></svg>',
    delete: '<span class="masked-icon delete-icon" aria-hidden="true"></span>',
    dateDown: '<span class="track-date-icon" aria-hidden="true"><span></span></span>',
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


  const WAVEFORM_SAMPLE_COUNT = 256;
  const WAVEFORM_MIN_VALUE = 0.035;

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
    navSwipe: null,
    transition: null,
    preloadedPlaylistId: null,
    preloadedTrackId: null,
    preloadToken: 0,
    handoffInProgress: false,
    uploadToast: null,
    scrub: null,
    repeatOne: false,
    waveformAnalyses: new Map(),
    playbackFrame: 0,
    playbackFrameTimestamp: 0,
    audioContext: null
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

  function normalizeWaveform(value) {
    let candidate = value;
    if (typeof candidate === 'string') {
      try { candidate = JSON.parse(candidate); } catch (_) { candidate = []; }
    }
    if (!Array.isArray(candidate)) return [];
    return candidate
      .slice(0, 1024)
      .map((sample) => Math.max(0, Math.min(1, Number(sample) || 0)))
      .filter(Number.isFinite);
  }

  function resampleWaveform(samples, targetCount = WAVEFORM_SAMPLE_COUNT) {
    const source = normalizeWaveform(samples);
    const count = Math.max(16, Math.floor(targetCount));
    if (!source.length) return [];
    if (source.length === count) return source;

    const result = [];
    for (let index = 0; index < count; index += 1) {
      const start = Math.floor((index * source.length) / count);
      const end = Math.max(start + 1, Math.floor(((index + 1) * source.length) / count));
      let peak = 0;
      for (let sourceIndex = start; sourceIndex < end && sourceIndex < source.length; sourceIndex += 1) {
        peak = Math.max(peak, source[sourceIndex]);
      }
      result.push(peak);
    }
    return result;
  }

  function fallbackWaveform(track, targetCount = WAVEFORM_SAMPLE_COUNT) {
    const seedText = `${track?.id || ''}:${track?.contentHash || ''}:${track?.fileName || ''}`;
    let seed = 2166136261;
    for (let index = 0; index < seedText.length; index += 1) {
      seed ^= seedText.charCodeAt(index);
      seed = Math.imul(seed, 16777619);
    }

    return Array.from({ length: targetCount }, (_, index) => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const random = ((seed >>> 0) % 1000) / 1000;
      const envelope = 0.42 + (Math.sin(index * 0.083) + 1) * 0.15;
      return Math.max(WAVEFORM_MIN_VALUE, Math.min(1, envelope * (0.35 + random * 0.65)));
    });
  }

  function waveformSamplesForTrack(track, targetCount = WAVEFORM_SAMPLE_COUNT) {
    const samples = resampleWaveform(track?.waveform, targetCount);
    return samples.length ? samples : fallbackWaveform(track, targetCount);
  }

  function waveformMarkup(track, targetCount = WAVEFORM_SAMPLE_COUNT) {
    return waveformSamplesForTrack(track, targetCount).map((sample) => {
      const height = Math.round((WAVEFORM_MIN_VALUE + Math.pow(sample, 0.82) * (1 - WAVEFORM_MIN_VALUE)) * 100);
      return `<span class="wave-bar" style="height:${height}%"></span>`;
    }).join('');
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
      contentHash: track.contentHash || '',
      waveform: normalizeWaveform(track.waveform)
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

  function formatPlaybackTime(seconds) {
    const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remaining = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remaining}`;
  }

  function formatDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
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
      <header class="topbar home-menu-bar ${runtime.transition === 'back' ? 'page-enter-back' : ''}">
        <h1 class="topbar-title">iDroid</h1>
        <div class="topbar-actions">
          <button class="icon-button" type="button" data-action="search" aria-label="Search">${icons.search}</button>
          <button class="icon-button" type="button" data-action="open-user" aria-label="User settings">${icons.user}</button>
        </div>
      </header>
      <main class="screen home-screen ${runtime.transition === 'back' ? 'screen-enter-back' : ''}">
        ${playlists ? `<section class="playlist-grid" aria-label="Playlists">${playlists}</section>` : `
          <section class="home-empty"><div><strong>No playlists yet</strong>Tap Add to create your first playlist.</div></section>`}
      </main>
      <button class="home-add ${runtime.transition === 'back' ? 'page-enter-back' : ''}" type="button" data-action="new-playlist" aria-label="Add playlist">
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
        <li class="track-row ${available ? '' : 'unavailable'} ${runtime.activeTrackId === track.id ? 'active-track' : ''}" data-track-id="${track.id}" data-playlist-id="${playlist.id}">
          <div class="track-index">${index + 1}</div>
          <button class="track-main" type="button" data-action="play-track" data-playlist-id="${playlist.id}" data-track-id="${track.id}">
            <div class="track-title">${escapeHtml(track.title)}</div>
            <div class="track-detail">
              ${available ? icons.dateDown : icons.linkOff}
              <span>${available ? `${formatDate(track.addedAt)} · ${formatDuration(track.duration)}` : 'Audio file unavailable'}</span>
            </div>
          </button>
          <button class="kebab track-more" type="button" data-action="track-menu" data-playlist-id="${playlist.id}" data-track-id="${track.id}" aria-label="Track options">${icons.kebab}</button>
        </li>
      `;
    }).join('');

    return `
      <header class="topbar playlist-menu-bar ${runtime.transition === 'forward' ? 'page-enter-forward' : ''}">
        <button class="icon-button" type="button" data-action="back-home" aria-label="Back">${icons.back}</button>
        <div class="topbar-actions">
          <button class="icon-button" type="button" data-action="search" aria-label="Search">${icons.search}</button>
          <button class="icon-button kebab-button" type="button" data-action="edit-playlist" data-playlist-id="${playlist.id}" aria-label="Edit playlist">${icons.kebab}</button>
        </div>
      </header>
      <main class="screen playlist-screen ${runtime.transition === 'forward' ? 'screen-enter-forward' : ''}">
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
      <main class="screen user-screen ${runtime.transition === 'forward' ? 'screen-enter-forward' : runtime.transition === 'back' ? 'screen-enter-back' : ''}">
        <header class="topbar ${runtime.transition === 'forward' ? 'page-enter-forward' : runtime.transition === 'back' ? 'page-enter-back' : ''}">
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
    const waveform = waveformMarkup(track);

    return `
      <aside class="player-dock ${track ? 'visible' : ''}" aria-label="Now playing">
        <button class="player-toggle" type="button" data-action="toggle-play" aria-label="${audio.paused ? 'Play' : 'Pause'}">${audio.paused ? icons.play : icons.pause}</button>
        <button class="player-text" type="button" data-action="open-now-playing">
          <div class="player-track">${track ? escapeHtml(track.title) : 'Nothing playing'}</div>
          <div class="player-context">${track && playlist ? `${escapeHtml(playlist.name)} · ${escapeHtml(state.profile.name)}` : ''}</div>
        </button>
        <div class="waveform" data-scrubber="dock" data-track-id="${track ? escapeHtml(track.id) : ''}" role="slider" aria-label="Playback position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="waveform-viewport">
            <div class="waveform-data">${waveform}</div>
            <span class="wave-progress"></span>
          </div>
          <span class="scrub-line" aria-hidden="true"></span>
          <div class="scrub-readout" aria-hidden="true"><span class="scrub-current">0:00</span><span class="scrub-divider">/</span><span class="scrub-total">0:00</span></div>
        </div>
        ${runtime.view === 'home' ? '' : `<button class="player-share" type="button" data-action="share-track" aria-label="Share track information">${icons.share}</button>`}
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
    const liveRatio = duration ? Math.max(0, Math.min(1, audio.currentTime / duration)) : 0;
    const ratio = runtime.scrub?.previewRatio ?? liveRatio;
    const waveform = dock.querySelector('.waveform');
    updateWaveformDom(waveform, ratio, duration);
  }

  function nowPlayingWaveformMarkup(track) {
    return waveformMarkup(track);
  }

  function openNowPlayingModal() {
    const playlist = getPlaylist(runtime.activePlaylistId);
    const track = getTrack(runtime.activePlaylistId, runtime.activeTrackId);
    if (!playlist || !track) return;
    ensureTrackWaveform(track);

    openModal(`
      <section class="now-playing-modal" aria-label="Now playing">
        <div class="now-playing-copy">
          <h2 class="now-playing-title">${escapeHtml(track.title)}</h2>
          <p class="now-playing-context">${escapeHtml(playlist.name)} · ${escapeHtml(state.profile.name)}</p>
        </div>
        <div class="now-playing-cover">${coverMarkup(playlist)}</div>
        <div class="now-playing-waveform" data-scrubber="modal" data-track-id="${escapeHtml(track.id)}" role="slider" aria-label="Playback position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="waveform-viewport">
            <div class="waveform-data">${nowPlayingWaveformMarkup(track)}</div>
            <span class="wave-progress"></span>
          </div>
          <span class="scrub-line" aria-hidden="true"></span>
          <div class="scrub-readout" aria-hidden="true"><span class="scrub-current">0:00</span><span class="scrub-divider">/</span><span class="scrub-total">0:00</span></div>
        </div>
        <div class="now-playing-time" aria-live="off">
          <span class="now-playing-current">0:00</span><span aria-hidden="true">/</span><span class="now-playing-duration">0:00</span>
        </div>
        <div class="now-playing-controls">
          <button class="now-playing-control now-playing-share" type="button" aria-label="Share track information">${icons.share}</button>
          <button class="now-playing-control now-playing-previous" type="button" aria-label="Previous track">${icons.previous}</button>
          <button class="now-playing-control now-playing-toggle" type="button" aria-label="${audio.paused ? 'Play' : 'Pause'}">${audio.paused ? icons.play : icons.pause}</button>
          <button class="now-playing-control now-playing-next" type="button" aria-label="Next track">${icons.next}</button>
          <button class="now-playing-control now-playing-repeat ${runtime.repeatOne ? 'active' : ''}" type="button" aria-label="${runtime.repeatOne ? 'Disable repeat track' : 'Repeat track'}" aria-pressed="${runtime.repeatOne}">${icons.repeat}</button>
        </div>
      </section>
    `);

    const nowPlayingBackdrop = modalRoot.querySelector('.modal-backdrop');
    const nowPlayingSheet = modalRoot.querySelector('.modal-sheet');
    nowPlayingBackdrop?.classList.add('now-playing-backdrop');
    nowPlayingSheet?.classList.add('now-playing-sheet');
    requestAnimationFrame(() => {
      nowPlayingBackdrop?.classList.add('is-expanded');
      nowPlayingSheet?.classList.add('is-expanded');
    });

    modalRoot.querySelector('.now-playing-toggle')?.addEventListener('click', () => {
      togglePlayback();
      updateNowPlayingModal();
    });
    modalRoot.querySelector('.now-playing-share')?.addEventListener('click', shareCurrentTrack);
    modalRoot.querySelector('.now-playing-previous')?.addEventListener('click', () => playNext(-1));
    modalRoot.querySelector('.now-playing-next')?.addEventListener('click', () => playNext(1));
    modalRoot.querySelector('.now-playing-repeat')?.addEventListener('click', () => {
      runtime.repeatOne = !runtime.repeatOne;
      preloadNextTrack();
      updateNowPlayingModal();
    });
    updateNowPlayingModal();
  }

  function updateNowPlayingModal() {
    const modal = modalRoot.querySelector('.now-playing-modal');
    if (!modal) return;
    const playlist = getPlaylist(runtime.activePlaylistId);
    const track = getTrack(runtime.activePlaylistId, runtime.activeTrackId);
    if (!playlist || !track) {
      closeModal();
      return;
    }

    const title = modal.querySelector('.now-playing-title');
    const context = modal.querySelector('.now-playing-context');
    if (title) title.textContent = track.title;
    if (context) context.textContent = `${playlist.name} · ${state.profile.name}`;

    const toggle = modal.querySelector('.now-playing-toggle');
    if (toggle) {
      toggle.innerHTML = audio.paused ? icons.play : icons.pause;
      toggle.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause');
    }

    const repeat = modal.querySelector('.now-playing-repeat');
    if (repeat) {
      repeat.classList.toggle('active', runtime.repeatOne);
      repeat.setAttribute('aria-pressed', String(runtime.repeatOne));
      repeat.setAttribute('aria-label', runtime.repeatOne ? 'Disable repeat track' : 'Repeat track');
    }

    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const liveRatio = duration ? Math.max(0, Math.min(1, audio.currentTime / duration)) : 0;
    const ratio = runtime.scrub?.previewRatio ?? liveRatio;
    const previewTime = duration > 0 ? ratio * duration : 0;
    const waveform = modal.querySelector('.now-playing-waveform');
    updateWaveformDom(waveform, ratio, duration);

    const current = modal.querySelector('.now-playing-current');
    const total = modal.querySelector('.now-playing-duration');
    if (current) current.textContent = formatPlaybackTime(previewTime);
    if (total) total.textContent = formatPlaybackTime(duration);
  }

  function finishTransition() {
    requestAnimationFrame(() => {
      runtime.transition = null;
    });
  }

  function pageTransitionNodes() {
    return Array.from(app.children).filter((node) =>
      node.matches?.('.topbar, .screen, .home-add')
    );
  }

  async function animateCurrentPageOut(direction) {
    if (!direction || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const offset = direction === 'forward' ? '-36px' : '36px';
    const animations = pageTransitionNodes().map((node, index) => {
      const computedTransform = getComputedStyle(node).transform;
      const baseTransform = computedTransform === 'none' ? '' : computedTransform;
      const animation = node.animate([
        {
          opacity: 1,
          transform: baseTransform || 'translate3d(0, 0, 0)',
          filter: 'blur(0)'
        },
        {
          opacity: 0.18,
          transform: `${baseTransform} translate3d(${offset}, 0, 0)`.trim(),
          filter: 'blur(1.5px)'
        }
      ], {
        duration: 180 + index * 12,
        easing: 'cubic-bezier(.4, 0, .8, .35)',
        fill: 'forwards'
      });
      return animation.finished.catch(() => undefined);
    });
    await Promise.all(animations);
  }

  async function changePage(direction, updateView, scrollBehavior = 'auto') {
    const applyUpdate = () => {
      runtime.transition = direction;
      updateView();
      closeOverlays();
      render();
      finishTransition();
      window.scrollTo({ top: 0, behavior: scrollBehavior });
    };

    if (!direction) {
      applyUpdate();
      return;
    }

    if (typeof document.startViewTransition === 'function' &&
        !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      try {
        const transition = document.startViewTransition(applyUpdate);
        await transition.finished;
        return;
      } catch (_) {
        // Fall through to the Web Animations API transition.
      }
    }

    await animateCurrentPageOut(direction);
    applyUpdate();
  }

  function goHome(transition = runtime.view !== 'home' ? 'back' : null) {
    void changePage(transition, () => {
      runtime.view = 'home';
      runtime.playlistId = null;
    }, transition ? 'auto' : 'smooth');
  }

  function openPlaylist(id) {
    if (!getPlaylist(id)) return;
    const direction = runtime.view === 'home' ? 'forward' : null;
    void changePage(direction, () => {
      runtime.view = 'playlist';
      runtime.playlistId = id;
    }, 'auto').then(() => warmPlaylistStart(id));
  }

  function openUser() {
    const direction = runtime.view === 'home' ? 'forward' : null;
    void changePage(direction, () => {
      runtime.view = 'user';
      runtime.playlistId = null;
    }, 'auto');
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
      icon: icons.delete,
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

  function uploadTrackFile(playlistId, file, duration, waveform, onProgress) {
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
      if (waveform?.length) form.append('waveform', JSON.stringify(waveform));
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
        const analysis = await analyzeAudioFile(file);
        const result = await uploadTrackFile(
          playlistId,
          file,
          analysis.duration,
          analysis.waveform,
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

  function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!runtime.audioContext || runtime.audioContext.state === 'closed') {
      runtime.audioContext = new AudioContextClass();
    }
    return runtime.audioContext;
  }

  function buildWaveformFromAudioBuffer(buffer, sampleCount = WAVEFORM_SAMPLE_COUNT) {
    const length = Math.max(1, buffer.length || 1);
    const channels = Math.max(1, buffer.numberOfChannels || 1);
    const samples = [];

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const start = Math.floor((sampleIndex * length) / sampleCount);
      const end = Math.max(start + 1, Math.floor(((sampleIndex + 1) * length) / sampleCount));
      const stride = Math.max(1, Math.floor((end - start) / 640));
      let peak = 0;
      let energy = 0;
      let points = 0;

      for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
        const channel = buffer.getChannelData(channelIndex);
        for (let frame = start; frame < end; frame += stride) {
          const amplitude = Math.abs(channel[frame] || 0);
          peak = Math.max(peak, amplitude);
          energy += amplitude * amplitude;
          points += 1;
        }
      }

      const rms = points ? Math.sqrt(energy / points) : 0;
      samples.push(peak * 0.72 + rms * 0.28);
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const reference = sorted[Math.max(0, Math.floor(sorted.length * 0.97) - 1)] || Math.max(...samples, 1);
    return samples.map((sample) => {
      const normalized = Math.max(0, Math.min(1, sample / Math.max(reference, 0.00001)));
      return Math.round(Math.pow(normalized, 0.78) * 1000) / 1000;
    });
  }

  async function analyzeAudioArrayBuffer(arrayBuffer) {
    const context = getAudioContext();
    if (!context) throw new Error('Audio waveform analysis is unavailable in this browser.');
    const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
    return {
      duration: Number.isFinite(decoded.duration) ? decoded.duration : 0,
      waveform: buildWaveformFromAudioBuffer(decoded)
    };
  }

  async function readDurationFallback(file) {
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

  async function analyzeAudioFile(file) {
    try {
      return await analyzeAudioArrayBuffer(await file.arrayBuffer());
    } catch (error) {
      console.warn(`Could not analyze ${file.name}; the waveform will be generated after playback starts.`, error);
      return { duration: await readDurationFallback(file), waveform: [] };
    }
  }

  function refreshWaveformDisplays(track) {
    if (!track) return;
    document.querySelectorAll(`[data-track-id="${CSS.escape(track.id)}"]`).forEach((surface) => {
      const data = surface.querySelector('.waveform-data');
      if (data) data.innerHTML = waveformMarkup(track);
      delete surface.dataset.playedCount;
    });
    updatePlayerDom();
    updateNowPlayingModal();
  }

  function ensureTrackWaveform(track) {
    if (!track?.storageName || normalizeWaveform(track.waveform).length) return Promise.resolve(track?.waveform || []);
    if (runtime.waveformAnalyses.has(track.id)) return runtime.waveformAnalyses.get(track.id);

    const analysis = new Promise((resolve) => {
      window.setTimeout(async () => {
        try {
          const waitDeadline = Date.now() + 6000;
          while (
            !audio.paused
            && runtime.queue.length > 1
            && standbyAudio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA
            && Date.now() < waitDeadline
          ) {
            await new Promise((resolveWait) => window.setTimeout(resolveWait, 250));
          }
          const response = await fetch(trackStreamUrl(track), { cache: 'force-cache' });
          if (!response.ok) throw new Error(`Waveform request failed (${response.status}).`);
          const result = await analyzeAudioArrayBuffer(await response.arrayBuffer());
          track.waveform = result.waveform;
          if (!track.duration && result.duration) track.duration = result.duration;
          refreshWaveformDisplays(track);
          await saveState();
          resolve(track.waveform);
        } catch (error) {
          console.warn(`Could not generate the waveform for ${track.title}.`, error);
          resolve([]);
        } finally {
          runtime.waveformAnalyses.delete(track.id);
        }
      }, 900);
    });

    runtime.waveformAnalyses.set(track.id, analysis);
    return analysis;
  }

  function trackStreamUrl(track) {
    const version = encodeURIComponent(track.contentHash || track.storageName || track.id);
    return `/api/tracks/${encodeURIComponent(track.id)}/audio?v=${version}`;
  }

  function resetAudioElement(element) {
    if (!element) return;
    try { element.pause(); } catch (_) { /* The element may not have started. */ }
    element.removeAttribute('src');
    delete element.dataset.trackId;
    delete element.dataset.playlistId;
    element.preload = 'auto';
    try { element.load(); } catch (_) { /* Ignore media reset failures. */ }
  }

  function assignAudioSource(element, playlistId, track) {
    if (!element || !track?.storageName) return;
    const alreadyAssigned = element.dataset.trackId === track.id
      && element.dataset.playlistId === playlistId
      && element.getAttribute('src');
    if (alreadyAssigned) return;
    element.preload = 'auto';
    element.src = trackStreamUrl(track);
    element.dataset.trackId = track.id;
    element.dataset.playlistId = playlistId;
    element.load();
  }

  function audioElementMatches(element, playlistId, trackId) {
    return Boolean(
      element
      && element.dataset.playlistId === playlistId
      && element.dataset.trackId === trackId
      && element.getAttribute('src')
    );
  }

  function standbyMatches(playlistId, trackId) {
    return audioElementMatches(standbyAudio, playlistId, trackId);
  }

  function queuedTrackEntry(offset = 1) {
    if (!runtime.queue.length || !runtime.activePlaylistId) return null;
    const index = (runtime.queueIndex + offset + runtime.queue.length) % runtime.queue.length;
    const trackId = runtime.queue[index];
    const track = getTrack(runtime.activePlaylistId, trackId);
    return track?.storageName
      ? { playlistId: runtime.activePlaylistId, trackId, track, index }
      : null;
  }

  function prepareStandbyTrack(playlistId, trackId) {
    const track = getTrack(playlistId, trackId);
    if (!track?.storageName || !standbyAudio) return Promise.resolve(false);
    if (trackId === runtime.activeTrackId && playlistId === runtime.activePlaylistId) return Promise.resolve(false);
    if (standbyMatches(playlistId, trackId)) return Promise.resolve(true);

    const preloadToken = ++runtime.preloadToken;
    const preloadElement = standbyAudio;
    runtime.preloadedPlaylistId = playlistId;
    runtime.preloadedTrackId = trackId;
    resetAudioElement(preloadElement);
    assignAudioSource(preloadElement, playlistId, track);

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId = 0;
      const finish = (ready) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        preloadElement.removeEventListener('canplay', handleCanPlay);
        preloadElement.removeEventListener('error', handleError);
        if (
          preloadToken !== runtime.preloadToken
          || preloadElement !== standbyAudio
          || !audioElementMatches(preloadElement, playlistId, trackId)
        ) {
          resolve(false);
          return;
        }
        resolve(ready);
      };
      const handleCanPlay = () => finish(true);
      const handleError = () => finish(false);

      if (preloadElement.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        finish(true);
        return;
      }

      preloadElement.addEventListener('canplay', handleCanPlay, { once: true });
      preloadElement.addEventListener('error', handleError, { once: true });
      timeoutId = window.setTimeout(
        () => finish(preloadElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA),
        12000
      );
    });
  }

  function preloadNextTrack() {
    if (runtime.repeatOne || runtime.queue.length < 2) {
      runtime.preloadedPlaylistId = null;
      runtime.preloadedTrackId = null;
      runtime.preloadToken += 1;
      resetAudioElement(standbyAudio);
      return;
    }
    const next = queuedTrackEntry(1);
    if (next) void prepareStandbyTrack(next.playlistId, next.trackId);
  }

  function warmTrack(track, playlistId = null) {
    if (!track?.storageName) return;
    const resolvedPlaylistId = playlistId
      || state.playlists.find((playlist) => playlist.tracks.some((item) => item.id === track.id))?.id;
    if (!resolvedPlaylistId) return;

    if (runtime.activeTrackId) {
      const next = queuedTrackEntry(1);
      if (!next || next.trackId !== track.id || next.playlistId !== resolvedPlaylistId) return;
    }
    void prepareStandbyTrack(resolvedPlaylistId, track.id);
  }

  function warmPlaylistStart(playlistId) {
    if (runtime.activeTrackId) return;
    const firstTrack = getPlaylist(playlistId)?.tracks.find((track) => track.storageName);
    if (firstTrack) warmTrack(firstTrack, playlistId);
  }

  function takePreparedAudio(playlistId, trackId) {
    if (!standbyMatches(playlistId, trackId)) return null;

    const previousAudio = audio;
    const preparedAudio = standbyAudio;
    audio = preparedAudio;
    standbyAudio = previousAudio;
    previousAudio.pause();

    runtime.preloadToken += 1;
    runtime.preloadedPlaylistId = null;
    runtime.preloadedTrackId = null;

    try {
      if (audio.currentTime > 0.05) audio.currentTime = 0;
    } catch (_) { /* Some formats do not allow seeking before metadata is ready. */ }

    const playPromise = audio.play();
    resetAudioElement(standbyAudio);
    return playPromise;
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

  async function playTrack(playlistId, trackId, options = {}) {
    const playlist = getPlaylist(playlistId);
    const track = getTrack(playlistId, trackId);
    if (!playlist || !track) return;
    if (!track.storageName) {
      showToast('This uploaded audio file is unavailable.', true);
      return;
    }

    if (runtime.activeTrackId === trackId && audio.dataset.trackId === trackId) {
      if (options.restart) {
        try { audio.currentTime = 0; } catch (_) { /* Ignore an early seek failure. */ }
        audio.play().catch(() => showToast('Playback could not start.', true));
      } else if (options.openIfActive !== false) {
        openNowPlayingModal();
      }
      return;
    }

    runtime.activePlaylistId = playlistId;
    runtime.activeTrackId = trackId;
    runtime.queue = playlist.tracks.filter((item) => item.storageName).map((item) => item.id);
    runtime.queueIndex = runtime.queue.indexOf(trackId);

    let playPromise = takePreparedAudio(playlistId, trackId);
    if (!playPromise) {
      runtime.preloadToken += 1;
      runtime.preloadedPlaylistId = null;
      runtime.preloadedTrackId = null;
      resetAudioElement(standbyAudio);
      audio.pause();
      assignAudioSource(audio, playlistId, track);
      playPromise = audio.play();
    }

    render();
    updateMediaSession();
    preloadNextTrack();
    ensureTrackWaveform(track);
    try {
      await playPromise;
    } catch (error) {
      console.warn('Playback did not start.', error);
      showToast('Tap play to start audio.', true);
    }
    updatePlayerDom();
    updateNowPlayingModal();
  }

  function togglePlayback() {
    if (!runtime.activeTrackId) return;
    if (audio.paused) audio.play().catch(() => showToast('Playback could not start.', true));
    else audio.pause();
  }

  function stopPlayback() {
    runtime.preloadToken += 1;
    audioPlayers.forEach(resetAudioElement);
    audio = primaryAudio;
    standbyAudio = audioPlayers.find((element) => element !== audio) || standbyAudio;
    runtime.preloadedPlaylistId = null;
    runtime.preloadedTrackId = null;
    runtime.handoffInProgress = false;
    runtime.activePlaylistId = null;
    runtime.activeTrackId = null;
    runtime.queue = [];
    runtime.queueIndex = -1;
    if (modalRoot.querySelector('.now-playing-modal')) closeModal();
    render();
  }

  async function playNext(direction = 1) {
    if (!runtime.queue.length || runtime.handoffInProgress) return;
    runtime.handoffInProgress = true;
    try {
      const nextIndex = (runtime.queueIndex + direction + runtime.queue.length) % runtime.queue.length;
      const nextTrackId = runtime.queue[nextIndex];
      await playTrack(runtime.activePlaylistId, nextTrackId, {
        openIfActive: false,
        restart: nextTrackId === runtime.activeTrackId
      });
    } finally {
      runtime.handoffInProgress = false;
    }
  }

  function updateWaveformDom(element, ratio, duration) {
    if (!element) return;
    const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
    const bars = [...element.querySelectorAll('.wave-bar')];
    const playedCount = bars.length ? Math.min(bars.length, Math.floor(safeRatio * Math.max(1, bars.length - 1)) + 1) : 0;
    const previousCount = Number(element.dataset.playedCount);
    if (!Number.isFinite(previousCount)) {
      bars.forEach((bar, index) => bar.classList.toggle('played', index < playedCount));
    } else if (playedCount > previousCount) {
      for (let index = previousCount; index < playedCount; index += 1) bars[index]?.classList.add('played');
    } else if (playedCount < previousCount) {
      for (let index = playedCount; index < previousCount; index += 1) bars[index]?.classList.remove('played');
    }
    element.dataset.playedCount = String(playedCount);

    const waveformData = element.querySelector('.waveform-data');
    if (waveformData) waveformData.style.transform = `translate3d(-${safeRatio * 100}%, 0, 0)`;

    element.setAttribute('aria-valuenow', String(Math.round(safeRatio * 100)));
    const current = element.querySelector('.scrub-current');
    const total = element.querySelector('.scrub-total');
    const currentTime = duration > 0 ? safeRatio * duration : 0;
    if (current) current.textContent = formatPlaybackTime(currentTime);
    if (total) total.textContent = formatPlaybackTime(duration);
  }

  function ratioFromScrubPointer(clientX, scrub) {
    if (!scrub) return 0;
    const deltaX = Number(clientX) - scrub.startClientX;
    return Math.max(0, Math.min(1, scrub.startRatio - (deltaX / Math.max(1, scrub.width))));
  }

  function paintScrubPreview(ratio) {
    const scrub = runtime.scrub;
    if (!scrub) return;
    scrub.previewRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
    updatePlayerDom();
    updateNowPlayingModal();
  }

  function scheduleScrubPreview(clientX) {
    const scrub = runtime.scrub;
    if (!scrub) return;
    scrub.pendingClientX = clientX;
    if (scrub.frame) return;
    scrub.frame = requestAnimationFrame(() => {
      const active = runtime.scrub;
      if (!active) return;
      active.frame = 0;
      paintScrubPreview(ratioFromScrubPointer(active.pendingClientX, active));
    });
  }

  function beginScrub(event) {
    const element = event.target.closest('[data-scrubber]');
    if (!element || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    const wasPlaying = !audio.paused;
    const currentRatio = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
    const scrubBounds = element.getBoundingClientRect();
    runtime.scrub = {
      pointerId: event.pointerId,
      element,
      wasPlaying,
      surface: element.dataset.scrubber,
      previewRatio: currentRatio,
      startRatio: currentRatio,
      startClientX: event.clientX,
      width: Math.max(1, scrubBounds.width),
      pendingClientX: event.clientX,
      frame: 0
    };

    document.body.classList.add('scrubbing');
    element.classList.add('is-scrubbing');
    app.querySelector('.player-dock')?.classList.add('is-scrubbing');
    modalRoot.querySelector('.now-playing-modal')?.classList.add('is-scrubbing');
    try { element.setPointerCapture(event.pointerId); } catch (_) { /* Older Safari can reject pointer capture. */ }
    if (wasPlaying) audio.pause();
    paintScrubPreview(currentRatio);
  }

  function moveScrub(event) {
    const scrub = runtime.scrub;
    if (!scrub || scrub.pointerId !== event.pointerId) return;
    event.preventDefault();
    scheduleScrubPreview(event.clientX);
  }

  function endScrub(event) {
    const scrub = runtime.scrub;
    if (!scrub || scrub.pointerId !== event.pointerId) return;
    event.preventDefault();

    if (scrub.frame) cancelAnimationFrame(scrub.frame);
    const finalRatio = event.type === 'pointercancel'
      ? scrub.previewRatio
      : ratioFromScrubPointer(event.clientX, scrub);
    scrub.previewRatio = finalRatio;
    updatePlayerDom();
    updateNowPlayingModal();

    const targetTime = finalRatio * audio.duration;
    if (Number.isFinite(targetTime)) {
      try {
        if (typeof audio.fastSeek === 'function') audio.fastSeek(targetTime);
        else audio.currentTime = targetTime;
      } catch (_) {
        audio.currentTime = targetTime;
      }
    }

    try { scrub.element.releasePointerCapture(event.pointerId); } catch (_) { /* Ignore unsupported capture release. */ }
    scrub.element.classList.remove('is-scrubbing');
    app.querySelector('.player-dock')?.classList.remove('is-scrubbing');
    modalRoot.querySelector('.now-playing-modal')?.classList.remove('is-scrubbing');
    document.body.classList.remove('scrubbing');
    runtime.scrub = null;
    runtime.suppressClickUntil = Date.now() + 180;
    updatePlayerDom();
    updateNowPlayingModal();
    if (scrub.wasPlaying) audio.play().catch(() => undefined);
  }

  function startPlaybackUiLoop() {
    if (runtime.playbackFrame) return;
    const tick = (timestamp) => {
      if (audio.paused || runtime.scrub) {
        runtime.playbackFrame = 0;
        runtime.playbackFrameTimestamp = 0;
        return;
      }
      if (!runtime.playbackFrameTimestamp || timestamp - runtime.playbackFrameTimestamp >= 30) {
        runtime.playbackFrameTimestamp = timestamp;
        updatePlayerDom();
        updateNowPlayingModal();
      }
      runtime.playbackFrame = requestAnimationFrame(tick);
    };
    runtime.playbackFrame = requestAnimationFrame(tick);
  }

  function stopPlaybackUiLoop() {
    if (runtime.playbackFrame) cancelAnimationFrame(runtime.playbackFrame);
    runtime.playbackFrame = 0;
    runtime.playbackFrameTimestamp = 0;
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
      case 'open-now-playing': openNowPlayingModal(); break;
      case 'share-track': shareCurrentTrack(); break;
      case 'close-modal': closeModal(); break;
      default: break;
    }
  }

  function beginNavigationSwipe(event) {
    if (event.target.closest('[data-scrubber], .player-dock')) return;
    if (runtime.view !== 'playlist' || modalRoot.children.length || event.button !== undefined && event.button !== 0) return;
    const screen = app.querySelector('.playlist-screen');
    if (!screen) return;
    runtime.navSwipe = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      startedAt: performance.now(),
      active: false,
      screen
    };
  }

  function moveNavigationSwipe(event) {
    const swipe = runtime.navSwipe;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;
    swipe.lastX = event.clientX;

    if (!swipe.active) {
      if (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx)) {
        runtime.navSwipe = null;
        return;
      }
      if (dx <= 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      swipe.active = true;
      if (runtime.drag?.timer) clearTimeout(runtime.drag.timer);
      runtime.drag = null;
      swipe.screen.classList.add('screen-swiping');
    }

    event.preventDefault();
    const distance = Math.max(0, Math.min(window.innerWidth, dx));
    swipe.screen.style.transform = `translate3d(${distance}px, 0, 0)`;
    swipe.screen.style.opacity = String(1 - Math.min(.35, distance / window.innerWidth * .35));
  }

  function endNavigationSwipe(event) {
    const swipe = runtime.navSwipe;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    runtime.navSwipe = null;
    if (!swipe.active) return;

    const dx = Math.max(0, swipe.lastX - swipe.startX);
    const elapsed = Math.max(1, performance.now() - swipe.startedAt);
    const velocity = dx / elapsed;
    const shouldClose = dx > Math.min(110, window.innerWidth * .24) || velocity > .55;

    swipe.screen.style.transition = 'transform .24s cubic-bezier(.2,.8,.2,1), opacity .24s ease';
    swipe.screen.style.transform = shouldClose ? 'translate3d(100vw, 0, 0)' : 'translate3d(0, 0, 0)';
    swipe.screen.style.opacity = shouldClose ? '0.65' : '1';

    const complete = () => {
      swipe.screen.removeEventListener('transitionend', complete);
      if (shouldClose) goHome(null);
      else {
        swipe.screen.classList.remove('screen-swiping');
        swipe.screen.style.removeProperty('transition');
        swipe.screen.style.removeProperty('transform');
        swipe.screen.style.removeProperty('opacity');
      }
    };
    swipe.screen.addEventListener('transitionend', complete);
    setTimeout(complete, 320);
  }

  function beginLongPress(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const touchedTrack = event.target.closest('.track-row');
    if (touchedTrack) warmTrack(
      getTrack(touchedTrack.dataset.playlistId, touchedTrack.dataset.trackId),
      touchedTrack.dataset.playlistId
    );
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
  app.addEventListener('pointerdown', beginScrub);
  app.addEventListener('pointerdown', beginNavigationSwipe);
  app.addEventListener('pointerdown', beginLongPress);
  modalRoot.addEventListener('pointerdown', beginScrub);
  window.addEventListener('pointermove', moveScrub, { passive: false });
  window.addEventListener('pointermove', moveNavigationSwipe, { passive: false });
  window.addEventListener('pointermove', moveLongPress, { passive: false });
  window.addEventListener('pointerup', endScrub);
  window.addEventListener('pointerup', endNavigationSwipe);
  window.addEventListener('pointerup', endLongPress);
  window.addEventListener('pointercancel', endScrub);
  window.addEventListener('pointercancel', endNavigationSwipe);
  window.addEventListener('pointercancel', endLongPress);

  modalRoot.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close-modal"]')) closeModal();
  });

  trackPicker.addEventListener('change', () => handleTrackFiles([...trackPicker.files]));
  trackPicker.addEventListener('cancel', () => {
    runtime.pickerPlaylistId = null;
  });

  function bindAudioPlayer(element) {
    element.addEventListener('timeupdate', () => {
      if (element !== audio) return;
      updatePlayerDom();
      updateNowPlayingModal();
    });
    element.addEventListener('durationchange', () => {
      if (element !== audio) return;
      updatePlayerDom();
      updateNowPlayingModal();
    });
    element.addEventListener('play', () => {
      if (element !== audio) return;
      updatePlayerDom();
      updateNowPlayingModal();
      updateMediaSession();
      startPlaybackUiLoop();
      preloadNextTrack();
    });
    element.addEventListener('pause', () => {
      if (element !== audio) return;
      updatePlayerDom();
      updateNowPlayingModal();
      updateMediaSession();
      stopPlaybackUiLoop();
    });
    element.addEventListener('ended', () => {
      if (element !== audio) return;
      if (runtime.repeatOne) {
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
        return;
      }
      void playNext(1);
    });
    element.addEventListener('error', () => {
      if (element === standbyAudio) {
        runtime.preloadToken += 1;
        runtime.preloadedPlaylistId = null;
        runtime.preloadedTrackId = null;
        resetAudioElement(standbyAudio);
        return;
      }
      if (element === audio) showToast('This audio format could not be played.', true);
    });
  }

  audioPlayers.forEach(bindAudioPlayer);


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
