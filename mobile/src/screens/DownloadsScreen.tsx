import React, { useCallback, useRef } from "react";
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing } from "../theme/colors";
import { Track, usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";
import { TRACK_LIST_PERF } from "../components/listPerf";
import * as Haptics from "expo-haptics";

export default function DownloadsScreen() {
  const navigation = useNavigation<any>();
  const { downloads, playTrack, playShuffled } = usePlayer();
  const downloadsRef = useRef(downloads);
  downloadsRef.current = downloads;
  const playFromList = useCallback((track: Track) => {
    void playTrack(track, downloadsRef.current);
  }, [playTrack]);

  const handlePlayAll = () => {
    if (downloads.length > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      void playTrack(downloads[0]!, downloads);
    }
  };

  const handleShufflePlay = () => {
    if (downloads.length > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      void playShuffled(downloads);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Downloads</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="cloud-download" size={54} color={colors.background} />
        </View>
        <Text style={styles.heroTitle}>Offline Downloads</Text>
        <Text style={styles.heroCount}>
          {downloads.length} {downloads.length === 1 ? "track" : "tracks"} downloaded
        </Text>

        {downloads.length > 0 && (
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
        data={downloads}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: 130 }}
        {...TRACK_LIST_PERF}
        renderItem={({ item }) => (
          <TrackRow track={item} onPlay={playFromList} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={54} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyTitle}>No offline downloads</Text>
            <Text style={styles.emptySub}>Tracks you download will appear here for offline listening without internet.</Text>
          </View>
        }
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
  hero: { alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  heroCount: { color: colors.textSecondary, fontSize: 13, marginTop: 4, fontWeight: "500" },
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
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 16 },
  emptySub: { color: colors.textSecondary, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
