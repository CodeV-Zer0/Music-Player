import React from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";

export default function LikedSongsScreen() {
  const { likedTracks, playTrack } = usePlayer();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Liked Songs</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="heart" size={60} color={colors.background} />
        </View>
        <Text style={styles.heroCount}>{likedTracks.length} liked song{likedTracks.length !== 1 ? "s" : ""}</Text>
      </View>

      {likedTracks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={56} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Songs you like will appear here.</Text>
          <Text style={styles.emptySubText}>Tap the ··· next to any song and choose "Add to Liked Songs".</Text>
        </View>
      ) : (
        <FlatList
          data={likedTracks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TrackRow track={item} onPress={() => playTrack(item, likedTracks)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  hero: { alignItems: "center", paddingVertical: spacing.xl },
  heroIcon: {
    width: 126, height: 126, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  heroCount: { color: colors.textSecondary, fontSize: 14 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: "600", marginTop: spacing.md, textAlign: "center" },
  emptySubText: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.sm, textAlign: "center" },
});
