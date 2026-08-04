# MyMusic — Personal Spotify-style Music Player

A private, ad-free music player that reads **audio files already stored on your phone**
and shows/plays them with a Spotify-style dark UI — like Spotify's own "local files"
feature, but as the whole app.

No backend, no cloud upload, no account needed. The app just scans your device's
media library for audio files (the same system Spotify/Apple Music/any file manager
uses) and plays them directly.

## Structure

```
music-app/
  mobile/      Expo (React Native) app — scans local files, dark Spotify-style UI
  backend/     Optional — a cloud-sync backend (Postgres + Supabase Storage) from an
               earlier version of this project. Not needed for local playback. Keep
               it around only if you later want playlists to sync across devices.
```

## Quick start (local playback — this is what you want)

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone. On first launch, the app
will ask for permission to access your device's audio files — grant it, and your
local music library shows up automatically, same as Spotify's local files.

**Note:** Expo Go has some limitations with native permissions on newer Android
versions. If `expo-media-library` doesn't prompt properly in Expo Go, run:
```bash
npx expo prebuild
npx expo run:android    # or npx expo run:ios (requires Xcode, Mac only)
```
This builds a real dev client with full native permission support — slower to set
up once, but more reliable than Expo Go for this.

## What's included

- Scans device audio files via `expo-media-library` (no network needed)
- Groups tracks by artist (parsed from filename, since local files often lack
  full ID3 tags) for the Library tab
- Search across your local library
- Full playback: queue, background audio, lock-screen controls, seek bar
- Dark, Spotify-style UI: bottom tabs, mini-player, full-screen now-playing view

## What you'll want to add next

- Better metadata parsing (read actual ID3 tags instead of guessing from
  filenames — `expo-media-library` gives duration but not embedded tags; a
  library like `music-metadata` would need a small native module or a one-time
  scan step)
- Playlists (store locally with `AsyncStorage`, or sync via the optional backend)
- Album art (read embedded artwork from files, or fall back to a generic cover)
- "Recently played" (track locally, no server needed)
- Offline is already the default here — there's nothing to download, it's already
  on your phone

## A note on versions

Expo Go (the app on your phone) always tracks the newest Expo SDK, so if you
open this project again months from now and get an "incompatible SDK" error,
it means Expo Go on your phone moved on to a newer version than what's pinned
in `package.json`. Fix: bump `"expo"` in `package.json` to the version Expo Go
now expects (the error screen tells you exactly which SDK it wants), then run
`npx expo install --fix` to auto-align every other package's version to match.

Also worth knowing: this project uses `expo-av` for audio playback, which
Expo has deprecated in favor of `expo-audio`. It still works fine through SDK
54, but will stop working in SDK 55+ — a future to-do is migrating the
playback code in `src/context/PlayerContext.tsx` to `expo-audio`.

- Mobile: `eas build` (Expo's build service) to get a real installable APK for
  your phone, so you don't need Expo Go long-term
