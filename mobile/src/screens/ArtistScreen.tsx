import React, { useCallback, useMemo, useRef } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { LocalTrack } from "../services/localLibrary";
import { useLibrary } from "../context/LibraryContext";
import { Track, usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";
import AlbumArt from "../components/AlbumArt";
import { TRACK_LIST_PERF } from "../components/listPerf";
import * as Haptics from "expo-haptics";

export default function ArtistScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { artistName } = route.params;
  const { tracks: allTracks } = useLibrary();
  const { playTrack, playShuffled } = usePlayer();

  const tracks = useMemo(
    () => allTracks.filter((t) => (t.artist_name || "Unknown Artist") === artistName),
    [allTracks, artistName]
  );
  const tracksRef = useRef<LocalTrack[]>(tracks);
  tracksRef.current = tracks;

  const playFromList = useCallback((track: Track) => {
    void playTrack(track, tracksRef.current);
  }, [playTrack]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      void playTrack(tracks[0]!, tracks);
    }
  };

  const handleShufflePlay = () => {
    if (tracks.length > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      void playShuffled(tracks);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{artistName}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          {tracks[0] ? (
            <AlbumArt track={tracks[0]} size={110} radius={55} iconSize={40} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={48} color={colors.textSecondary} />
            </View>
          )}
        </View>
        <Text style={styles.heroTitle}>{artistName}</Text>
        <Text style={styles.heroMeta}>
          {tracks.length} {tracks.length === 1 ? "track" : "tracks"} on your device
        </Text>

        {tracks.length > 0 && (
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.playAllBtn} onPress={handlePlayAll}>
              <Ionicons name="play" size={20} color={colors.background} />
              <Text style={styles.playAllText}>Play</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shuffleBtn} onPress={handleShufflePlay}>
              <Ionicons name="shuffle" size={20} color={colors.text} />
              <Text style={styles.shuffleText}>Shuffle</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: 130 }}
        {...TRACK_LIST_PERF}
        renderItem={({ item }) => (
          <TrackRow track={item} onPlay={playFromList} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  hero: {
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  avatarWrap: {
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  avatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: colors.text, fontSize: 24, fontWeight: "900", textAlign: "center", paddingHorizontal: 20 },
  heroMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 4, fontWeight: "500" },
  heroActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  playAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  playAllText: { color: colors.background, fontWeight: "800", fontSize: 14 },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  shuffleText: { color: colors.text, fontWeight: "700", fontSize: 14 },
});
