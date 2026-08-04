'use strict';

const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const express = require('express');
const multer = require('multer');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const STORAGE_DIR = path.resolve(
  process.env.STORAGE_DIR
  || process.env.RAILWAY_VOLUME_MOUNT_PATH
  || path.join(ROOT_DIR, 'data')
);
const MUSIC_DIR = path.join(STORAGE_DIR, 'music');
const TEMP_DIR = path.join(STORAGE_DIR, 'tmp');
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const MAX_FILE_SIZE_MB = Math.max(1, Number(process.env.MAX_FILE_SIZE_MB) || 1024);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.m4a', '.aac', '.wav', '.aiff', '.aif', '.flac', '.ogg', '.oga',
  '.opus', '.caf', '.mp4', '.m4b'
]);

let state = null;
let mutationQueue = Promise.resolve();

function createId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}`;
}

function defaultState() {
  const now = new Date().toISOString();
  return {
    version: 3,
    profile: {
      name: 'RaidenLabs',
      avatar: null,
      joinedAt: '2025-05-01'
    },
    playlists: [
      { id: createId('playlist'), name: 'remix.exe', cover: null, gradient: 0, createdAt: now, tracks: [] },
      { id: createId('playlist'), name: 'Linkin Park', cover: null, gradient: 1, createdAt: now, tracks: [] }
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

function safeString(value, fallback = '', maxLength = 500) {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, maxLength);
}

function sanitizeDataUrl(value) {
  if (value == null || value === '') return null;
  const string = safeString(value, '', 2_500_000);
  return /^data:image\/(?:png|jpe?g|webp);base64,/i.test(string) ? string : null;
}

function sanitizeTrack(track = {}) {
  return {
    id: safeString(track.id, createId('track'), 160),
    title: safeString(track.title, 'Untitled', 300),
    fileName: safeString(track.fileName, '', 500),
    fingerprint: safeString(track.fingerprint, '', 1000),
    size: Math.max(0, Number(track.size) || 0),
    lastModified: Math.max(0, Number(track.lastModified) || 0),
    type: safeString(track.type, '', 200),
    duration: Math.max(0, Number(track.duration) || 0),
    addedAt: safeString(track.addedAt, new Date().toISOString(), 100),
    storageName: safeString(track.storageName, '', 300),
    contentHash: safeString(track.contentHash, '', 128)
  };
}

function sanitizeState(candidate, previousState = state) {
  const fallback = previousState || defaultState();
  const profile = candidate?.profile || fallback.profile;
  const playlists = Array.isArray(candidate?.playlists) ? candidate.playlists : fallback.playlists;

  return {
    version: 3,
    profile: {
      name: safeString(profile?.name, fallback.profile.name, 60).trim() || fallback.profile.name,
      avatar: sanitizeDataUrl(profile?.avatar),
      joinedAt: safeString(profile?.joinedAt, fallback.profile.joinedAt, 32)
    },
    playlists: playlists.slice(0, 500).map((playlist, index) => ({
      id: safeString(playlist?.id, createId('playlist'), 160),
      name: safeString(playlist?.name, 'Untitled Playlist', 80).trim() || 'Untitled Playlist',
      cover: sanitizeDataUrl(playlist?.cover),
      gradient: Math.max(0, Number(playlist?.gradient) || index),
      createdAt: safeString(playlist?.createdAt, new Date().toISOString(), 100),
      tracks: Array.isArray(playlist?.tracks)
        ? playlist.tracks.slice(0, 10000).map(sanitizeTrack)
        : []
    }))
  };
}

async function ensureStorage() {
  await Promise.all([
    fsp.mkdir(STORAGE_DIR, { recursive: true }),
    fsp.mkdir(MUSIC_DIR, { recursive: true }),
    fsp.mkdir(TEMP_DIR, { recursive: true })
  ]);

  try {
    const raw = await fsp.readFile(STATE_FILE, 'utf8');
    state = sanitizeState(JSON.parse(raw), defaultState());
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Could not read saved state; creating a clean state.', error);
    state = defaultState();
    await writeState();
  }

  const tempFiles = await fsp.readdir(TEMP_DIR).catch(() => []);
  await Promise.all(tempFiles.map((name) => fsp.rm(path.join(TEMP_DIR, name), { force: true })));
}

async function writeState() {
  const tempState = `${STATE_FILE}.${process.pid}.tmp`;
  await fsp.writeFile(tempState, JSON.stringify(state, null, 2), 'utf8');
  await fsp.rename(tempState, STATE_FILE);
}

function withMutation(task) {
  const operation = mutationQueue.then(task, task);
  mutationQueue = operation.catch(() => undefined);
  return operation;
}

function allReferencedStorageNames(currentState = state) {
  const names = new Set();
  for (const playlist of currentState.playlists) {
    for (const track of playlist.tracks) {
      if (track.storageName) names.add(track.storageName);
    }
  }
  return names;
}

async function removeOrphanedMusic(previousState, nextState) {
  const before = allReferencedStorageNames(previousState);
  const after = allReferencedStorageNames(nextState);
  const removed = [...before].filter((name) => !after.has(name));
  await Promise.all(removed.map((name) => fsp.rm(path.join(MUSIC_DIR, path.basename(name)), { force: true })));
}

function findTrack(trackId) {
  for (const playlist of state.playlists) {
    const track = playlist.tracks.find((item) => item.id === trackId);
    if (track) return { playlist, track };
  }
  return null;
}

function decodeOriginalName(name) {
  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? name : decoded;
  } catch (_) {
    return name;
  }
}

function isSupportedAudio(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  return Boolean(file.mimetype?.startsWith('audio/')) || AUDIO_EXTENSIONS.has(extension);
}

async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function contentTypeFor(track) {
  if (track.type?.startsWith('audio/')) return track.type;
  const extension = path.extname(track.fileName || track.storageName || '').toLowerCase();
  const types = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.wav': 'audio/wav',
    '.aiff': 'audio/aiff',
    '.aif': 'audio/aiff',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.oga': 'audio/ogg',
    '.opus': 'audio/ogg',
    '.caf': 'audio/x-caf',
    '.mp4': 'audio/mp4',
    '.m4b': 'audio/mp4'
  };
  return types[extension] || 'application/octet-stream';
}

function basicAuth(req, res, next) {
  const expectedUser = process.env.APP_USERNAME;
  const expectedPassword = process.env.APP_PASSWORD;
  if (!expectedUser && !expectedPassword) return next();
  if (!expectedUser || !expectedPassword) {
    return res.status(503).send('Set both APP_USERNAME and APP_PASSWORD, or remove both variables.');
  }

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) {
    res.set('WWW-Authenticate', 'Basic realm="iDroid", charset="UTF-8"');
    return res.status(401).send('Authentication required.');
  }

  let suppliedUser = '';
  let suppliedPassword = '';
  try {
    const credentials = Buffer.from(encoded, 'base64').toString('utf8');
    const separator = credentials.indexOf(':');
    suppliedUser = separator >= 0 ? credentials.slice(0, separator) : credentials;
    suppliedPassword = separator >= 0 ? credentials.slice(separator + 1) : '';
  } catch (_) {
    res.set('WWW-Authenticate', 'Basic realm="iDroid", charset="UTF-8"');
    return res.status(401).send('Authentication required.');
  }

  const suppliedUserBuffer = Buffer.from(suppliedUser);
  const expectedUserBuffer = Buffer.from(expectedUser);
  const suppliedPasswordBuffer = Buffer.from(suppliedPassword);
  const expectedPasswordBuffer = Buffer.from(expectedPassword);
  const userMatches = suppliedUserBuffer.length === expectedUserBuffer.length
    && crypto.timingSafeEqual(suppliedUserBuffer, expectedUserBuffer);
  const passwordMatches = suppliedPasswordBuffer.length === expectedPasswordBuffer.length
    && crypto.timingSafeEqual(suppliedPasswordBuffer, expectedPasswordBuffer);

  if (!userMatches || !passwordMatches) {
    res.set('WWW-Authenticate', 'Basic realm="iDroid", charset="UTF-8"');
    return res.status(401).send('Authentication required.');
  }
  next();
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, TEMP_DIR),
    filename: (_req, _file, callback) => callback(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.upload`)
  }),
  limits: {
    files: 1,
    fileSize: MAX_FILE_SIZE_BYTES,
    fields: 20,
    parts: 25,
    fieldNestingDepth: 2
  },
  fileFilter: (_req, file, callback) => {
    file.originalname = decodeOriginalName(file.originalname);
    const supported = isSupportedAudio(file);
    if (!supported) {
      const error = new Error('Unsupported audio file.');
      error.status = 400;
      callback(error, false);
      return;
    }
    callback(null, true);
  }
});

app.disable('x-powered-by');
app.use(express.json({ limit: '50mb' }));
app.get('/api/health', (_req, res) => res.status(200).json({ ok: true }));
app.use(basicAuth);

const publicFiles = new Set([
  '/styles.css',
  '/app.js',
  '/sw.js',
  '/manifest.webmanifest',
  '/music.png'
]);
app.get([...publicFiles], (req, res) => {
  res.sendFile(path.join(ROOT_DIR, path.basename(req.path)));
});
app.use('/assets', express.static(path.join(ROOT_DIR, 'assets'), {
  dotfiles: 'deny',
  etag: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

app.get('/api/state', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(state);
});

app.put('/api/state', async (req, res, next) => {
  try {
    const nextState = sanitizeState(req.body, state);
    await withMutation(async () => {
      const previousState = state;
      state = nextState;
      await writeState();
      await removeOrphanedMusic(previousState, nextState).catch((error) => {
        console.warn('Could not remove an unreferenced music file.', error);
      });
    });
    res.set('Cache-Control', 'no-store');
    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.post('/api/playlists/:playlistId/tracks', upload.single('file'), async (req, res, next) => {
  const temporaryPath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose an audio file.' });

    const result = await withMutation(async () => {
      const playlist = state.playlists.find((item) => item.id === req.params.playlistId);
      if (!playlist) {
        const error = new Error('Playlist not found.');
        error.status = 404;
        throw error;
      }

      const originalName = decodeOriginalName(req.file.originalname);
      const lastModified = Math.max(0, Number(req.body.lastModified) || 0);
      const fingerprint = `${originalName}::${req.file.size}::${lastModified}`;
      const existingFingerprint = playlist.tracks.find((track) => track.fingerprint === fingerprint);
      if (existingFingerprint) {
        await fsp.rm(temporaryPath, { force: true });
        return { skipped: true, track: existingFingerprint };
      }

      const contentHash = await hashFile(temporaryPath);
      const existingContent = playlist.tracks.find((track) => track.contentHash === contentHash);
      if (existingContent) {
        await fsp.rm(temporaryPath, { force: true });
        return { skipped: true, track: existingContent };
      }

      const extension = AUDIO_EXTENSIONS.has(path.extname(originalName).toLowerCase())
        ? path.extname(originalName).toLowerCase()
        : '';
      const storageName = `${contentHash}${extension}`;
      const destination = path.join(MUSIC_DIR, storageName);

      try {
        await fsp.access(destination, fs.constants.F_OK);
        await fsp.rm(temporaryPath, { force: true });
      } catch (_) {
        await fsp.rename(temporaryPath, destination);
      }

      const track = sanitizeTrack({
        id: createId('track'),
        title: safeString(req.body.title, path.basename(originalName, path.extname(originalName)), 300),
        fileName: originalName,
        fingerprint,
        size: req.file.size,
        lastModified,
        type: safeString(req.file.mimetype, '', 200),
        duration: Math.max(0, Number(req.body.duration) || 0),
        addedAt: new Date().toISOString(),
        storageName,
        contentHash
      });

      playlist.tracks.push(track);
      await writeState();
      return { skipped: false, track };
    });

    res.status(result.skipped ? 200 : 201).json({ ...result, state });
  } catch (error) {
    if (temporaryPath) await fsp.rm(temporaryPath, { force: true }).catch(() => undefined);
    next(error);
  }
});

app.get('/api/tracks/:trackId/audio', async (req, res, next) => {
  try {
    const match = findTrack(req.params.trackId);
    if (!match?.track.storageName) return res.status(404).end();

    const filePath = path.join(MUSIC_DIR, path.basename(match.track.storageName));
    const file = await fsp.stat(filePath);
    const total = file.size;
    const range = req.headers.range;

    res.set({
      'Accept-Ranges': 'bytes',
      'Content-Type': contentTypeFor(match.track),
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(match.track.fileName || 'audio')}`
    });

    if (!range) {
      res.status(200).set('Content-Length', total);
      fs.createReadStream(filePath).on('error', next).pipe(res);
      return;
    }

    const matchRange = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!matchRange) {
      res.status(416).set('Content-Range', `bytes */${total}`).end();
      return;
    }

    let start = matchRange[1] ? Number(matchRange[1]) : 0;
    let end = matchRange[2] ? Number(matchRange[2]) : total - 1;
    if (!matchRange[1] && matchRange[2]) {
      const suffixLength = Number(matchRange[2]);
      start = Math.max(0, total - suffixLength);
      end = total - 1;
    }
    end = Math.min(end, total - 1);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= total) {
      res.status(416).set('Content-Range', `bytes */${total}`).end();
      return;
    }

    const chunkSize = end - start + 1;
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': chunkSize
    });
    fs.createReadStream(filePath, { start, end }).on('error', next).pipe(res);
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).end();
    next(error);
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `That file exceeds the ${MAX_FILE_SIZE_MB} MB upload limit.` });
  }
  const status = Number(error.status) || 500;
  res.status(status).json({ error: status >= 500 ? 'The server could not complete that request.' : error.message });
});

ensureStorage()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`iDroid is running on port ${PORT}. Persistent data: ${STORAGE_DIR}`);
    });
  })
  .catch((error) => {
    console.error('iDroid could not initialize its persistent storage.', error);
    process.exit(1);
  });
