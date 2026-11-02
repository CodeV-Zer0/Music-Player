import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing } from "../theme/colors";
import { LocalTrack } from "../services/localLibrary";
import { useLibrary } from "../context/LibraryContext";
import { Track, usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";
import { TRACK_LIST_PERF } from "../components/listPerf";
import * as Haptics from "expo-haptics";

type SearchFilterType = "all" | "songs" | "artists";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<SearchFilterType>("all");
  const navigation = useNavigation<any>();
  const { playTrack, playShuffled } = usePlayer();
  const { tracks: allTracks } = useLibrary();
  const resultsRef = useRef<LocalTrack[]>([]);

  const playFromResults = useCallback((track: Track) => {
    void playTrack(track, resultsRef.current);
  }, [playTrack]);

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return allTracks.filter((t) => {
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchArtist = (t.artist_name || "").toLowerCase().includes(q);

      if (filterType === "songs") return matchTitle;
      if (filterType === "artists") return matchArtist;
      return matchTitle || matchArtist;
    });
  }, [allTracks, query, filterType]);

  const artistResults = useMemo(() => {
    const byArtist = new Map<string, LocalTrack>();
    for (const track of filteredResults) {
      const name = track.artist_name?.trim();
      if (name && !byArtist.has(name.toLowerCase())) byArtist.set(name.toLowerCase(), { ...track, artist_name: name });
    }
    return [...byArtist.values()];
  }, [filteredResults]);

  const visibleResults = filterType === "artists" ? artistResults : filteredResults;
  resultsRef.current = filteredResults;

  const handleShuffleResults = () => {
    if (filteredResults.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    void playShuffled(filteredResults);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerBlock}>
        <Text style={styles.header}>Search</Text>
      </View>

      {/* Dynamic Search Box */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="Songs or artists…"
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

      {/* Dynamic Filter Pills */}
      {query.trim().length > 0 && (
        <View style={styles.pillsRow}>
          <TouchableOpacity
            style={[styles.pill, filterType === "all" && styles.pillActive]}
            onPress={() => setFilterType("all")}
          >
            <Text style={[styles.pillText, filterType === "all" && styles.pillTextActive]}>
              Top Results
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, filterType === "songs" && styles.pillActive]}
            onPress={() => setFilterType("songs")}
          >
            <Text style={[styles.pillText, filterType === "songs" && styles.pillTextActive]}>
              Songs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, filterType === "artists" && styles.pillActive]}
            onPress={() => setFilterType("artists")}
          >
            <Text style={[styles.pillText, filterType === "artists" && styles.pillTextActive]}>
              Artists
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header with result count & shuffle button */}
      {visibleResults.length > 0 && (
        <View style={styles.metaHeader}>
          <Text style={styles.metaCount}>
            {visibleResults.length} {visibleResults.length === 1 ? "result" : "results"}
          </Text>
          <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffleResults}>
            <Ionicons name="shuffle" size={15} color={colors.background} />
            <Text style={styles.shuffleBtnText}>Play All</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={visibleResults}
        keyExtractor={(t) => (filterType === "artists" ? `artist-${t.artist_name}` : t.id)}
        contentContainerStyle={{ paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
        {...TRACK_LIST_PERF}
        renderItem={({ item }) => filterType === "artists" ? (
          <TouchableOpacity
            style={styles.artistResult}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Artist", { artistName: item.artist_name })}
          >
            <View style={styles.artistIcon}><Ionicons name="person" size={20} color={colors.textSecondary} /></View>
            <View style={styles.artistInfo}>
              <Text numberOfLines={1} style={styles.artistName}>{item.artist_name}</Text>
              <Text style={styles.artistHint}>Artist</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <TrackRow track={item} onPlay={playFromResults} />
        )}
        ListEmptyComponent={
          query.trim() ? (
            <View style={styles.emptyHint}>
              <Ionicons name="search-outline" size={54} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyHintTitle}>No songs match "{query}"</Text>
              <Text style={styles.emptyHintSub}>Check the spelling or search for another artist.</Text>
            </View>
          ) : (
            <View style={styles.emptyHint}>
              <Ionicons name="musical-notes-outline" size={56} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyHintTitle}>Search your library</Text>
              <Text style={styles.emptyHintSub}>Find any track or artist stored on your device</Text>
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
    marginBottom: spacing.xs,
    height: 44,
  },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 0 },
  pillsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  pillTextActive: {
    color: colors.background,
    fontWeight: "800",
  },
  metaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  metaCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  shuffleBtnText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "800",
  },
  artistResult: { minHeight: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  artistIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center", marginRight: 12 },
  artistInfo: { flex: 1, minWidth: 0 },
  artistName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  artistHint: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  emptyHint: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyHintTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 6 },
  emptyHintSub: { color: colors.textSecondary, fontSize: 14, textAlign: "center" },
});
