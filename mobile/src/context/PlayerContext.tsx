import React, { createContext, useContext, useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { extractArtwork, LocalTrack } from "../services/localLibrary";
import { resolveStreamUrl } from "../services/pipedApi";

// Extended Track type — works for both local and YouTube tracks
export type Track = LocalTrack & {
  source?: "local" | "youtube";
  thumbnail?: string;
};

const LIKED_KEY = "raga_liked_ids";
const RECENT_KEY = "raga_recently_played";
const PLAYLISTS_KEY = "raga_playlists";
const MAX_RECENT = 30;

export type Playlist = {
  id: string;
  name: string;
  tracks: Track[];
};

export type DownloadedTrack = Track & {
  localUri: string;
};

const DOWNLOADS_KEY = "raga_downloads";

export type RepeatMode = "off" | "all" | "one";

// Settings keys
export const SETTINGS_PLAYER_KEY = "raga_settings_player";
export const SETTINGS_AUDIO_KEY = "raga_settings_audio";

type PlayerContextType = {
  currentTrack: Track | null;
  isLoading: boolean;
  isPlaying: boolean;
  queue: Track[];
  // Liked songs
  likedTrackIds: string[];
  likedTracks: Track[];
  isLiked: (id: string) => boolean;
  toggleLike: (track: Track) => void;
  // Recently played
  recentlyPlayed: Track[];
  // Playlists
  playlists: Playlist[];
  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  // Downloads
  downloads: DownloadedTrack[];
  downloadTrack: (track: Track) => Promise<void>;
  // Speed & Volume
  playbackRate: number;
  setPlaybackRate: (rate: number) => Promise<void>;
  volume: number;
  setVolume: (volume: number) => Promise<void>;
  // Sleep Timer
  sleepTimerEnd: number | null;
  startSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
  // Shuffle & Repeat
  shuffleEnabled: boolean;
  toggleShuffle: () => void;
  repeatMode: RepeatMode;
  cycleRepeat: () => void;
  // Settings (runtime)
  showVisualizer: boolean;
  // Playback
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  playShuffled: (tracks: Track[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  seekTo: (millis: number) => Promise<void>;
};

const PlayerContext = createContext<PlayerContextType | null>(null);
const PlaybackProgressContext = createContext<{ positionMillis: number; durationMillis: number } | null>(null);
const PlayerCollectionsContext = createContext<{
  likedTrackIds: string[];
  likedTracks: Track[];
  isLiked: (id: string) => boolean;
  toggleLike: (track: Track) => void;
  playlists: Playlist[];
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  downloads: DownloadedTrack[];
  downloadTrack: (track: Track) => Promise<void>;
} | null>(null);

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const left = a[i]!;
    const right = a[j]!;
    a[i] = right;
    a[j] = left;
  }
  return a;
}

function getLockScreenArtworkUrl(uri?: string): string | undefined {
  return uri && /^(https?:\/\/|file:\/\/)/i.test(uri) ? uri : undefined;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [audioPlayer] = useState<AudioPlayer>(() => createAudioPlayer(null, { updateInterval: 300 }));
  const playRequestIdRef = useRef(0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  // Liked songs
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);

  // Playlists & Downloads
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);

  // Speed, Volume, Sleep Timer
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  const [volume, setVolumeState] = useState(1.0);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Recently played
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);

  // Shuffle & Repeat
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");

  // Runtime settings
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [disableTimeout, setDisableTimeout] = useState(false);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false);

  // Refs for callbacks to avoid stale closures in AV playback status updates
  const repeatModeRef = useRef(repeatMode);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const queueIndexRef = useRef(queueIndex);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);

  // Configure the audio session once on startup.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    }).catch((error) => console.warn("Could not configure audio session", error));
  }, []);

  // ── Load persisted data on mount ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [likedRaw, recentRaw, playlistsRaw, downloadsRaw, playerSettingsRaw, audioSettingsRaw] = await Promise.all([
          AsyncStorage.getItem(LIKED_KEY),
          AsyncStorage.getItem(RECENT_KEY),
          AsyncStorage.getItem(PLAYLISTS_KEY),
          AsyncStorage.getItem(DOWNLOADS_KEY),
          AsyncStorage.getItem(SETTINGS_PLAYER_KEY),
          AsyncStorage.getItem(SETTINGS_AUDIO_KEY),
        ]);
        if (likedRaw) {
          const { ids, tracks } = JSON.parse(likedRaw);
          setLikedTrackIds(ids ?? []);
          setLikedTracks(tracks ?? []);
        }
        if (recentRaw) setRecentlyPlayed(JSON.parse(recentRaw) ?? []);
        if (playlistsRaw) setPlaylists(JSON.parse(playlistsRaw) ?? []);
        if (downloadsRaw) setDownloads(JSON.parse(downloadsRaw) ?? []);

        // Load player settings
        if (playerSettingsRaw) {
          const ps = JSON.parse(playerSettingsRaw);
          setShowVisualizer(ps.showVis ?? false);
          setDisableTimeout(ps.disableTimeout ?? false);
        }
        // Load audio settings
        if (audioSettingsRaw) {
          const as = JSON.parse(audioSettingsRaw);
          setCrossfadeEnabled(as.crossfade ?? false);
        }
      } catch {
        // ignore storage errors on cold start
      }
    })();
  }, []);

  // ── React to disableTimeout setting ──────────────────────────────────────
  useEffect(() => {
    if (disableTimeout) {
      activateKeepAwakeAsync().catch(() => undefined);
    } else {
      deactivateKeepAwake();
    }
  }, [disableTimeout]);

  // ── Liked songs helpers ───────────────────────────────────────────────────
  const isLiked = useCallback(
    (id: string) => likedTrackIds.includes(id),
    [likedTrackIds]
  );

  const toggleLike = useCallback(
    (track: Track) => {
      setLikedTrackIds((prev) => {
        const already = prev.includes(track.id);
        const newIds = already ? prev.filter((id) => id !== track.id) : [...prev, track.id];
        setLikedTracks((pt) => {
          const newTracks = already ? pt.filter((t) => t.id !== track.id) : [...pt, track];
          AsyncStorage.setItem(LIKED_KEY, JSON.stringify({ ids: newIds, tracks: newTracks })).catch(() => undefined);
          return newTracks;
        });
        return newIds;
      });
    },
    []
  );

  // ── Add to recently played ────────────────────────────────────────────────
  const addToRecent = useCallback((track: Track) => {
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      const updated = [track, ...filtered].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated)).catch(() => undefined);
      return updated;
    });
  }, []);

  // Forward declarations via refs
  const playNextRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const playPreviousRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    const subscription = audioPlayer.addListener("playbackStatusUpdate", (status: AudioStatus) => {
      setIsLoading(!status.isLoaded && !status.didJustFinish);
      setIsPlaying(status.playing);
      setPositionMillis(status.currentTime * 1000);
      setDurationMillis(status.duration * 1000);

      if (status.didJustFinish && !status.loop) {
        const mode = repeatModeRef.current;
        if (mode === "all") {
          void playNextRef.current();
        } else {
          const q = queueRef.current;
          const idx = queueIndexRef.current;
          if (idx < q.length - 1) {
            void playNextRef.current();
          } else {
            setIsPlaying(false);
          }
        }
      }
    });
    const nextSubscription = audioPlayer.addListener("lockScreenNextTrack", () => {
      void playNextRef.current();
    });
    const previousSubscription = audioPlayer.addListener("lockScreenPreviousTrack", () => {
      void playPreviousRef.current();
    });

    return () => {
      subscription.remove();
      nextSubscription.remove();
      previousSubscription.remove();
    };
  }, [audioPlayer]);

  // ── Play a track ──────────────────────────────────────────────────────────
  const playTrack = useCallback(
    async (track: Track, newQueue?: Track[]) => {
      const requestId = ++playRequestIdRef.current;
      const previousTrack = currentTrackRef.current;
      currentTrackRef.current = track;
      setCurrentTrack(track);
      setIsLoading(true);
      setIsPlaying(true);
      setPositionMillis(0);
      setDurationMillis(0);

      // Manage queue
      let activeQueue = queueRef.current;
      if (newQueue && newQueue.length > 0) {
        activeQueue = shuffleEnabled ? shuffleArray(newQueue) : newQueue;
        queueRef.current = activeQueue;
        setQueue(activeQueue);
      }
      const trackIndex = activeQueue.findIndex((t) => t.id === track.id);
      const nextQueueIndex = trackIndex >= 0 ? trackIndex : 0;
      queueIndexRef.current = nextQueueIndex;
      setQueueIndex(nextQueueIndex);

      try {
        if (requestId !== playRequestIdRef.current) return;

        let streamUrl: string;
        if (track.source === "youtube") {
          const downloaded = downloads.find((d) => d.id === track.id);
          if (downloaded) {
            streamUrl = downloaded.localUri;
          } else {
            streamUrl = await resolveStreamUrl(track.id);
          }
        } else {
          streamUrl = track.uri;
        }

        if (requestId !== playRequestIdRef.current) return;

        audioPlayer.replace(streamUrl);
        audioPlayer.volume = volume;
        audioPlayer.setPlaybackRate(playbackRate);
        audioPlayer.shouldCorrectPitch = true;
        audioPlayer.loop = repeatModeRef.current === "one";
        audioPlayer.play();
        try {
          audioPlayer.setActiveForLockScreen(true, {
            title: track.title,
            artist: track.artist_name || "Unknown Artist",
            albumTitle: track.album_title,
            artworkUrl: getLockScreenArtworkUrl(track.thumbnail),
          }, {
            showNextTrack: true,
            showPreviousTrack: true,
          });
        } catch (error) {
          console.warn("Could not update lock-screen metadata", error);
        }
        addToRecent(track);
        setIsPlaying(true);

        if (!getLockScreenArtworkUrl(track.thumbnail) && track.source !== "youtube") {
          void extractArtwork(track).then((artworkUrl) => {
            if (artworkUrl && currentTrackRef.current?.id === track.id) {
              try {
                audioPlayer.updateLockScreenMetadata({
                  title: track.title,
                  artist: track.artist_name || "Unknown Artist",
                  albumTitle: track.album_title,
                  artworkUrl: getLockScreenArtworkUrl(artworkUrl),
                });
              } catch (error) {
                console.warn("Could not update lock-screen artwork", error);
              }
            }
          });
        }
      } catch (error) {
        if (requestId !== playRequestIdRef.current) return;
        currentTrackRef.current = previousTrack;
        setCurrentTrack(previousTrack);
        setIsLoading(false);
        setIsPlaying(audioPlayer.playing);
        console.warn("Playback failed", error);
        const message = error instanceof Error ? error.message : "Please try another track.";
        Alert.alert("Couldn't play this track", message);
      }
    },
    [audioPlayer, downloads, playbackRate, volume, shuffleEnabled, addToRecent]
  );

  const playShuffled = useCallback(async (tracks: Track[]) => {
    if (tracks.length === 0) return;
    const shuffled = shuffleArray(tracks);
    setShuffleEnabled(true);
    await playTrack(shuffled[0]!, shuffled);
  }, [playTrack]);

  const togglePlayPause = useCallback(async () => {
    if (!currentTrackRef.current) return;
    if (!audioPlayer.isLoaded) {
      if (currentTrack) {
        await playTrack(currentTrack);
      }
      return;
    }
    if (audioPlayer.playing) {
      audioPlayer.pause();
      setIsPlaying(false);
    } else {
      audioPlayer.play();
      setIsPlaying(true);
    }
  }, [audioPlayer, currentTrack, playTrack]);

  const playNext = useCallback(async () => {
    const q = queueRef.current;
    if (q.length === 0) return;
    let nextIndex = queueIndexRef.current + 1;
    if (nextIndex >= q.length) {
      if (repeatModeRef.current === "all") {
        nextIndex = 0;
      } else {
        return;
      }
    }
    const nextTrack = q[nextIndex];
    if (nextTrack) {
      await playTrack(nextTrack);
    }
  }, [playTrack]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const playPrevious = useCallback(async () => {
    const q = queueRef.current;
    if (q.length === 0) return;

    // If more than 3 seconds in, seek to beginning
    if (positionMillis > 3000 && audioPlayer.isLoaded) {
      await audioPlayer.seekTo(0);
      return;
    }

    const prevIndex = queueIndexRef.current - 1;
    if (prevIndex >= 0) {
      const prevTrack = q[prevIndex];
      if (prevTrack) await playTrack(prevTrack);
    } else {
      await audioPlayer.seekTo(0);
    }
  }, [audioPlayer, positionMillis, playTrack]);

  useEffect(() => {
    playPreviousRef.current = playPrevious;
  }, [playPrevious]);

  const moveQueueItem = useCallback((fromIndex: number, toIndex: number) => {
    const activeIndex = queueIndexRef.current;
    const currentQueue = queueRef.current;
    if (
      fromIndex < 0 ||
      fromIndex >= currentQueue.length ||
      toIndex < 0 ||
      toIndex >= currentQueue.length ||
      fromIndex === activeIndex ||
      toIndex === activeIndex
    ) {
      return;
    }

    const nextQueue = [...currentQueue];
    const [movedTrack] = nextQueue.splice(fromIndex, 1);
    if (!movedTrack) return;
    nextQueue.splice(toIndex, 0, movedTrack);

    const nextActiveIndex = fromIndex < activeIndex && toIndex >= activeIndex
      ? activeIndex - 1
      : fromIndex > activeIndex && toIndex <= activeIndex
        ? activeIndex + 1
        : activeIndex;
    queueRef.current = nextQueue;
    queueIndexRef.current = nextActiveIndex;
    setQueue(nextQueue);
    setQueueIndex(nextActiveIndex);
  }, []);

  const seekTo = useCallback(async (millis: number) => {
    await audioPlayer.seekTo(Math.max(0, millis) / 1000);
  }, [audioPlayer]);

  // ── Rate & Volume ─────────────────────────────────────────────────────────
  const setPlaybackRate = useCallback(async (rate: number) => {
    setPlaybackRateState(rate);
    audioPlayer.setPlaybackRate(rate);
  }, [audioPlayer]);

  const setVolume = useCallback(async (vol: number) => {
    setVolumeState(vol);
    audioPlayer.volume = vol;
  }, [audioPlayer]);

  // ── Shuffle & Repeat ──────────────────────────────────────────────────────
  const toggleShuffle = useCallback(() => {
    setShuffleEnabled((prev) => {
      const next = !prev;
      if (next && queue.length > 1 && currentTrack) {
        const remaining = queue.filter((t) => t.id !== currentTrack.id);
        const shuffled = [currentTrack, ...shuffleArray(remaining)];
        setQueue(shuffled);
        setQueueIndex(0);
      }
      return next;
    });
  }, [queue, currentTrack]);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      const next: RepeatMode = prev === "off" ? "all" : prev === "all" ? "one" : "off";
      audioPlayer.loop = next === "one";
      return next;
    });
  }, [audioPlayer]);

  // ── Sleep Timer ───────────────────────────────────────────────────────────
  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerEnd(null);
  }, []);

  const startSleepTimer = useCallback(
    (minutes: number) => {
      cancelSleepTimer();
      const endTime = Date.now() + minutes * 60 * 1000;
      setSleepTimerEnd(endTime);
      sleepTimerRef.current = setTimeout(async () => {
        audioPlayer.pause();
        setIsPlaying(false);
        setSleepTimerEnd(null);
      }, minutes * 60 * 1000);
    },
    [audioPlayer, cancelSleepTimer]
  );

  // ── Playlists ─────────────────────────────────────────────────────────────
  const createPlaylist = useCallback((name: string) => {
    const newPlaylist: Playlist = { id: `playlist_${Date.now()}`, name, tracks: [] };
    setPlaylists((prev) => {
      const updated = [...prev, newPlaylist];
      AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated)).catch(() => undefined);
      return updated;
    });
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated)).catch(() => undefined);
      return updated;
    });
  }, []);

  const addTrackToPlaylist = useCallback((playlistId: string, track: Track) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.tracks.some((t) => t.id === track.id)) return p;
        return { ...p, tracks: [...p.tracks, track] };
      });
      AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated)).catch(() => undefined);
      return updated;
    });
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== playlistId) return p;
        return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) };
      });
      AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated)).catch(() => undefined);
      return updated;
    });
  }, []);

  // ── Downloads ─────────────────────────────────────────────────────────────
  const downloadTrack = useCallback(async (track: Track) => {
    if (downloads.some((d) => d.id === track.id)) return;
    try {
      const streamUrl = await resolveStreamUrl(track.id);
      const filename = `track_${track.id}.mp4`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;
      const downloadRes = await FileSystem.downloadAsync(streamUrl, localUri);
      const downloadedTrack: DownloadedTrack = {
        ...track,
        localUri: downloadRes.uri,
      };
      setDownloads((prev) => {
        const updated = [...prev, downloadedTrack];
        AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated)).catch(() => undefined);
        return updated;
      });
    } catch (e) {
      console.warn("Download failed", e);
    }
  }, [downloads]);

  // Clean up the native audio player on unmount.
  useEffect(() => {
    return () => {
      audioPlayer.clearLockScreenControls();
      audioPlayer.remove();
    };
  }, [audioPlayer]);

  const collectionsValue = useMemo(() => ({
    likedTrackIds,
    likedTracks,
    isLiked,
    toggleLike,
    playlists,
    addTrackToPlaylist,
    downloads,
    downloadTrack,
  }), [
    likedTrackIds, likedTracks, isLiked, toggleLike, playlists,
    addTrackToPlaylist, downloads, downloadTrack,
  ]);

  const playerValue = useMemo<PlayerContextType>(() => ({
    currentTrack,
    isLoading,
    isPlaying,
    queue,
    likedTrackIds,
    likedTracks,
    isLiked,
    toggleLike,
    recentlyPlayed,
    playlists,
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    downloads,
    downloadTrack,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
    sleepTimerEnd,
    startSleepTimer,
    cancelSleepTimer,
    shuffleEnabled,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    showVisualizer,
    playTrack,
    playShuffled,
    togglePlayPause,
    playNext,
    playPrevious,
    moveQueueItem,
    seekTo,
  }), [
    currentTrack, isLoading, isPlaying, queue, likedTrackIds, likedTracks,
    isLiked, toggleLike, recentlyPlayed, playlists, createPlaylist,
    deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist, downloads,
    downloadTrack, playbackRate, setPlaybackRate, volume, setVolume,
    sleepTimerEnd, startSleepTimer, cancelSleepTimer, shuffleEnabled,
    toggleShuffle, repeatMode, cycleRepeat, showVisualizer, playTrack,
    playShuffled, togglePlayPause, playNext, playPrevious, moveQueueItem, seekTo,
  ]);

  const progressValue = useMemo(() => ({ positionMillis, durationMillis }), [positionMillis, durationMillis]);

  return (
    <PlayerCollectionsContext.Provider value={collectionsValue}>
      <PlayerContext.Provider value={playerValue}>
        <PlaybackProgressContext.Provider value={progressValue}>
          {children}
        </PlaybackProgressContext.Provider>
      </PlayerContext.Provider>
    </PlayerCollectionsContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

export function usePlaybackProgress() {
  const ctx = useContext(PlaybackProgressContext);
  if (!ctx) throw new Error("usePlaybackProgress must be used within PlayerProvider");
  return ctx;
}

export function usePlayerCollections() {
  const ctx = useContext(PlayerCollectionsContext);
  if (!ctx) throw new Error("usePlayerCollections must be used within PlayerProvider");
  return ctx;
}
