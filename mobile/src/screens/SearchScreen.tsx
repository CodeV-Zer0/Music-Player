import React, { useState, useEffect } from "react";
import {
  View, TextInput, FlatList, StyleSheet, Text,
  TouchableOpacity, ActivityIndicator, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { requestMediaPermission, scanLocalAudio, LocalTrack } from "../services/localLibrary";
import { usePlayer, Track } from "../context/PlayerContext";
import { searchYouTube, resolveStreamUrl, YouTubeTrack, YouTubePlaylist, getPlaylistTracks } from "../services/pipedApi";
import TrackRow from "../components/TrackRow";

type TabType = "local" | "youtube";
type YtFilter = "music_songs" | "music_albums" | "music_playlists";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("local");
  const [ytFilter, setYtFilter] = useState<YtFilter>("music_songs");
  const [allTracks, setAllTracks] = useState<LocalTrack[]>([]);
  const [ytResults, setYtResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ytError, setYtError] = useState("");
  const { playTrack } = usePlayer();

  useEffect(() => {
    requestMediaPermission().then((granted) => {
      if (granted) scanLocalAudio().then(setAllTracks);
    });
  }, []);

  // Local search
  const localResults = query.trim()
    ? allTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          (t.artist_name || "").toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // YouTube search — triggered when user presses Search on keyboard
  const handleYouTubeSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setYtError("");
    try {
      const results = await searchYouTube(query.trim(), ytFilter);
      setYtResults(results);
    } catch (e: any) {
      setYtError(e.message ?? "Search failed. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };
  
  // Re-run search if filter changes and we already have a query
  useEffect(() => {
    if (activeTab === "youtube" && query.trim() && !loading && ytResults.length > 0) {
      handleYouTubeSearch();
    }
  }, [ytFilter]);

  const handlePlayYouTube = async (item: any) => {
    setLoading(true);
    try {
      if (item.type === 'playlist') {
        const tracks = await getPlaylistTracks(item.id);
        if (tracks.length === 0) throw new Error("Playlist is empty");
        const streamUrl = await resolveStreamUrl(tracks[0].id);
        const playableTrack: Track = { ...tracks[0], uri: streamUrl };
        await playTrack(playableTrack, tracks.map((t) => ({ ...t, uri: "" })));
      } else {
        const streamUrl = await resolveStreamUrl(item.id);
        const playableTrack: Track = { ...item, uri: streamUrl };
        await playTrack(playableTrack, ytResults.filter(t => t.type !== 'playlist').map((t) => ({ ...t, uri: "" })));
      }
    } catch (e: any) {
      setYtError("Could not load this track. Try another.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>Discover</Text>
        <Text style={styles.header}>Search</Text>
      </View>

      {/* ── Search input ─────────────────────────────── */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.primary} />
        <TextInput
          style={styles.input}
          placeholder={activeTab === "local" ? "Search local songs or artists" : "Search YouTube music..."}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={activeTab === "youtube" ? handleYouTubeSearch : undefined}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(""); setYtResults([]); }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tab toggle ───────────────────────────────── */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "local" && styles.tabActive]}
          onPress={() => setActiveTab("local")}
        >
          <Ionicons name="phone-portrait-outline" size={16} color={activeTab === "local" ? colors.background : colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, activeTab === "local" && styles.tabTextActive]}>Local</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "youtube" && styles.tabActive]}
          onPress={() => setActiveTab("youtube")}
        >
          <Ionicons name="logo-youtube" size={16} color={activeTab === "youtube" ? colors.background : colors.danger} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, activeTab === "youtube" && styles.tabTextActive]}>YouTube</Text>
        </TouchableOpacity>
      </View>

      {/* ── YouTube Filters ────────────────────────────── */}
      {activeTab === "youtube" && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, ytFilter === "music_songs" && styles.filterChipActive]}
            onPress={() => setYtFilter("music_songs")}
          >
            <Text style={[styles.filterText, ytFilter === "music_songs" && styles.filterTextActive]}>Songs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, ytFilter === "music_albums" && styles.filterChipActive]}
            onPress={() => setYtFilter("music_albums")}
          >
            <Text style={[styles.filterText, ytFilter === "music_albums" && styles.filterTextActive]}>Albums</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, ytFilter === "music_playlists" && styles.filterChipActive]}
            onPress={() => setYtFilter("music_playlists")}
          >
            <Text style={[styles.filterText, ytFilter === "music_playlists" && styles.filterTextActive]}>Playlists</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Loading spinner ───────────────────────────── */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading stream…</Text>
        </View>
      )}

      {/* ── YouTube error ─────────────────────────────── */}
      {ytError ? <Text style={styles.error}>{ytError}</Text> : null}

      {/* ── Local results ─────────────────────────────── */}
      {activeTab === "local" && !loading && (
        <FlatList
          data={localResults}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TrackRow track={item} onPress={() => playTrack(item, localResults)} />
          )}
          ListEmptyComponent={
            query.trim() ? (
              <Text style={styles.empty}>No local songs match "{query}"</Text>
            ) : (
              <Text style={styles.empty}>Start typing to search your local library</Text>
            )
          }
        />
      )}

      {/* ── YouTube results ───────────────────────────── */}
      {activeTab === "youtube" && !loading && (
        <FlatList
          data={ytResults}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <YouTubeRow track={item} onPress={() => handlePlayYouTube(item)} />
          )}
          ListEmptyComponent={
            query.trim() ? (
              <View style={styles.ytHint}>
                <Ionicons name="logo-youtube" size={48} color={colors.danger} />
                <Text style={styles.ytHintTitle}>Press Search to find "{query}" on YouTube</Text>
                <TouchableOpacity style={styles.searchBtn} onPress={handleYouTubeSearch}>
                  <Text style={styles.searchBtnText}>Search YouTube</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.ytHint}>
                <Ionicons name="logo-youtube" size={48} color={colors.danger} />
                <Text style={styles.ytHintTitle}>Search YouTube Music</Text>
                <Text style={styles.ytHintSub}>Stream any song ad-free via Piped</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function YouTubeRow({ track, onPress }: { track: any; onPress: () => void }) {
  const isPlaylist = track.type === 'playlist';
  const mins = isPlaylist ? 0 : Math.floor(track.duration / 60);
  const secs = isPlaylist ? 0 : track.duration % 60;
  
  return (
    <TouchableOpacity style={styles.ytRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.ytThumb}>
        {track.thumbnail ? (
          <Image source={{ uri: track.thumbnail }} style={styles.ytThumbImg} />
        ) : (
          <Ionicons name="logo-youtube" size={22} color={colors.danger} />
        )}
      </View>
      <View style={styles.ytInfo}>
        <Text style={styles.ytTitle} numberOfLines={2}>{track.title}</Text>
        <Text style={styles.ytArtist} numberOfLines={1}>{isPlaylist ? track.uploaderName : track.artist_name}</Text>
      </View>
      <View style={styles.ytMeta}>
        {isPlaylist ? (
          <Text style={styles.ytDuration}>{track.count} songs</Text>
        ) : (
          <Text style={styles.ytDuration}>{mins}:{String(secs).padStart(2, "0")}</Text>
        )}
        <Ionicons name="play-circle-outline" size={28} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBlock: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 3 },
  header: { color: colors.text, fontSize: 30, fontWeight: "900" },

  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.surface,
    marginHorizontal: spacing.md, borderRadius: 18, paddingHorizontal: spacing.md,
    marginBottom: spacing.md, height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  input: { flex: 1, color: colors.text, padding: spacing.sm, fontSize: 15 },

  // Tabs
  tabs: { flexDirection: "row", marginHorizontal: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  tab: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 18,
    backgroundColor: colors.surfaceElevated, flex: 1, justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: colors.background },

  // Filters
  filterRow: { flexDirection: "row", paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.03)" },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.text, fontSize: 13 },
  filterTextActive: { color: colors.background, fontWeight: "bold" },

  empty: { color: colors.textSecondary, textAlign: "center", marginTop: 40, paddingHorizontal: spacing.lg },
  error: { color: "#FF6B6B", textAlign: "center", padding: spacing.md },

  loadingBox: { alignItems: "center", marginTop: 40 },
  loadingText: { color: colors.textSecondary, marginTop: spacing.sm },

  // YouTube hint
  ytHint: { alignItems: "center", paddingTop: 60, paddingHorizontal: spacing.xl },
  ytHintTitle: { color: colors.text, fontSize: 16, fontWeight: "600", marginTop: 16, textAlign: "center" },
  ytHintSub: { color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: "center" },
  searchBtn: {
    marginTop: 20, backgroundColor: colors.primary,
    paddingVertical: 12, paddingHorizontal: 28, borderRadius: 24,
  },
  searchBtnText: { color: colors.background, fontWeight: "bold", fontSize: 15 },

  // YouTube row
  ytRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginVertical: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "rgba(13,16,32,0.72)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  ytThumb: {
    width: 62, height: 62, backgroundColor: colors.surfaceElevated,
    borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: spacing.md, overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  ytThumbImg: { width: "100%", height: "100%", resizeMode: "cover" },
  ytInfo: { flex: 1, justifyContent: "center" },
  ytTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  ytArtist: { color: colors.textSecondary, fontSize: 13 },
  ytMeta: { alignItems: "flex-end", gap: 4 },
  ytDuration: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
});
