import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Animated,
  Easing,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { useLibrary } from "../context/LibraryContext";
import { usePlayer } from "../context/PlayerContext";
import PressableScale from "../components/PressableScale";
import AlbumArt from "../components/AlbumArt";
import LibraryAccessPrompt from "../components/LibraryAccessPrompt";
import { TRACK_LIST_PERF } from "../components/listPerf";

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

type LibraryFilter = "all" | "playlists" | "artists";

export default function LibraryScreen() {
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { likedTracks, recentlyPlayed, playlists, downloads, playTrack } = usePlayer();
  const {
    artists,
    status,
    refreshing,
    refresh,
    requestFullAccess,
    selectMusicFolder,
  } = useLibrary();
  const isLoading = status === "loading" && artists.length === 0;

  const onRefresh = useCallback(() => {
    void refresh(true);
  }, [refresh]);

  const rootNav = () => (navigation.getParent?.() as any) ?? navigation;

  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) return artists;
    return artists.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [artists, searchQuery]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    return playlists.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [playlists, searchQuery]);

  const SkeletonRow = () => {
    const pulseValue = new Animated.Value(0.3);
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, { toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseValue, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    }, []);

    return (
      <View style={styles.row}>
        <Animated.View style={[styles.cover, { backgroundColor: colors.surfaceElevated, opacity: pulseValue }]} />
        <View style={{ flex: 1 }}>
          <Animated.View style={{ height: 16, width: "60%", backgroundColor: colors.surfaceElevated, borderRadius: 4, marginBottom: 8, opacity: pulseValue }} />
          <Animated.View style={{ height: 12, width: "40%", backgroundColor: colors.surfaceElevated, borderRadius: 4, opacity: pulseValue }} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerBlock}>
        <Text style={styles.header}>Your Library</Text>
      </View>

      {/* Dynamic Filter Pills */}
      <View style={styles.pillsRow}>
        <TouchableOpacity
          style={[styles.pill, filter === "all" && styles.pillActive]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.pillText, filter === "all" && styles.pillTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, filter === "playlists" && styles.pillActive]}
          onPress={() => setFilter("playlists")}
        >
          <Text style={[styles.pillText, filter === "playlists" && styles.pillTextActive]}>
            Playlists ({playlists.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, filter === "artists" && styles.pillActive]}
          onPress={() => setFilter("artists")}
        >
          <Text style={[styles.pillText, filter === "artists" && styles.pillTextActive]}>
            Artists ({artists.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Search Box within Library */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter library…"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {status === "access_required" ||
      status === "denied" ||
      (status === "error" && artists.length === 0) ? (
        <LibraryAccessPrompt
          status={status === "access_required" || status === "denied" ? status : "error"}
          onFullAccess={() => { void requestFullAccess(); }}
          onSelectFolder={() => { void selectMusicFolder(); }}
          onRetry={() => { void (status === "denied" ? requestFullAccess() : refresh(true)); }}
        />
      ) : (
      <FlatList
        data={filter === "playlists" ? [] : filteredArtists}
        keyExtractor={(a) => a.name}
        contentContainerStyle={{ paddingBottom: 130 }}
        {...TRACK_LIST_PERF}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <>
            {filter === "all" && !searchQuery && (
              <>
                <PressableScale style={styles.likedCard} onPress={() => navigation.navigate("LikedSongs")}>
                  <View style={styles.likedIcon}>
                    <Ionicons name="heart" size={26} color={colors.background} />
                  </View>
                  <View>
                    <Text style={styles.likedTitle}>Liked Songs</Text>
                    <Text style={styles.likedSub}>{likedTracks.length} {likedTracks.length === 1 ? "song" : "songs"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
                </PressableScale>

                <PressableScale style={styles.likedCard} onPress={() => navigation.navigate("Playlists")}>
                  <View style={[styles.likedIcon, styles.playlistIcon]}>
                    <Ionicons name="albums-outline" size={26} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.likedTitle}>Playlists</Text>
                    <Text style={styles.likedSub}>{playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
                </PressableScale>

                <PressableScale style={styles.likedCard} onPress={() => navigation.navigate("Downloads")}>
                  <View style={[styles.likedIcon, styles.downloadIcon]}>
                    <Ionicons name="cloud-download-outline" size={26} color={colors.background} />
                  </View>
                  <View>
                    <Text style={styles.likedTitle}>Downloads</Text>
                    <Text style={styles.likedSub}>{downloads.length} {downloads.length === 1 ? "song" : "songs"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
                </PressableScale>

                {recentlyPlayed.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recently Played</Text>
                    <FlatList
                      horizontal
                      data={recentlyPlayed.slice(0, 10)}
                      keyExtractor={(t) => `recent-${t.id}`}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: spacing.md }}
                      renderItem={({ item }) => (
                        <PressableScale
                          style={styles.recentCard}
                          onPress={() => playTrack(item, recentlyPlayed)}
                        >
                          <AlbumArt track={item} size={110} radius={5} iconSize={30} style={styles.recentArt} />
                          <Text style={styles.recentTitle} numberOfLines={2}>{item.title}</Text>
                          <Text style={styles.recentArtist} numberOfLines={1}>
                            {item.artist_name || "Unknown"}
                          </Text>
                        </PressableScale>
                      )}
                    />
                  </View>
                )}
              </>
            )}

            {(filter === "all" || filter === "playlists") && filteredPlaylists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Playlists</Text>
                {filteredPlaylists.map((playlist) => (
                  <PressableScale
                    key={playlist.id}
                    style={styles.row}
                    onPress={() => navigation.navigate("PlaylistDetails", { playlistId: playlist.id })}
                  >
                    <AlbumArt track={playlist.tracks[0]} size={48} radius={4} iconSize={20} style={styles.playlistArt} />
                    <View style={styles.rowInfo}>
                      <Text style={styles.title} numberOfLines={1}>{playlist.name}</Text>
                      <Text style={styles.subtitle}>Playlist · {playlist.tracks.length} songs</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </PressableScale>
                ))}
              </View>
            )}

            {(filter === "all" || filter === "artists") && (
              <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.md, marginTop: spacing.md }]}>
                Artists ({filteredArtists.length})
              </Text>
            )}

            {isLoading && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}
          </>
        }
        renderItem={({ item }) => (
          <PressableScale
            style={styles.row}
            onPress={() => rootNav().navigate("Artist", { artistName: item.name })}
          >
            <View style={styles.cover}>
              <Ionicons name="person" size={22} color={colors.textSecondary} />
            </View>
            <View>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.subtitle}>{item.count} song{item.count !== 1 ? "s" : ""}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
          </PressableScale>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={54} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>Nothing found in library</Text>
              <Text style={styles.emptySub}>Try searching for something else or refresh your scan.</Text>
            </View>
          ) : null
        }
      />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBlock: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  header: { color: colors.text, fontSize: 24, fontWeight: "800" },
  pillsRow: { flexDirection: "row", paddingHorizontal: spacing.md, paddingVertical: 8, gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
  },
  pillActive: { backgroundColor: colors.primary },
  pillText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  pillTextActive: { color: colors.background, fontWeight: "800" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: spacing.md,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: spacing.xs,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 0 },
  likedCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  likedIcon: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  playlistIcon: { backgroundColor: colors.surfaceElevated },
  downloadIcon: { backgroundColor: colors.surfaceElevated },
  likedTitle: { color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 2 },
  likedSub: { color: colors.textSecondary, fontSize: 13 },
  section: { marginBottom: spacing.md, marginTop: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: spacing.sm, paddingHorizontal: spacing.md },
  recentCard: { width: 110, marginRight: spacing.md },
  recentArt: { marginBottom: 8 },
  recentTitle: { color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: 2 },
  recentArtist: { color: colors.textSecondary, fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: "transparent",
  },
  rowInfo: { flex: 1, minWidth: 0 },
  playlistArt: { marginRight: 12 },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "500", marginBottom: 2 },
  subtitle: { color: colors.textSecondary, fontSize: 13 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptySub: { color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
