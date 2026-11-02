import React, { useCallback, useRef } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { Track, usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";
import { TRACK_LIST_PERF } from "../components/listPerf";
import AlbumArt from "../components/AlbumArt";
import * as Haptics from "expo-haptics";

function formatTotalTime(tracks: any[]) {
  const totalSec = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  if (totalSec <= 0) return "";
  const mins = Math.floor(totalSec / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs} hr ${remMins} min`;
}

export default function PlaylistDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { playlists, playTrack, removeTrackFromPlaylist, playShuffled } = usePlayer();
  const playlistId = route.params?.playlistId;
  const playlist = playlists.find((p) => p.id === playlistId);
  const tracksRef = useRef(playlist?.tracks ?? []);
  tracksRef.current = playlist?.tracks ?? [];
  const playFromList = useCallback((track: Track) => {
    void playTrack(track, tracksRef.current);
  }, [playTrack]);

  if (!playlist) return null;

  const totalTimeStr = formatTotalTime(playlist.tracks);

  const handlePlayAll = () => {
    if (playlist.tracks.length > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      void playTrack(playlist.tracks[0]!, playlist.tracks);
    }
  };

  const handleShufflePlay = () => {
    if (playlist.tracks.length > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      void playShuffled(playlist.tracks);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{playlist.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.hero}>
        <AlbumArt track={playlist.tracks[0]} size={120} radius={8} iconSize={44} style={styles.heroArt} />
        <Text style={styles.heroTitle}>{playlist.name}</Text>
        <Text style={styles.heroMeta}>
          {playlist.tracks.length} {playlist.tracks.length === 1 ? "track" : "tracks"}
          {totalTimeStr ? ` · ${totalTimeStr}` : ""}
        </Text>

        {playlist.tracks.length > 0 && (
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

      {playlist.tracks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="musical-notes-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text style={styles.emptyText}>This playlist is empty</Text>
          <Text style={styles.emptySubText}>Add songs by tapping ··· on any track row.</Text>
        </View>
      ) : (
        <FlatList
          data={playlist.tracks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 130 }}
          {...TRACK_LIST_PERF}
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              onPlay={playFromList}
              onRemoveFromPlaylist={() => removeTrackFromPlaylist(playlist.id, item.id)}
            />
          )}
        />
      )}
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
  hero: { alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  heroArt: {
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    marginBottom: 12,
  },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "center", paddingHorizontal: 20 },
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
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, marginTop: 60 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: spacing.md, textAlign: "center" },
  emptySubText: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.xs, textAlign: "center" },
});
