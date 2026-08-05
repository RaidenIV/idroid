# iDroid Music Player — Railway Edition

iDroid is an iPhone-first HTML/CSS/JavaScript music player backed by a small Node.js server. Music selected from the iPhone Files app is uploaded once to a Railway persistent volume, so playlists and playback remain available after refreshing, closing, or reinstalling the web app.

## What is stored

The Railway volume stores:

- Uploaded music files.
- Playlist names, ordering, and cover artwork.
- Track names, ordering, durations, and file metadata.
- The user name and profile picture.

The app does not require MongoDB or another database. A single `state.json` file stores library metadata, while the audio files are stored separately in the volume. Identical audio files are content-hashed and reused instead of being stored more than once.

## Included features

- Existing iDroid mobile interface and navigation.
- Permanent server-backed playlists and profile settings.
- Sequential multi-file uploads from the iPhone Files app.
- Per-file upload progress.
- HTTP byte-range streaming for seeking and iPhone playback.
- Playlist and song drag reordering.
- Automatic duplicate detection within a playlist.
- Removal of unreferenced audio when a track, playlist, or account is deleted.
- PWA installation with `music.png` as the favicon and iOS icon.


## Repository layout

```text
idroid/
├── public/
│   ├── assets/
│   │   ├── css/        # Application styles
│   │   ├── icons/      # Interface SVG icons
│   │   ├── images/     # App artwork and favicon
│   │   ├── js/         # Browser application code
│   │   └── pwa/        # Generated install icons
│   ├── index.html
│   ├── manifest.webmanifest
│   └── sw.js
├── src/
│   └── server.js       # Express API, uploads, and audio streaming
├── .env.example
├── .gitignore
├── package.json
├── railway.toml
└── README.md
```

The Express server serves everything under `public/`. Persistent audio and `state.json` remain outside the application source in the configured `STORAGE_DIR`.

## Railway deployment

1. Upload this reorganized project to the root of the GitHub repository.
2. In Railway, create a project and choose **Deploy from GitHub Repo**.
3. Select the iDroid repository.
4. Open the new service and add a persistent volume.
5. Mount the volume at:

   ```text
   /data
   ```

6. Add these service variables:

   ```text
   STORAGE_DIR=/data
   MAX_FILE_SIZE_MB=1024
   ```

7. Generate a Railway domain from the service networking settings.
8. Keep the service at one replica because the attached volume belongs to that service instance.
9. Open the Railway URL in Safari, tap **Share**, and choose **Add to Home Screen**.

This version does not include a login prompt. Anyone with the Railway URL can access the library, so keep the URL private or add access control at the platform/network layer later.

The service includes `/api/health`, and `railway.toml` configures it as the Railway health check.

## Volume sizing and backups

A few gigabytes of music only needs a small fraction of the available Pro volume capacity. Start with the default allocation or a modest volume and resize it later when needed. Configure Railway volume backups after deployment so the music library and metadata can be restored after accidental deletion.

## Local development

Install Node.js 20 or newer, then run:

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Without `STORAGE_DIR`, local data is written to the ignored `data/` directory in the project.

## Supported audio formats

The file picker accepts MP3, M4A, AAC, WAV, AIFF, FLAC, OGG, Opus, CAF, MP4, and M4B. Actual playback still depends on Safari and the codec inside the selected file. MP3 and AAC/M4A are the safest formats for iPhone playback.

## Important operational notes

- Do not deploy this version to GitHub Pages; GitHub Pages cannot run the Node.js upload and streaming server.
- Do not remove or remount the Railway volume unless the music library has been backed up.
- The app should use one Railway service replica while it relies on a directly attached volume.
- Increasing the volume size does not require code changes.
