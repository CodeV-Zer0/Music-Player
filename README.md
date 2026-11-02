# Raga

Raga is an Android/iOS music player for music stored on your device. It combines
a dark, AMOLED-friendly interface with local music-library access, playlists,
queue controls, artwork, and lyrics.

## Features

- Choose full audio-library access or select a music folder. You can change this
  later in **Settings → Advanced**.
- Browse and search local songs and artists, with Home sorting by modified date
  or title.
- Play tracks in the background with a mini-player, playback queue, shuffle,
  repeat, and queue reordering.
- View track artwork and embedded lyrics when available. Lyrics can fall back
  to LRCLIB when an internet connection is available.
- Use lock-screen playback controls, including next and previous track.
- Keep liked tracks, playlists, recently played tracks, and supported offline
  downloads on the device.
- Use a dark interface with track artwork-inspired colors on supported screens.

Local playback and personal collections do not require a Raga account or the
project backend. Online lyrics and supported online-stream features require
internet access and depend on their third-party services being available.

## Project layout

```text
music-app/
  mobile/    Expo and React Native app
  backend/   Separate Express API for account, catalog, and playlist endpoints
```

The mobile app currently uses local device music as its library; it does not
connect to the `backend/` API for sign-in or cloud playlist synchronization.
The backend is a separate project component.

## Requirements

- Node.js 20 or newer and npm
- Android Studio with the Android SDK for Android builds
- macOS with Xcode for iOS builds

## Run the mobile app

Install dependencies:

```sh
cd mobile
npm install
```

Raga includes a native Expo Audio patch for lock-screen track navigation, so
use a development build or installable app rather than Expo Go. The `postinstall`
script applies this patch after `npm install`. Build and install the Android
development app with:

```sh
npm run android
```

For later development sessions, start the server for the installed development
client with:

```sh
npx expo start --dev-client
```

To build a release APK on Android:

```sh
cd mobile/android
./gradlew app:assembleRelease
```

The APK is written to
`mobile/android/app/build/outputs/apk/release/app-release.apk`.
On Windows, run `.\gradlew.bat app:assembleRelease` from `mobile\android`.

For iOS, run `npm run ios` from `mobile` on a Mac with Xcode installed.

## Music access

On first use, choose either **Allow full music library access** or **Choose a
music folder**. Full access uses Android's audio-library permission; folder
access uses the system folder picker and is limited to the folder selected.
Android does not provide a separate “limited audio permission” choice in the
same way it does for photos.

You can change the choice later under **Settings → Advanced**. The app requests
audio access only; image and video library permissions are not required.

## Backend (optional, separate)

The Express API in `backend/` provides health, authentication, track, album,
artist, and playlist routes. It requires a PostgreSQL database and Supabase
Storage configuration. It is not required to run the mobile app's local music
features.

To start the API:

1. Copy `backend/.env.example` to `backend/.env` and set values for the database,
   JWT secret, Supabase project, and storage bucket.
2. Ensure the database has the tables expected by the API routes.
3. Install dependencies and start the server:

   ```sh
   cd backend
   npm install
   npm run dev
   ```

The API defaults to port `4000`; `GET /health` reports its status. Never commit
`backend/.env` or production credentials.

## Useful scripts

From `mobile/`:

| Command | Description |
| --- | --- |
| `npm run android` | Build and run the Android development app |
| `npm run ios` | Build and run the iOS development app on macOS |
| `npm run typecheck` | Run the TypeScript type check |
| `npm run lint` | Lint the mobile source |
| `npm test` | Run the Jest test suite |

From `backend/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with Node watch mode |
| `npm start` | Start the API |
| `npm run lint` | Lint the API source |
| `npm test` | Run the API Jest test suite |
