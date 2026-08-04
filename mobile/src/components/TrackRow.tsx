import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Share, Alert, Pressable, ToastAndroid, Platform
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { Track, usePlayer } from "../context/PlayerContext";
import PressableScale from "./PressableScale";
import * as Haptics from "expo-haptics";

interface Props {
  track: Track;
  onPress: () => void;
  onDeleted?: () => void;
  onRemoveFromPlaylist?: () => void;
}

export default function TrackRow({ track, onPress, onDeleted, onRemoveFromPlaylist }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const { isLiked, toggleLike, playlists, addTrackToPlaylist, downloads, downloadTrack } = usePlayer();
  const liked = isLiked(track.id);
  const isDownloaded = downloads.some(d => d.id === track.id);

  const handleShare = async () => {
    setMenuVisible(false);
    try {
      await Share.share({
        title: track.title,
        message: `🎵 ${track.title}${track.artist_name ? " – " + track.artist_name : ""}`,
      });
    } catch {/* user dismissed */ }
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      "Delete song",
      `Remove "${track.title}" from your device?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try {
              await MediaLibrary.deleteAssetsAsync([track.id]);
              onDeleted?.();
            } catch {
              Alert.alert("Error", "Could not delete this file.");
            }
          },
        },
      ]
    );
  };

  const handleToggleLike = () => {
    toggleLike(track);
    setMenuVisible(false);
  };

  const handleAddToPlaylist = (playlistId: string) => {
    addTrackToPlaylist(playlistId, track);
    setShowPlaylists(false);
    setMenuVisible(false);
    
    const p = playlists.find(p => p.id === playlistId);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Added to ${p?.name || 'Playlist'}`, ToastAndroid.SHORT);
    } else {
      Alert.alert("Success", `Added to ${p?.name || 'Playlist'}`);
    }
  };
  
  const handleDownload = () => {
    downloadTrack(track);
    setMenuVisible(false);
    Alert.alert("Downloading...", `"${track.title}" is downloading for offline playback.`);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setShowPlaylists(false);
  };

  return (
    <>
      <PressableScale style={styles.row} onPress={onPress} onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setMenuVisible(true);
      }}>
        <View style={styles.rowAccent} />
        <View style={styles.iconSquare}>
          {track.source === "youtube" ? (
            <Ionicons name="logo-youtube" size={22} color={colors.danger} />
          ) : (
            <>
              <View style={styles.vinylDot} />
              <Ionicons name="musical-note" size={22} color={colors.primary} />
            </>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {track.artist_name || "Unknown Artist"}
          </Text>
        </View>
        {liked && (
          <Ionicons name="heart" size={14} color={colors.primary} style={{ marginRight: 6 }} />
        )}
        {isDownloaded && (
          <Ionicons name="cloud-done" size={14} color={colors.success} style={{ marginRight: 6 }} />
        )}
        <TouchableOpacity
          style={styles.moreButton}
          hitSlop={12}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </PressableScale>

      {/* ── Context menu modal ─────────────────────────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            {/* Track info header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetIcon}>
                <Ionicons name="musical-note" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.sheetArtist} numberOfLines={1}>
                  {track.artist_name || "Unknown Artist"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {showPlaylists ? (
              <View style={{ maxHeight: 300 }}>
                <Text style={styles.playlistsTitle}>Select a Playlist</Text>
                {playlists.length === 0 && <Text style={styles.noPlaylists}>No playlists found.</Text>}
                {playlists.map(p => (
                  <MenuRow key={p.id} icon="albums-outline" label={p.name} onPress={() => handleAddToPlaylist(p.id)} />
                ))}
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPlaylists(false)}>
                  <Text style={styles.cancelText}>Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <MenuRow
                  icon={liked ? "heart" : "heart-outline"}
                  iconColor={liked ? colors.primary : colors.text}
                  label={liked ? "Remove from Liked Songs" : "Add to Liked Songs"}
                  onPress={handleToggleLike}
                />
                <MenuRow icon="list-outline" label="Add to Playlist" onPress={() => setShowPlaylists(true)} />
                {track.source === "youtube" && !isDownloaded && (
                  <MenuRow icon="cloud-download-outline" label="Download for Offline" onPress={handleDownload} />
                )}
                {onRemoveFromPlaylist && (
                  <MenuRow icon="remove-circle-outline" label="Remove from this Playlist" onPress={() => { onRemoveFromPlaylist(); closeMenu(); }} iconColor={colors.danger} labelColor={colors.danger} />
                )}
                <MenuRow icon="share-outline" label="Share" onPress={handleShare} />
                {track.source !== "youtube" && (
                  <MenuRow icon="trash-outline" label="Delete from device" onPress={handleDelete} iconColor={colors.danger} labelColor={colors.danger} />
                )}

                <TouchableOpacity style={styles.cancelBtn} onPress={closeMenu}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginVertical: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "rgba(13,16,32,0.72)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden",
  },
  rowAccent: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  iconSquare: {
    width: 54, height: 54, backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center", marginRight: spacing.md,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  vinylDot: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.glowPrimary,
  },
  info: { flex: 1, justifyContent: "center" },
  title: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: 3 },
  subtitle: { color: colors.textSecondary, fontSize: 13 },
  moreButton: { padding: spacing.sm },

  // Modal
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
  sheetIcon: {
    width: 48, height: 48, backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
    borderRadius: 14, marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
