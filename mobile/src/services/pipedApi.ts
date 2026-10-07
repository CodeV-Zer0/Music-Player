// Piped API service — open-source YouTube front-end, no login required
// Falls back across multiple instances if one is down

const INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://piped-api.garudalinux.org',
];

let instanceIdx = 0;

async function pipedFetch(path: string): Promise<any> {
  for (let attempt = 0; attempt < INSTANCES.length; attempt++) {
    const base = INSTANCES[(instanceIdx + attempt) % INSTANCES.length];
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      instanceIdx = (instanceIdx + attempt) % INSTANCES.length; // remember working instance
      return await res.json();
    } catch {
      // try next instance
    }
  }
  throw new Error('All Piped instances are unreachable. Check your internet connection.');
}

export type YouTubeTrack = {
  id: string;        // YouTube video ID
  title: string;
  artist_name: string;
  thumbnail: string;
  duration: number;  // seconds
  uri: string;       // empty — resolved lazily when played
  source: 'youtube';
};

export type YouTubePlaylist = {
  id: string; // playlist ID
  title: string;
  uploaderName: string;
  thumbnail: string;
  count: number;
  type: 'playlist';
};

export async function searchYouTube(query: string, filter: 'music_songs' | 'music_albums' | 'music_playlists' = 'music_songs'): Promise<any[]> {
  const data = await pipedFetch(
    `/search?q=${encodeURIComponent(query)}&filter=${filter}`,
  );

  const items: any[] = data.items ?? [];
  
  if (filter === 'music_songs') {
    return items
      .filter((i) => i.type === 'stream' && i.url)
      .slice(0, 30)
      .map((i) => ({
        id: (i.url as string).replace('/watch?v=', '').split('&')[0] || i.videoId || '',
        title: i.title ?? 'Unknown',
        artist_name: i.uploaderName ?? 'Unknown Artist',
        thumbnail: i.thumbnail ?? '',
        duration: i.duration ?? 0,
        uri: '',
        source: 'youtube' as const,
      }));
  } else {
    // Albums or Playlists
    return items
      .filter((i) => i.type === 'playlist' && i.url)
      .slice(0, 30)
      .map((i) => ({
        id: (i.url as string).replace('/playlist?list=', ''),
        title: i.title ?? 'Unknown',
        uploaderName: i.uploaderName ?? 'Unknown Artist',
        thumbnail: i.thumbnail ?? '',
        count: i.videos ?? 0,
        type: 'playlist' as const,
      }));
  }
}

export async function getPlaylistTracks(playlistId: string): Promise<YouTubeTrack[]> {
  const data = await pipedFetch(`/playlists/${playlistId}`);
  const items: any[] = data.relatedStreams ?? [];
  return items
    .filter((i) => i.url && i.type === 'stream')
    .map((i) => ({
      id: (i.url as string).replace('/watch?v=', '').split('&')[0] || i.videoId || '',
      title: i.title ?? 'Unknown',
      artist_name: i.uploaderName ?? 'Unknown Artist',
      thumbnail: i.thumbnail ?? '',
      duration: i.duration ?? 0,
      uri: '',
      source: 'youtube' as const,
    }));
}

// Returns the best audio-only stream URL for a video ID.
// Call this right before playback so the URL is fresh (they expire).
export async function resolveStreamUrl(videoId: string): Promise<string> {
  const data = await pipedFetch(`/streams/${videoId}`);
  const streams: any[] = data.audioStreams ?? [];
  if (streams.length === 0) throw new Error('No audio streams returned by Piped.');

  // Sort by bitrate descending, prefer non-video formats
  const best = streams
    .filter((s) => s.url)
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

  return best.url as string;
}
