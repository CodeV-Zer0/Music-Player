import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { requestMediaPermission, scanLocalAudio, LocalTrack } from "../services/localLibrary";
import { useNavigation, NavigationProp, ParamListBase } from "@react-navigation/native";
import { usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";
import AlbumArt from "../components/AlbumArt";
import PressableScale from "../components/PressableScale";

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

export default function HomeScreen() {
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [status, setStatus] = useState<"loading" | "denied" | "ready">("loading");
  const { playTrack, recentlyPlayed, likedTracks } = usePlayer();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const loadLibrary = async () => {
    setStatus("loading");
    const granted = await requestMediaPermission();
    if (!granted) {
      setStatus("denied");
      return;
    }
    const found = await scanLocalAudio();
    setTracks(found);
    setStatus("ready");
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const renderHeader = () => {
    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";

    return (
      <View style={styles.headerContainer}>
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>{greeting}</Text>
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
        <View style={styles.quickGrid}>
          {(recentlyPlayed.length > 0 ? recentlyPlayed.slice(0, 4) : likedTracks.slice(0, 4)).map((track) => (
            <PressableScale
              key={`quick-${track.id}`}
              style={styles.quickTile}
              onPress={() => playTrack(track, recentlyPlayed.length > 0 ? recentlyPlayed : likedTracks)}
            >
              <AlbumArt track={track} size={48} radius={0} iconSize={19} />
              <Text numberOfLines={2} style={styles.quickTitle}>{track.title}</Text>
            </PressableScale>
          ))}
          {recentlyPlayed.length === 0 && likedTracks.length === 0 && (
            <PressableScale style={styles.quickTile} onPress={() => navigation.navigate("Playlists")}>
              <View style={styles.quickPlaceholder}><Ionicons name="albums" size={22} color={colors.primary} /></View>
              <Text numberOfLines={2} style={styles.quickTitle}>Your library</Text>
            </PressableScale>
          )}
        </View>
        <Text style={styles.sectionTitle}>On your device</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1 }}>
        {status === "loading" && (
          <FlatList
            data={["one", "two", "three", "four", "five", "six"]}
            keyExtractor={(item) => item}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            renderItem={() => <SkeletonRow />}
          />
        )}

        {status === "denied" && (
          <View style={styles.center}>
            <Text style={styles.empty}>
              Raga needs permission to access your device's audio files to show your library.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadLibrary}>
              <Text style={styles.retryText}>Grant permission</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "ready" && tracks.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="musical-notes" size={34} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No music found</Text>
            <Text style={styles.empty}>Add audio files to your device, then scan your library again.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadLibrary}>
              <Text style={styles.retryText}>Scan again</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "ready" && tracks.length > 0 && (
          <FlatList
            ListHeaderComponent={renderHeader}
            data={tracks}
            keyExtractor={(t) => t.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TrackRow track={item} onPress={() => playTrack(item, tracks)} />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerContainer: { padding: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: "800" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  topBarButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: spacing.md },
  quickTile: { width: "49%", minHeight: 54, flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceElevated, marginBottom: 6, overflow: "hidden", borderRadius: 4 },
  quickPlaceholder: { width: 48, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  quickTitle: { flex: 1, color: colors.text, fontSize: 11, fontWeight: "700", paddingHorizontal: 8 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "800", marginTop: spacing.md },
  empty: { color: colors.textSecondary, padding: spacing.md, textAlign: "center", lineHeight: 20 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceElevated, marginBottom: 18 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: 4 },
  center: { alignItems: "center", justifyContent: "center", padding: spacing.lg, flex: 1 },
  retryButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: spacing.md },
  retryText: { color: colors.background, fontWeight: "bold", fontSize: 16 },
  listContent: { paddingBottom: 150 },
  skeletonRow: { height: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  skeletonArt: { width: 48, height: 48, borderRadius: 4, backgroundColor: colors.surfaceElevated, marginRight: 12 },
  skeletonLine: { height: 13, borderRadius: 4, backgroundColor: colors.surfaceElevated, marginBottom: 8 },
});

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonArt} />
      <View style={{ flex: 1 }}>
        <View style={[styles.skeletonLine, { width: "64%" }]} />
        <View style={[styles.skeletonLine, { width: "42%", height: 10, marginBottom: 0 }]} />
      </View>
    </View>
  );
}
