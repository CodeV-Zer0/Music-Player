import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing } from "../theme/colors";
import { usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";

export default function RecentlyPlayedScreen() {
  const navigation = useNavigation<any>();
  const { recentlyPlayed, playTrack } = usePlayer();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recently Played</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={recentlyPlayed}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TrackRow track={item} onPress={() => playTrack(item, recentlyPlayed)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyTitle}>Nothing played yet</Text>
            <Text style={styles.emptySub}>Songs you listen to will appear here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  listContent: { paddingBottom: 120 },
  
  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptySub: { color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
