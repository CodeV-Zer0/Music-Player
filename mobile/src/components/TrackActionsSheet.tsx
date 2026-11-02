import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing } from "../theme/colors";
import { Track, usePlayerCollections } from "../context/PlayerContext";
import AlbumArt from "./AlbumArt";

type MenuTarget = {
  track: Track;
  onDeleted?: () => void;
  onRemoveFromPlaylist?: () => void;
};

type TrackActionsContextType = {
  openTrackActions: (target: MenuTarget) => void;
};

const TrackActionsContext = createContext<TrackActionsContextType | null>(null);

export function TrackActionsProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<MenuTarget | null>(null);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const navigation = useNavigation<any>();
  const { isLiked, toggleLike, playlists, addTrackToPlaylist, downloads, downloadTrack } = usePlayerCollections();

  const close = useCallback(() => {
    setTarget(null);
    setShowPlaylists(false);
  }, []);

  const openTrackActions = useCallback((next: MenuTarget) => {
    setShowPlaylists(false);
    setTarget(next);
  }, []);

  const track = target?.track;
  const liked = track ? isLiked(track.id) : false;
  const isDownloaded = track ? downloads.some((d) => d.id === track.id) : false;

  const handleShare = async () => {
    if (!track) return;
    close();
    try {
      await Share.share({
        title: track.title,
        message: `🎵 ${track.title}${track.artist_name ? " – " + track.artist_name : ""}`,
      });
    } catch {
      // user dismissed
    }
  };

  const handleDelete = () => {
    if (!track) return;
    const current = target;
    close();
    Alert.alert("Delete song", `Remove "${track.title}" from your device?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await MediaLibrary.deleteAssetsAsync([track.id]);
            current?.onDeleted?.();
          } catch {
            Alert.alert("Error", "Could not delete this file.");
          }
        },
      },
    ]);
  };

  const handleToggleLike = () => {
    if (!track) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    toggleLike(track);
    close();
  };

  const handleAddToPlaylist = (playlistId: string) => {
    if (!track) return;
    addTrackToPlaylist(playlistId, track);
    close();
    const playlist = playlists.find((p) => p.id === playlistId);
    if (Platform.OS === "android") {
      ToastAndroid.show(`Added to ${playlist?.name || "Playlist"}`, ToastAndroid.SHORT);
    } else {
      Alert.alert("Success", `Added to ${playlist?.name || "Playlist"}`);
    }
  };

  const handleDownload = async () => {
    if (!track) return;
    close();
    try {
      await downloadTrack(track);
      if (Platform.OS === "android") ToastAndroid.show("Downloaded for offline playback", ToastAndroid.SHORT);
      else Alert.alert("Downloaded", `"${track.title}" is ready for offline playback.`);
    } catch {
      Alert.alert("Download failed", "Check your connection and try again.");
    }
  };

  const value = useMemo(() => ({ openTrackActions }), [openTrackActions]);

  return (
    <TrackActionsContext.Provider value={value}>
      {children}
      <Modal visible={!!target} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {track && (
              <View style={styles.sheetHeader}>
                <AlbumArt track={track} size={48} radius={8} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.sheetTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.sheetArtist} numberOfLines={1}>
                    {track.artist_name || "Unknown Artist"}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.divider} />
            {showPlaylists ? (
              <View style={{ maxHeight: 300 }}>
                <Text style={styles.playlistsTitle}>Select a Playlist</Text>
                {playlists.length === 0 && <Text style={styles.noPlaylists}>No playlists found.</Text>}
                {playlists.map((p) => (
                  <MenuRow key={p.id} icon="albums-outline" label={p.name} onPress={() => handleAddToPlaylist(p.id)} />
                ))}
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPlaylists(false)}>
                  <Text style={styles.cancelText}>Back</Text>
                </TouchableOpacity>
              </View>
            ) : track ? (
              <>
                <MenuRow
                  icon={liked ? "heart" : "heart-outline"}
                  iconColor={liked ? colors.primary : colors.text}
                  label={liked ? "Remove from Liked Songs" : "Add to Liked Songs"}
                  onPress={handleToggleLike}
                />
                <MenuRow icon="list-outline" label="Add to Playlist" onPress={() => setShowPlaylists(true)} />
                {track.artist_name && (
                  <MenuRow
                    icon="person-outline"
                    label="Go to Artist"
                    onPress={() => {
                      close();
                      navigation.navigate("Artist", { artistName: track.artist_name });
                    }}
                  />
                )}
                {track.source === "youtube" && !isDownloaded && (
                  <MenuRow icon="cloud-download-outline" label="Download for Offline" onPress={handleDownload} />
                )}
                {target?.onRemoveFromPlaylist && (
                  <MenuRow
                    icon="remove-circle-outline"
                    label="Remove from this Playlist"
                    onPress={() => {
                      target.onRemoveFromPlaylist?.();
                      close();
                    }}
                    iconColor={colors.danger}
                    labelColor={colors.danger}
                  />
                )}
                <MenuRow icon="share-outline" label="Share" onPress={handleShare} />
                {track.source !== "youtube" && (
                  <MenuRow
                    icon="trash-outline"
                    label="Delete from device"
                    onPress={handleDelete}
                    iconColor={colors.danger}
                    labelColor={colors.danger}
                  />
                )}
                <TouchableOpacity style={styles.cancelBtn} onPress={close}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </TrackActionsContext.Provider>
  );
}

export function useTrackActions() {
  const ctx = useContext(TrackActionsContext);
  if (!ctx) throw new Error("useTrackActions must be used within TrackActionsProvider");
  return ctx;
}

function MenuRow({
  icon, label, onPress, iconColor, labelColor,
}: {
  icon: any; label: string; onPress: () => void;
  iconColor?: string; labelColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={iconColor ?? colors.text} style={{ marginRight: 16 }} />
      <Text style={[styles.menuLabel, labelColor ? { color: labelColor } : {}]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: {
    width: 42, height: 4, backgroundColor: colors.primary, borderRadius: 2,
    alignSelf: "center", marginTop: 10, marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingBottom: 12,
  },
  sheetTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  sheetArtist: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginHorizontal: spacing.lg, marginBottom: 8 },
  menuRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: 14,
  },
  menuLabel: { color: colors.text, fontSize: 16 },
  cancelBtn: {
    marginHorizontal: spacing.lg, marginTop: 8,
    paddingVertical: 14, borderRadius: 8,
    backgroundColor: colors.surfaceElevated, alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  playlistsTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: "600", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  noPlaylists: { color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontStyle: "italic" },
});
