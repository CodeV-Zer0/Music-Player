import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { LocalTrack } from "../services/localLibrary";
import { useLibrary } from "../context/LibraryContext";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Track, usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";
import AlbumArt from "../components/AlbumArt";
import PressableScale from "../components/PressableScale";
import LibraryAccessPrompt from "../components/LibraryAccessPrompt";
import { TRACK_LIST_PERF } from "../components/listPerf";
import * as Haptics from "expo-haptics";

type RootStackParamList = {
  MainTabs: undefined;
  Artist: { artistName: string };
  NowPlaying: undefined;
  LikedSongs: undefined;
  Settings: undefined;
  SettingDetail: { category: string; title: string };
  RecentlyPlayed: undefined;
  Playlists: undefined;
  PlaylistDetails: { playlistId: string };
  Downloads: undefined;
  Lyrics: undefined;
};

type FilterCategory = "all" | "recent" | "liked";
type TrackSort = "modified_desc" | "modified_asc" | "title_asc" | "title_desc";

const SORT_OPTIONS: Array<{ value: TrackSort; label: string }> = [
  { value: "modified_desc", label: "Date modified — newest first" },
  { value: "modified_asc", label: "Date modified — oldest first" },
  { value: "title_asc", label: "Title — A to Z" },
  { value: "title_desc", label: "Title — Z to A" },
];

export default function HomeScreen() {
  const {
    tracks,
    status,
    refreshing,
    refresh,
    requestFullAccess,
    selectMusicFolder,
  } = useLibrary();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [sortBy, setSortBy] = useState<TrackSort>("modified_desc");
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const { playTrack, playShuffled, recentlyPlayed, likedTracks } = usePlayer();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const activeTrackList = activeFilter === "recent"
    ? recentlyPlayed
    : activeFilter === "liked"
      ? likedTracks
      : tracks;
  const hasModificationDates = activeTrackList.some((track) => track.modificationTime != null);
  const effectiveSortBy = !hasModificationDates && sortBy.startsWith("modified")
    ? "title_asc"
    : sortBy;
  const sortLabel = SORT_OPTIONS.find((option) => option.value === effectiveSortBy)?.label ?? SORT_OPTIONS[0]!.label;
  const displayedTracks = useMemo(() => {
    let baseList: LocalTrack[] = tracks;
    if (activeFilter === "recent") baseList = recentlyPlayed;
    else if (activeFilter === "liked") baseList = likedTracks;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      baseList = baseList.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.artist_name || "").toLowerCase().includes(q)
      );
    }

    const titleOrder = (a: LocalTrack, b: LocalTrack) =>
      a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
    return [...baseList].sort((a, b) => {
      if (effectiveSortBy === "title_asc") return titleOrder(a, b);
      if (effectiveSortBy === "title_desc") return titleOrder(b, a);

      const aTime = a.modificationTime;
      const bTime = b.modificationTime;
      if (aTime == null) return bTime == null ? titleOrder(a, b) : 1;
      if (bTime == null) return -1;
      const modifiedOrder = effectiveSortBy === "modified_asc" ? aTime - bTime : bTime - aTime;
      return modifiedOrder || titleOrder(a, b);
    });
  }, [tracks, recentlyPlayed, likedTracks, activeFilter, searchFilter, effectiveSortBy]);

  const displayedRef = useRef(displayedTracks);
  displayedRef.current = displayedTracks;

  const playFromList = useCallback((track: Track) => {
    void playTrack(track, displayedRef.current);
  }, [playTrack]);

  const handleShufflePlayAll = () => {
    if (displayedTracks.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    void playShuffled(displayedTracks);
  };

  const renderHeader = () => {
    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";

    const quickPicks = recentlyPlayed.length > 0 ? recentlyPlayed.slice(0, 6) : likedTracks.slice(0, 6);

    return (
      <View style={styles.headerContainer}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.headerTitle}>{greeting}</Text>
            <Text style={styles.headerSubtitle}>
              {tracks.length} {tracks.length === 1 ? "track" : "tracks"} ready on device
            </Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity
              hitSlop={10}
              style={styles.topBarButton}
              onPress={() => navigation.navigate("RecentlyPlayed")}
            >
              <Ionicons name="time-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={10}
              style={styles.topBarButton}
              onPress={() => navigation.navigate("Settings")}
            >
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {quickPicks.length > 0 && (
          <View style={styles.quickGrid}>
            {quickPicks.map((track) => (
              <PressableScale
                key={`quick-${track.id}`}
                style={styles.quickTile}
                onPress={() => playTrack(track, quickPicks)}
              >
                <AlbumArt track={track} size={48} radius={4} iconSize={19} />
                <Text numberOfLines={2} style={styles.quickTitle}>{track.title}</Text>
              </PressableScale>
            ))}
          </View>
        )}

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "all" && styles.filterPillActive]}
            onPress={() => setActiveFilter("all")}
          >
            <Text style={[styles.filterText, activeFilter === "all" && styles.filterTextActive]}>
              All ({tracks.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "recent" && styles.filterPillActive]}
            onPress={() => setActiveFilter("recent")}
          >
            <Text style={[styles.filterText, activeFilter === "recent" && styles.filterTextActive]}>
              Recent ({recentlyPlayed.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "liked" && styles.filterPillActive]}
            onPress={() => setActiveFilter("liked")}
          >
            <Text style={[styles.filterText, activeFilter === "liked" && styles.filterTextActive]}>
              Liked ({likedTracks.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inlineSearch}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.inlineSearchInput}
            placeholder="Quick filter on this screen..."
            placeholderTextColor={colors.textSecondary}
            value={searchFilter}
            onChangeText={setSearchFilter}
            autoCorrect={false}
          />
          {searchFilter.length > 0 && (
            <TouchableOpacity onPress={() => setSearchFilter("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionHeader}>
          <Text style={styles.sectionTitle}>
            {activeFilter === "all" ? "Songs" : activeFilter === "recent" ? "Recently Played" : "Liked Songs"}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.sortButton}
              accessibilityRole="button"
              accessibilityLabel={`Sort tracks. Current order: ${sortLabel}`}
              onPress={() => setSortModalVisible(true)}
            >
              <Ionicons name="swap-vertical" size={16} color={colors.text} />
              <Text style={styles.sortButtonText}>Sort</Text>
            </TouchableOpacity>
            {displayedTracks.length > 0 && (
              <TouchableOpacity style={styles.shuffleBtn} onPress={handleShufflePlayAll}>
                <Ionicons name="shuffle" size={16} color={colors.background} />
                <Text style={styles.shuffleBtnText}>Shuffle</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1 }}>
        {status === "access_required" || status === "denied" || (status === "error" && tracks.length === 0) ? (
          <LibraryAccessPrompt
            status={status === "access_required" || status === "denied" ? status : "error"}
            onFullAccess={() => { void requestFullAccess(); }}
            onSelectFolder={() => { void selectMusicFolder(); }}
            onRetry={() => { void (status === "denied" ? requestFullAccess() : refresh(true)); }}
          />
        ) : status === "loading" && tracks.length === 0 ? (
          <FlatList
            data={["1", "2", "3", "4", "5", "6", "7"]}
            keyExtractor={(item) => item}
            ListHeaderComponent={renderHeader()}
            contentContainerStyle={styles.listContent}
            renderItem={() => <SkeletonRow />}
          />
        ) : (
          <FlatList
            ListHeaderComponent={renderHeader()}
            data={displayedTracks}
            keyExtractor={(t) => t.id}
            contentContainerStyle={styles.listContent}
            {...TRACK_LIST_PERF}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => refresh(true)}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item }) => (
              <TrackRow track={item} onPlay={playFromList} onDeleted={() => refresh(true)} />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={styles.emptyTitle}>No tracks in this view</Text>
                <Text style={styles.empty}>
                  {searchFilter
                    ? `No matches for "${searchFilter}"`
                    : tracks.length === 0
                      ? "No supported audio files were found in this music library. Choose a folder containing music files or refresh your library."
                      : "Add audio files to your device or swipe down to refresh."}
                </Text>
                {!searchFilter && tracks.length === 0 && (
                  <TouchableOpacity
                    style={styles.emptyAction}
                    onPress={() => { void selectMusicFolder(); }}
                  >
                    <Text style={styles.emptyActionText}>Choose another music folder</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </View>
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close sort options"
            style={StyleSheet.absoluteFill}
            onPress={() => setSortModalVisible(false)}
          />
          <View style={styles.sortModal}>
            <Text style={styles.sortModalTitle}>Sort songs</Text>
            <Text style={styles.sortModalSubtitle}>Current: {sortLabel}</Text>
            {SORT_OPTIONS.map((option) => {
              const selected = effectiveSortBy === option.value;
              const disabled = option.value.startsWith("modified") && !hasModificationDates;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.sortOption}
                  disabled={disabled}
                  onPress={() => {
                    setSortBy(option.value);
                    setSortModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      selected && styles.sortOptionTextSelected,
                      disabled && styles.sortOptionTextDisabled,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
            {!hasModificationDates && (
              <Text style={styles.sortModalSubtitle}>
                Date modified is unavailable with folder-only access.
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonArt} />
      <View style={{ flex: 1 }}>
        <View style={[styles.skeletonLine, { width: "65%" }]} />
        <View style={[styles.skeletonLine, { width: "40%", height: 10, marginBottom: 0 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerContainer: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: "800", fontFamily: "sans-serif" },
  headerSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2, fontWeight: "500", fontFamily: "sans-serif" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  topBarButton: { alignItems: "center", justifyContent: "center" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: spacing.md },
  quickTile: {
    width: "49%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    marginBottom: 8,
    borderRadius: 6,
    overflow: "hidden",
  },
  quickTitle: { flex: 1, color: colors.text, fontSize: 11, fontWeight: "700", paddingHorizontal: 8, fontFamily: "sans-serif" },
  filterRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
  },
  filterPillActive: { backgroundColor: colors.primary },
  filterText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600", fontFamily: "sans-serif" },
  filterTextActive: { color: colors.background, fontWeight: "800" },
  inlineSearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    marginTop: 12,
  },
  inlineSearchInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 0, fontFamily: "sans-serif" },
  actionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 4,
  },
  actionButtons: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", fontFamily: "sans-serif-medium" },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  sortButtonText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  shuffleBtnText: { color: colors.background, fontSize: 12, fontWeight: "800" },
  empty: { color: colors.textSecondary, padding: spacing.md, textAlign: "center", lineHeight: 20 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 12, marginBottom: 4 },
  emptyAction: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
  },
  emptyActionText: { color: colors.primary, fontSize: 13, fontWeight: "700", fontFamily: "sans-serif" },
  center: { alignItems: "center", justifyContent: "center", padding: spacing.lg, flex: 1 },
  retryButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: spacing.md },
  retryText: { color: colors.background, fontWeight: "bold", fontSize: 16 },
  listContent: { paddingBottom: 150 },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.78)",
  },
  sortModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sortModalTitle: { color: colors.text, fontSize: 19, fontWeight: "800", fontFamily: "sans-serif" },
  sortModalSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 12, fontFamily: "sans-serif" },
  sortOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  sortOptionText: { color: colors.textSecondary, fontSize: 14, fontFamily: "sans-serif" },
  sortOptionTextSelected: { color: colors.text, fontWeight: "700" },
  sortOptionTextDisabled: { color: colors.textMuted },
  skeletonRow: { height: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  skeletonArt: { width: 44, height: 44, borderRadius: 4, backgroundColor: colors.surfaceElevated, marginRight: 12 },
  skeletonLine: { height: 12, borderRadius: 4, backgroundColor: colors.surfaceElevated, marginBottom: 8 },
});
