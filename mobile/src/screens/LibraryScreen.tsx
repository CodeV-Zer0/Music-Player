import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Animated, Easing
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { requestMediaPermission, scanLocalAudio, groupByArtist } from "../services/localLibrary";
import { usePlayer } from "../context/PlayerContext";
import PressableScale from "../components/PressableScale";

export default function LibraryScreen() {
  const [artists, setArtists] = useState<{ name: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigation = useNavigation<any>();
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

  const rootNav = () => navigation.getParent?.() ?? navigation;

  // Skeleton component for loading state
  const SkeletonRow = () => {
    const pulseValue = new Animated.Value(0.3);
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, { toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseValue, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
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
        <Text style={styles.eyebrow}>Collection</Text>
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
            {/* ── Liked Songs card ──────────────────────────────── */}
            <PressableScale
              style={styles.likedCard}
              onPress={() => navigation.navigate("LikedSongs")}
            >
              <View style={styles.likedIcon}>
                <Ionicons name="heart" size={28} color={colors.background} />
              </View>
              <View>
                <Text style={styles.likedTitle}>Liked Songs</Text>
                <Text style={styles.likedSub}>{likedTracks.length} song{likedTracks.length !== 1 ? "s" : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
            </PressableScale>

            {/* Playlists */}
            <PressableScale
              style={styles.likedCard}
              onPress={() => navigation.navigate("Playlists")}
            >
              <View style={[styles.likedIcon, styles.playlistIcon]}>
                <Ionicons name="albums-outline" size={28} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.likedTitle}>Playlists</Text>
                <Text style={styles.likedSub}>{playlists.length} playlist{playlists.length !== 1 ? "s" : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
            </PressableScale>

            {/* Downloads */}
            <PressableScale
              style={styles.likedCard}
              onPress={() => navigation.navigate("Downloads")}
            >
              <View style={[styles.likedIcon, styles.downloadIcon]}>
                <Ionicons name="cloud-download-outline" size={28} color={colors.background} />
              </View>
              <View>
                <Text style={styles.likedTitle}>Downloads</Text>
                <Text style={styles.likedSub}>{downloads.length} song{downloads.length !== 1 ? "s" : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
            </PressableScale>

            {/* ── Recently Played ───────────────────────────────── */}
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
                      <View style={styles.recentArt}>
                        {item.source === "youtube" ? (
                          <Ionicons name="logo-youtube" size={24} color={colors.danger} />
                        ) : (
                          <Ionicons name="musical-note" size={24} color={colors.textSecondary} />
                        )}
                      </View>
                      <Text style={styles.recentTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.recentArtist} numberOfLines={1}>
                        {item.artist_name || "Unknown"}
                      </Text>
                    </PressableScale>
                  )}
                />
              </View>
            )}

            <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.md, marginTop: spacing.md }]}>
              Artists
            </Text>
            
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
  headerBlock: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 3 },
  header: { color: colors.text, fontSize: 30, fontWeight: "900" },

  // Liked Songs card
  likedCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderRadius: 18, padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  likedIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    marginRight: spacing.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  playlistIcon: { backgroundColor: "rgba(0,229,255,0.08)", borderWidth: 1, borderColor: colors.border },
  downloadIcon: { backgroundColor: colors.success },
  likedTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  likedSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },

  // Recently played
  section: { marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: spacing.sm, paddingHorizontal: spacing.md },
  recentCard: { width: 126, marginRight: spacing.sm },
  recentArt: {
    width: 126, height: 126, backgroundColor: colors.surfaceElevated,
    borderRadius: 18, alignItems: "center", justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentTitle: { color: colors.text, fontSize: 13, fontWeight: "500" },
  recentArtist: { color: colors.textSecondary, fontSize: 12 },

  // Artists
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginVertical: 4,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: "rgba(13,16,32,0.58)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  cover: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center", marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 15, fontWeight: "600" },
  subtitle: { color: colors.textSecondary, fontSize: 13 },
  
  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptySub: { color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
