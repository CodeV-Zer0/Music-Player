import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { requestMediaPermission, scanLocalAudio, groupByArtist } from "../services/localLibrary";
import { usePlayer, Track } from "../context/PlayerContext";
import PressableScale from "../components/PressableScale";
import AlbumArt from "../components/AlbumArt";

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

type ArtistGroup = { name: string; count: number };

export default function LibraryScreen() {
  const [artists, setArtists] = useState<ArtistGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { likedTracks, recentlyPlayed, playlists, downloads, playTrack } = usePlayer();

  const loadData = async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);

    const granted = await requestMediaPermission();
    if (granted) {
      const tracks = await scanLocalAudio();
      const grouped = groupByArtist(tracks);
      const list = Object.entries(grouped)
        .map(([name, ts]) => ({ name, count: ts.length }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setArtists(list);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    loadData(true);
  }, []);

  const rootNav = () => (navigation.getParent?.() as any) ?? navigation;

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

      <FlatList
        data={isLoading ? [] : artists}
        keyExtractor={(a) => a.name}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <>
            <PressableScale style={styles.likedCard} onPress={() => navigation.navigate("LikedSongs")}>
              <View style={styles.likedIcon}>
                <Ionicons name="heart" size={28} color={colors.background} />
              </View>
              <View>
                <Text style={styles.likedTitle}>Liked Songs</Text>
                <Text style={styles.likedSub}>{likedTracks.length} song{likedTracks.length !== 1 ? "s" : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
            </PressableScale>

            <PressableScale style={styles.likedCard} onPress={() => navigation.navigate("Playlists")}>
              <View style={[styles.likedIcon, styles.playlistIcon]}>
                <Ionicons name="albums-outline" size={28} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.likedTitle}>Playlists</Text>
                <Text style={styles.likedSub}>{playlists.length} playlist{playlists.length !== 1 ? "s" : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
            </PressableScale>

            <PressableScale style={styles.likedCard} onPress={() => navigation.navigate("Downloads")}>
              <View style={[styles.likedIcon, styles.downloadIcon]}>
                <Ionicons name="cloud-download-outline" size={28} color={colors.background} />
              </View>
              <View>
                <Text style={styles.likedTitle}>Downloads</Text>
                <Text style={styles.likedSub}>{downloads.length} song{downloads.length !== 1 ? "s" : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
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

            {playlists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your playlists</Text>
                {playlists.map((playlist) => (
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

            <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.md, marginTop: spacing.md }]}>Artists</Text>

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
              <Ionicons name="musical-notes-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>Your library is empty</Text>
              <Text style={styles.emptySub}>Download or add local audio files to see them here.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBlock: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  header: { color: colors.text, fontSize: 24, fontWeight: "800" },

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
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  playlistIcon: { backgroundColor: colors.surfaceElevated },
  downloadIcon: { backgroundColor: colors.surfaceElevated },
  likedTitle: { color: colors.text, fontSize: 16, fontWeight: "500", marginBottom: 2 },
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
