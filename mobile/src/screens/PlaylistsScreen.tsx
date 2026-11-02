import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { usePlayer } from "../context/PlayerContext";
import PressableScale from "../components/PressableScale";
import AlbumArt from "../components/AlbumArt";

export default function PlaylistsScreen() {
  const { playlists, createPlaylist, deletePlaylist, playTrack } = usePlayer();
  const navigation = useNavigation<any>();
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
      setIsCreating(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Playlist", `Are you sure you want to delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePlaylist(id) },
    ]);
  };

  const handlePlayPlaylist = (playlist: any) => {
    if (playlist.tracks.length > 0) {
      void playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Playlists</Text>
        <TouchableOpacity onPress={() => setIsCreating(!isCreating)} hitSlop={10} style={styles.addBtn}>
          <Ionicons name={isCreating ? "close" : "add"} size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      {isCreating && (
        <View style={styles.createBox}>
          <TextInput
            style={styles.input}
            placeholder="Give your playlist a name…"
            placeholderTextColor={colors.textSecondary}
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      )}

      {playlists.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="albums-outline" size={56} color={colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text style={styles.emptyText}>No playlists created yet</Text>
          <Text style={styles.emptySubText}>Tap the + icon above to start organizing your favorites.</Text>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 130 }}
          renderItem={({ item }) => (
            <PressableScale
              style={styles.row}
              onPress={() => navigation.navigate("PlaylistDetails", { playlistId: item.id })}
            >
              <AlbumArt track={item.tracks[0]} size={50} radius={4} iconSize={22} />
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.subtitle}>
                  Playlist · {item.tracks.length} {item.tracks.length === 1 ? "song" : "songs"}
                </Text>
              </View>
              {item.tracks.length > 0 && (
                <TouchableOpacity
                  hitSlop={10}
                  onPress={() => handlePlayPlaylist(item)}
                  style={styles.actionIcon}
                >
                  <Ionicons name="play-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                hitSlop={10}
                onPress={() => handleDelete(item.id, item.name)}
                style={styles.actionIcon}
              >
                <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </PressableScale>
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
    paddingVertical: spacing.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  createBox: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 48,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    alignItems: "center",
  },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginLeft: spacing.sm,
  },
  createBtnText: { color: colors.background, fontWeight: "800", fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, marginTop: 80 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: spacing.md, textAlign: "center" },
  emptySubText: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.xs, textAlign: "center", lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: "transparent",
  },
  info: { flex: 1, justifyContent: "center", marginLeft: 12 },
  title: { color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 2 },
  subtitle: { color: colors.textSecondary, fontSize: 13 },
  actionIcon: { padding: spacing.xs, marginLeft: 8 },
});
