import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { requestMediaPermission, scanLocalAudio, LocalTrack } from "../services/localLibrary";
import { usePlayer } from "../context/PlayerContext";
import { searchYouTube, YouTubeTrack } from "../services/pipedApi";
import TrackRow from "../components/TrackRow";
import { Track } from "../context/PlayerContext";

type SearchSource = "local" | "youtube";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [allLocalTracks, setAllLocalTracks] = useState<LocalTrack[]>([]);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeTrack[]>([]);
  const [selectedSource, setSelectedSource] = useState<SearchSource>("local");
  const [isSearchingYoutube, setIsSearchingYoutube] = useState(false);
  const { playTrack } = usePlayer();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    requestMediaPermission().then((granted) => {
      if (granted) scanLocalAudio().then(setAllLocalTracks);
    });
  }, []);

  const localResults = query.trim()
    ? allLocalTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          (t.artist_name || "").toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const searchYouTubeDebounced = useCallback((searchQuery: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.trim().length < 2) {
      setYoutubeResults([]);
      return;
    }

    setIsSearchingYoutube(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchYouTube(searchQuery.trim(), "music_songs");
        setYoutubeResults(results);
      } catch (error) {
        console.warn("YouTube search failed:", error);
        setYoutubeResults([]);
      } finally {
        setIsSearchingYoutube(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (selectedSource === "youtube") {
      searchYouTubeDebounced(query);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedSource, searchYouTubeDebounced]);

  const currentResults = selectedSource === "local" ? localResults : youtubeResults;
  const isLoading = selectedSource === "youtube" && isSearchingYoutube;

  const handleTrackPress = (track: Track, queue: Track[]) => {
    playTrack(track, queue);
  };

  const renderItem = ({ item }: { item: Track }) => (
    <TrackRow track={item} onPress={() => handleTrackPress(item, currentResults as Track[])} />
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerBlock}>
        <Text style={styles.header}>Search</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="Songs, artists, albums…"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.sourceTabs}>
        <TouchableOpacity
          style={[styles.sourceTab, selectedSource === "local" && styles.sourceTabActive]}
          onPress={() => setSelectedSource("local")}
        >
          <Text style={[styles.sourceTabText, selectedSource === "local" && styles.sourceTabTextActive]}>Local</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sourceTab, selectedSource === "youtube" && styles.sourceTabActive]}
          onPress={() => setSelectedSource("youtube")}
        >
          <Text style={[styles.sourceTabText, selectedSource === "youtube" && styles.sourceTabTextActive]}>YouTube</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentResults}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        renderItem={renderItem}
        ListEmptyComponent={
          query.trim() ? (
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Searching YouTube…</Text>
              </View>
            ) : (
              <View style={styles.emptyHint}>
                <Ionicons
                  name={selectedSource === "local" ? "search-outline" : "logo-youtube"}
                  size={56}
                  color={colors.textSecondary}
                  style={{ opacity: 0.4 }}
                />
                <Text style={styles.emptyHintTitle}>
                  {selectedSource === "local" ? "No local songs match" : "No YouTube results"}
                </Text>
                <Text style={styles.emptyHintSub}>
                  {selectedSource === "local"
                    ? `No songs match "${query}"`
                    : "Try a different search term"}
                </Text>
              </View>
            )
          ) : (
            <View style={styles.emptyHint}>
              <Ionicons name="search-outline" size={56} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyHintTitle}>Search your library</Text>
              <Text style={styles.emptyHintSub}>
                {selectedSource === "local"
                  ? "Find songs or artists from your device"
                  : "Search YouTube for any song"}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBlock: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  header: { color: colors.text, fontSize: 24, fontWeight: "800" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: spacing.md,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    height: 44,
  },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 0 },

  sourceTabs: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 4,
  },
  sourceTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  sourceTabActive: {
    backgroundColor: colors.primary,
  },
  sourceTabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  sourceTabTextActive: {
    color: colors.background,
  },

  loadingContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontSize: 14,
  },

  empty: { color: colors.textSecondary, textAlign: "center", marginTop: 40, paddingHorizontal: spacing.lg },

  emptyHint: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyHintTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptyHintSub: { color: colors.textSecondary, fontSize: 14, textAlign: "center" },
});
