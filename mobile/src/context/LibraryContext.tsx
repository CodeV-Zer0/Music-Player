import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LocalTrack,
  getLocalLibrary,
  groupByArtist,
  requestMediaPermission,
  requestMusicFolder,
  scanMusicFolder,
} from "../services/localLibrary";

const LIBRARY_CACHE_KEY = "raga_library_cache_v2";
const LIBRARY_ACCESS_KEY = "raga_library_access_v1";
const LIBRARY_FOLDER_KEY = "raga_library_folder_v1";

type LibraryStatus = "loading" | "access_required" | "denied" | "ready" | "error";
type LibraryAccessMode = "full" | "folder";

type LibraryContextType = {
  tracks: LocalTrack[];
  artists: Array<{ name: string; count: number }>;
  status: LibraryStatus;
  refreshing: boolean;
  accessMode: LibraryAccessMode | null;
  refresh: (force?: boolean) => Promise<void>;
  requestFullAccess: () => Promise<void>;
  selectMusicFolder: () => Promise<void>;
};

const LibraryContext = createContext<LibraryContextType | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [status, setStatus] = useState<LibraryStatus>("access_required");
  const [refreshing, setRefreshing] = useState(false);
  const [accessMode, setAccessMode] = useState<LibraryAccessMode | null>(null);
  const [folderUri, setFolderUri] = useState<string | null>(null);
  const accessRequestInFlight = useRef(false);

  const applyTracks = useCallback((next: LocalTrack[]) => {
    setTracks(next);
  }, []);

  const loadLibrary = useCallback(async (
    mode: LibraryAccessMode,
    selectedFolder: string | null,
    force: boolean
  ) => {
    setRefreshing(force);
    setStatus((previous) => (previous === "ready" ? previous : "loading"));
    try {
      let found: LocalTrack[];
      if (mode === "full") {
        const granted = await requestMediaPermission();
        if (!granted) {
          setStatus("denied");
          return;
        }
        found = await getLocalLibrary({ force });
      } else {
        if (!selectedFolder) {
          setStatus("access_required");
          return;
        }
        found = await scanMusicFolder(selectedFolder);
      }
      applyTracks(found);
      setStatus("ready");
      AsyncStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify({ tracks: found, savedAt: Date.now() })).catch(
        () => undefined
      );
    } catch (error) {
      console.warn("Unable to load local music", error);
      setStatus((previous) => (previous === "ready" ? previous : "error"));
    } finally {
      setRefreshing(false);
    }
  }, [applyTracks]);

  const refresh = useCallback(async (force = false) => {
    if (!accessMode) {
      setStatus("access_required");
      return;
    }
    await loadLibrary(accessMode, folderUri, force);
  }, [accessMode, folderUri, loadLibrary]);

  const requestFullAccess = useCallback(async () => {
    if (accessRequestInFlight.current) return;
    accessRequestInFlight.current = true;
    try {
      const granted = await requestMediaPermission();
      if (!granted) {
        setStatus("denied");
        return;
      }
      setAccessMode("full");
      setFolderUri(null);
      await AsyncStorage.multiSet([
        [LIBRARY_ACCESS_KEY, "full"],
        [LIBRARY_FOLDER_KEY, ""],
      ]);
      await loadLibrary("full", null, true);
    } catch (error) {
      console.warn("Unable to request music library access", error);
      setStatus("error");
    } finally {
      accessRequestInFlight.current = false;
    }
  }, [loadLibrary]);

  const selectMusicFolder = useCallback(async () => {
    if (accessRequestInFlight.current) return;
    accessRequestInFlight.current = true;
    try {
      const selectedFolder = await requestMusicFolder();
      if (!selectedFolder) return;
      setAccessMode("folder");
      setFolderUri(selectedFolder);
      await AsyncStorage.multiSet([
        [LIBRARY_ACCESS_KEY, "folder"],
        [LIBRARY_FOLDER_KEY, selectedFolder],
      ]);
      await loadLibrary("folder", selectedFolder, true);
    } catch (error) {
      console.warn("Unable to access the selected music folder", error);
      setStatus("error");
    } finally {
      accessRequestInFlight.current = false;
    }
  }, [loadLibrary]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cached, savedMode, savedFolder] = await AsyncStorage.multiGet([
          LIBRARY_CACHE_KEY,
          LIBRARY_ACCESS_KEY,
          LIBRARY_FOLDER_KEY,
        ]);
        if (cached?.[1] && active) {
          const parsed = JSON.parse(cached[1] ?? "null") as { tracks?: LocalTrack[] } | null;
          if (parsed?.tracks?.length) {
            applyTracks(parsed.tracks);
          }
        }
        const savedAccessMode = savedMode?.[1];
        const mode: LibraryAccessMode | null = savedAccessMode === "full" || savedAccessMode === "folder"
          ? savedAccessMode
          : null;
        const folder = savedFolder?.[1] || null;
        if (!active) return;
        setAccessMode(mode);
        setFolderUri(folder);
        if (mode === "full" || (mode === "folder" && folder)) {
          await loadLibrary(mode, folder, false);
        } else {
          setStatus("access_required");
        }
      } catch {
        if (active) setStatus("access_required");
      }
    })();
    return () => {
      active = false;
    };
  }, [applyTracks, loadLibrary]);

  const artists = useMemo(() => {
    return Object.entries(groupByArtist(tracks))
      .map(([name, list]) => ({ name, count: list.length }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  const value = useMemo<LibraryContextType>(
    () => ({ tracks, artists, status, refreshing, accessMode, refresh, requestFullAccess, selectMusicFolder }),
    [tracks, artists, status, refreshing, accessMode, refresh, requestFullAccess, selectMusicFolder]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
