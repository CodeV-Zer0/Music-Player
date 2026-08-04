import React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";

export default function PlaylistDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { playlists, playTrack, removeTrackFromPlaylist } = usePlayer();
  const playlistId = route.params?.playlistId;
  const playlist = playlists.find(p => p.id === playlistId);

  if (!playlist) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{playlist.name}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="albums-outline" size={60} color={colors.primary} />
        </View>
        <Text style={styles.heroCount}>{playlist.tracks.length} song{playlist.tracks.length !== 1 ? "s" : ""}</Text>
      </View>

      {playlist.tracks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>This playlist is empty.</Text>
          <Text style={styles.emptySubText}>Add songs from the search or library.</Text>
        </View>
      ) : (
        <FlatList
          data={playlist.tracks}
          keyExtractor={(t, i) => `${t.id}-${i}`}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              onPress={() => playTrack(item, playlist.tracks)}
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  hero: { alignItems: "center", paddingVertical: spacing.xl },
  heroIcon: {
    width: 126, height: 126, borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  heroCount: { color: colors.textSecondary, fontSize: 14 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: "600", marginTop: spacing.md, textAlign: "center" },
  emptySubText: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.sm, textAlign: "center" },
});
