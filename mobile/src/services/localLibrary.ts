import * as MediaLibrary from "expo-media-library";

export type LocalTrack = {
  id: string;
  title: string;
  artist_name?: string;
  album_title?: string;
  uri: string; // local file:// URI — playable directly, no network needed
  duration?: number; // seconds
  filename?: string; // optional — YouTube tracks won't have this
};

export async function requestMediaPermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === "granted";
}

// Scans the phone's media library for audio files and returns them as tracks.
// Runs in pages under the hood since some libraries have thousands of files.
export async function scanLocalAudio(): Promise<LocalTrack[]> {
  const allTracks: LocalTrack[] = [];
  let hasNextPage = true;
  let after: MediaLibrary.AssetRef | undefined = undefined;

  while (hasNextPage) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 200,
      after,
    });

    for (const asset of page.assets) {
      // Try to split "Artist - Title.mp3" style filenames; otherwise just use the filename.
      const nameWithoutExt = asset.filename.replace(/\.[^/.]+$/, "");
      const parts = nameWithoutExt.split(" - ");
      const artist = parts.length > 1 ? parts[0].trim() : undefined;
      const title = parts.length > 1 ? parts.slice(1).join(" - ").trim() : nameWithoutExt;

      allTracks.push({
        id: asset.id,
        title,
        artist_name: artist,
        uri: asset.uri,
        duration: asset.duration,
        filename: asset.filename,
      });
    }

    hasNextPage = page.hasNextPage;
    after = page.endCursor;
  }

  return allTracks;
}

// Groups tracks by artist_name for a simple "Library" view, since local files
// rarely have reliable album metadata the way music-metadata parsing on a
// server would give us.
export function groupByArtist(tracks: LocalTrack[]): Record<string, LocalTrack[]> {
  const groups: Record<string, LocalTrack[]> = {};
  for (const track of tracks) {
    const key = track.artist_name || "Unknown Artist";
    if (!groups[key]) groups[key] = [];
    groups[key].push(track);
  }
  return groups;
}
