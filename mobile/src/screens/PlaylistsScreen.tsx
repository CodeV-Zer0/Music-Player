import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { usePlayer } from "../context/PlayerContext";

export default function PlaylistsScreen() {
  const { playlists, createPlaylist, deletePlaylist } = usePlayer();
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Playlists</Text>
        <TouchableOpacity onPress={() => setIsCreating(!isCreating)} hitSlop={10}>
          <Ionicons name={isCreating ? "close" : "add"} size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {isCreating && (
        <View style={styles.createBox}>
          <TextInput
            style={styles.input}
            placeholder="New playlist name..."
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
          <Ionicons name="albums-outline" size={56} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No playlists yet.</Text>
          <Text style={styles.emptySubText}>Create one to organize your music.</Text>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("PlaylistDetails", { playlistId: item.id })}
            >
              <View style={styles.iconSquare}>
                <Ionicons name="musical-notes" size={24} color={colors.primary} />
              </View>
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.subtitle}>{item.tracks.length} song{item.tracks.length !== 1 ? "s" : ""}</Text>
              </View>
              <TouchableOpacity hitSlop={10} onPress={() => handleDelete(item.id, item.name)} style={styles.moreBtn}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
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
  createBox: {
    flexDirection: "row", margin: spacing.md, padding: spacing.sm,
    backgroundColor: colors.surface, borderRadius: 18, alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, fontSize: 16 },
  createBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginLeft: spacing.sm,
  },
  createBtnText: { color: colors.background, fontWeight: "bold" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: "600", marginTop: spacing.md, textAlign: "center" },
  emptySubText: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.sm, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginVertical: 4,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "rgba(13,16,32,0.72)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  iconSquare: {
    width: 56, height: 56, backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center", marginRight: spacing.md, borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: { flex: 1, justifyContent: "center" },
  title: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 2 },
  subtitle: { color: colors.textSecondary, fontSize: 14 },
  moreBtn: { padding: spacing.sm },
});
