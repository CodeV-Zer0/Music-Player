import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";

export type LocalTrack = {
  id: string;
  title: string;
  artist_name?: string;
  album_title?: string;
  uri: string;
  duration?: number;
  filename?: string;
  thumbnail?: string;
};

export async function requestMediaPermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === "granted";
}

// Strip junk watermarks like [iSongs.info], (Songspk), etc.
// Also reject pure-digit strings (track numbers) as artist names.
const cleanString = (str?: string): string | undefined => {
  if (!str) return undefined;
  let cleaned = str.replace(/\[.*?\]|\(.*?\)/g, "").trim();
  if (
    !cleaned ||
    cleaned.toLowerCase() === "unknown" ||
    cleaned.toLowerCase() === "unknown artist" ||
    /^\d+$/.test(cleaned) // reject bare numbers like "01", "02"
  ) return undefined;
  return cleaned;
};

const getCacheUri = (id: string) => `${FileSystem.cacheDirectory}art_${id}.jpg`;

// ── Main scan — fast, filename-based ────────────────────────────────────────
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
      const nameWithoutExt = asset.filename.replace(/\.[^/.]+$/, "");
      // Try "Artist - Title" split
      const parts = nameWithoutExt.split(" - ");
      let artist = parts.length > 1 ? cleanString(parts[0]) : undefined;
      let title = parts.length > 1
        ? cleanString(parts.slice(1).join(" - ")) || parts.slice(1).join(" - ").trim()
        : cleanString(nameWithoutExt) || nameWithoutExt;

      allTracks.push({
        id: asset.id,
        title,
        artist_name: artist, // undefined → "Unknown Artist" at render time
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

// ── Lazy artwork extraction — called per-track only on demand ────────────────
// Returns the local file:// URI of cached artwork, or undefined.
export async function extractArtwork(track: LocalTrack): Promise<string | undefined> {
  try {
    const cacheUri = getCacheUri(track.id);
    const info = await FileSystem.getInfoAsync(cacheUri);
    if (info.exists) return cacheUri;

    // Dynamically import so it doesn't slow down initial scan
    const mm = await import("music-metadata-browser");
    const metadata = await mm.fetchFromUrl(track.uri);
    const pic = metadata?.common?.picture?.[0];
    if (!pic) return undefined;

    const base64Str = Buffer.from(pic.data).toString("base64");
    await FileSystem.writeAsStringAsync(cacheUri, base64Str, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return cacheUri;
  } catch {
    return undefined;
  }
}

export function groupByArtist(tracks: LocalTrack[]): Record<string, LocalTrack[]> {
  const groups: Record<string, LocalTrack[]> = {};
  for (const track of tracks) {
    const key = track.artist_name || "Unknown Artist";
    if (!groups[key]) groups[key] = [];
    groups[key].push(track);
  }
  return groups;
}
