import React, { useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing } from "../theme/colors";
import { Track, usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";
import { TRACK_LIST_PERF } from "../components/listPerf";
import * as Haptics from "expo-haptics";

export default function RecentlyPlayedScreen() {
  const navigation = useNavigation<any>();
  const { recentlyPlayed, playTrack, playShuffled } = usePlayer();
  const recentRef = useRef(recentlyPlayed);
  recentRef.current = recentlyPlayed;
  const playFromList = useCallback((track: Track) => {
    void playTrack(track, recentRef.current);
  }, [playTrack]);

  const handlePlayAll = () => {
    if (recentlyPlayed.length > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      void playTrack(recentlyPlayed[0]!, recentlyPlayed);
    }
  };

  const handleShufflePlay = () => {
    if (recentlyPlayed.length > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      void playShuffled(recentlyPlayed);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recently Played</Text>
        <View style={{ width: 36 }} />
      </View>

      {recentlyPlayed.length > 0 && (
        <View style={styles.actionsBar}>
          <Text style={styles.countText}>
            {recentlyPlayed.length} {recentlyPlayed.length === 1 ? "track" : "tracks"} played recently
          </Text>
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
              <Ionicons name="play" size={16} color={colors.background} />
              <Text style={styles.playBtnText}>Play All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shuffleBtn} onPress={handleShufflePlay}>
              <Ionicons name="shuffle" size={16} color={colors.text} />
              <Text style={styles.shuffleBtnText}>Shuffle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={recentlyPlayed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        {...TRACK_LIST_PERF}
        renderItem={({ item }) => (
          <TrackRow track={item} onPlay={playFromList} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyTitle}>Nothing played yet</Text>
            <Text style={styles.emptySub}>Songs you listen to will automatically appear here.</Text>
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
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  actionsBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countText: { color: colors.textSecondary, fontSize: 12, fontWeight: "500" },
  buttonsRow: { flexDirection: "row", gap: 8 },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  playBtnText: { color: colors.background, fontSize: 12, fontWeight: "800" },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  shuffleBtnText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  listContent: { paddingBottom: 130 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptySub: { color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
