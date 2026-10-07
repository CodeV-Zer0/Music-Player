import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { Audio, AVPlaybackStatus } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { LocalTrack } from "../services/localLibrary";
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
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
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
  // Speed
  playbackRate: number;
  setPlaybackRate: (rate: number) => Promise<void>;
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
  togglePlayPause: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>;
};

const PlayerContext = createContext<PlayerContextType | null>(null);

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

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  // Liked songs
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);

  // Playlists
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);

  // Speed & Timer
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Recently played (newest first)
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);

  // Shuffle & Repeat
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");

  // Runtime settings
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [disableTimeout, setDisableTimeout] = useState(false);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false);

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
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
  }, [disableTimeout]);

  // ── Re-read settings whenever app comes to foreground ────────────────────
  // (settings can change from SettingDetailScreen without full restart)
  const refreshSettings = useCallback(async () => {
    try {
      const [playerSettingsRaw, audioSettingsRaw] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_PLAYER_KEY),
        AsyncStorage.getItem(SETTINGS_AUDIO_KEY),
      ]);
      if (playerSettingsRaw) {
        const ps = JSON.parse(playerSettingsRaw);
        setShowVisualizer(ps.showVis ?? false);
        const dt = ps.disableTimeout ?? false;
        setDisableTimeout(dt);
      }
      if (audioSettingsRaw) {
        const as = JSON.parse(audioSettingsRaw);
        setCrossfadeEnabled(as.crossfade ?? false);
      }
    } catch {}
  }, []);

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
          AsyncStorage.setItem(LIKED_KEY, JSON.stringify({ ids: newIds, tracks: newTracks }));
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
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ── Playlists ─────────────────────────────────────────────────────────────
  const createPlaylist = useCallback((name: string) => {
    setPlaylists((prev) => {
      const newPlaylist: Playlist = { id: Date.now().toString(), name, tracks: [] };
      const updated = [...prev, newPlaylist];
      AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => {
      const updated = prev.filter(p => p.id !== id);
      AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addTrackToPlaylist = useCallback((playlistId: string, track: Track) => {
    setPlaylists((prev) => {
      const updated = prev.map(p => {
        if (p.id === playlistId) {
          if (p.tracks.find(t => t.id === track.id)) return p;
          return { ...p, tracks: [...p.tracks, track] };
        }
        return p;
      });
      AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) => {
      const updated = prev.map(p => {
        if (p.id === playlistId) {
          return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
        }
        return p;
      });
      AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ── Downloads ─────────────────────────────────────────────────────────────
  const downloadTrack = useCallback(async (track: Track) => {
    if (track.source === 'local') return;
    try {
      const fileUri = FileSystem.documentDirectory + `${track.id}.m4a`;
      const streamUrl = track.uri || await resolveStreamUrl(track.id);
      await FileSystem.downloadAsync(streamUrl, fileUri);
      const newDl: DownloadedTrack = { ...track, localUri: fileUri };
      setDownloads((prev) => {
        const next = [...prev, newDl];
        AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(next));
        return next;
      });
    } catch (e) {
      console.warn("Download failed", e);
    }
  }, []);

  // ── Speed & Timer ─────────────────────────────────────────────────────────
  const setPlaybackRate = useCallback(async (rate: number) => {
    setPlaybackRateState(rate);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(rate, true);
    }
  }, []);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = null;
    setSleepTimerEnd(null);
  }, []);

  const startSleepTimer = useCallback((minutes: number) => {
    cancelSleepTimer();
    const ms = minutes * 60 * 1000;
    setSleepTimerEnd(Date.now() + ms);
    sleepTimerRef.current = setTimeout(async () => {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
      setSleepTimerEnd(null);
    }, ms);
  }, [cancelSleepTimer]);

  // ── Shuffle & Repeat ──────────────────────────────────────────────────────
  const toggleShuffle = useCallback(() => {
    setShuffleEnabled(prev => {
      const next = !prev;
      if (next) {
        // Shuffle queue, keep current track at front
        setQueue(q => {
          if (q.length === 0) return q;
          const currentIndex = q.findIndex(t => t.id === currentTrack?.id);
          const current = currentIndex >= 0 ? q[currentIndex] : null;
          const rest = q.filter((_, i) => i !== currentIndex);
          const shuffled = shuffleArray(rest);
          const newQ = current ? [current, ...shuffled] : shuffled;
          setQueueIndex(0);
          return newQ;
        });
      }
      return next;
    });
  }, [currentTrack]);

  const cycleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  }, []);

  // ── Playback ──────────────────────────────────────────────────────────────
  // Use refs so closures inside onStatusUpdate always see latest values
  const repeatModeRef = useRef<RepeatMode>("off");
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  const playNextRef = useRef<(() => void) | null>(null);
  const seekToRef = useRef<((m: number) => Promise<void>) | null>(null);

  const onStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPositionMillis(status.positionMillis || 0);
    setDurationMillis(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      const mode = repeatModeRef.current;
      if (mode === "one") {
        // Seek back to start and replay
        seekToRef.current?.(0);
        soundRef.current?.playAsync();
      } else {
        playNextRef.current?.();
      }
    }
  }, []);

  const playTrack = useCallback(
    async (track: Track, newQueue?: Track[]) => {
      await refreshSettings();
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
      });

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Check if downloaded
      const downloaded = downloads.find(d => d.id === track.id);
      const uriToPlay = downloaded ? downloaded.localUri : track.uri;

      const { sound } = await Audio.Sound.createAsync(
        { uri: uriToPlay },
        { shouldPlay: true, rate: playbackRate, shouldCorrectPitch: true },
        onStatusUpdate
      );
      soundRef.current = sound;
      setCurrentTrack(track);
      addToRecent(track);

      if (newQueue) {
        const q = shuffleEnabled ? (() => {
          const idx = newQueue.findIndex(t => t.id === track.id);
          const current = idx >= 0 ? newQueue[idx] : null;
          const rest = newQueue.filter((_, i) => i !== idx);
          const shuffled = shuffleArray(rest);
          return current ? [current, ...shuffled] : shuffled;
        })() : newQueue;
        setQueue(q);
        setQueueIndex(q.findIndex((t) => t.id === track.id));
      }
    },
    [onStatusUpdate, addToRecent, playbackRate, downloads, shuffleEnabled, refreshSettings]
  );

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, [isPlaying]);

  const playNext = useCallback(async () => {
    if (queue.length === 0) return;
    let nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === "all") nextIndex = 0;
      else return;
    }
    setQueueIndex(nextIndex);
    const nextTrack = queue[nextIndex];
    if (!nextTrack) return;
    await playTrack(nextTrack);
  }, [queue, queueIndex, playTrack, repeatMode]);

  // Keep refs in sync
  useEffect(() => { playNextRef.current = playNext; }, [playNext]);

  const seekTo = useCallback(async (millis: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(millis);
  }, []);

  useEffect(() => { seekToRef.current = seekTo; }, [seekTo]);

  const playPrevious = useCallback(async () => {
    if (queue.length === 0) return;
    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      setQueueIndex(prevIndex);
      const previousTrack = queue[prevIndex];
      if (!previousTrack) return;
      await playTrack(previousTrack);
    }
  }, [queue, queueIndex, playTrack]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        positionMillis,
        durationMillis,
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
        sleepTimerEnd,
        startSleepTimer,
        cancelSleepTimer,
        shuffleEnabled,
        toggleShuffle,
        repeatMode,
        cycleRepeat,
        showVisualizer,
        playTrack,
        togglePlayPause,
        playNext,
        playPrevious,
        seekTo,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
