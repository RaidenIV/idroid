# iDroid Local Music Player

iDroid is an iPhone-first HTML/CSS/JavaScript music player designed for GitHub Pages. It plays audio selected from the user's device and never uploads audio files to a server.

## Included features

- Home screen with the iDroid title, search, user settings, and a two-column playlist grid.
- Playlist creation, renaming, deletion, and cover-art selection.
- Profile editing with user name and profile picture.
- Local multi-file audio selection through the browser's file picker.
- Persistent player dock across the Home, Playlist, and User screens.
- Play/pause, seek, next-track handling, sharing, and Media Session integration.
- Long-press drag reordering for playlist covers and track rows.
- Search across playlist and track names.
- Installable Progressive Web App shell with offline interface caching.
- iPhone safe-area support and responsive layouts for desktop browsers.

## Important local-file behavior

Audio files are not copied into browser storage and are not uploaded. Playlist names, artwork, profile settings, track names, and ordering are saved in the browser's local storage. Because the browser does not retain the selected audio file itself, tracks must be relinked after the page or installed web app is fully closed or refreshed. Select the same files again; iDroid matches them using filename, file size, and modified date.

Cover art and the profile picture are compressed and saved in browser settings so they remain visible between sessions. Deleting the local account clears this saved app data but does not delete files from the iPhone.

## Run locally

A local server is recommended because service workers do not run from a `file://` URL.

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload all files and folders from this project to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch and the `/ (root)` folder, then save.
6. Open the generated GitHub Pages URL in Safari on the iPhone.
7. Tap Safari's Share button and choose **Add to Home Screen**.

## Audio compatibility

Playback depends on formats supported by the browser and iOS. MP3, AAC/M4A, and WAV are the safest choices for iPhone Safari. Files using unsupported codecs will remain on the device but may not play in the app.
