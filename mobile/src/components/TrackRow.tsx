import React, { useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing } from "../theme/colors";
import { Track, usePlayerCollections } from "../context/PlayerContext";
import PressableScale from "./PressableScale";
import AlbumArt from "./AlbumArt";
import { useTrackActions } from "./TrackActionsSheet";
import { TRACK_ROW_HEIGHT } from "./listPerf";

interface Props {
  track: Track;
  onPlay: (track: Track) => void;
  onDeleted?: () => void;
  onRemoveFromPlaylist?: () => void;
}

function TrackRow({ track, onPlay, onDeleted, onRemoveFromPlaylist }: Props) {
  const { openTrackActions } = useTrackActions();
  const { isLiked, downloads } = usePlayerCollections();
  const liked = isLiked(track.id);
  const isDownloaded = downloads.some((d) => d.id === track.id);

  const openMenu = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    openTrackActions({ track, onDeleted, onRemoveFromPlaylist });
  }, [openTrackActions, track, onDeleted, onRemoveFromPlaylist]);

  return (
    <PressableScale style={styles.row} onPress={() => onPlay(track)} onLongPress={openMenu}>
      <AlbumArt track={track} size={48} radius={4} style={styles.iconSquare} />
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
      <TouchableOpacity style={styles.moreButton} hitSlop={12} onPress={openMenu}>
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </PressableScale>
  );
}

export default React.memo(TrackRow, (prev, next) => (
  prev.track.id === next.track.id &&
  prev.track.thumbnail === next.track.thumbnail &&
  prev.track.title === next.track.title &&
  prev.track.artist_name === next.track.artist_name &&
  prev.onPlay === next.onPlay &&
  prev.onDeleted === next.onDeleted &&
  prev.onRemoveFromPlaylist === next.onRemoveFromPlaylist
));

const styles = StyleSheet.create({
  row: {
    height: TRACK_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: "transparent",
  },
  iconSquare: {
    width: 48, height: 48,
    alignItems: "center", justifyContent: "center", marginRight: 12,
    borderRadius: 4,
    overflow: "hidden",
  },
  info: { flex: 1, justifyContent: "center" },
  title: { color: colors.text, fontSize: 16, marginBottom: 2, fontFamily: "sans-serif" },
  subtitle: { color: colors.textSecondary, fontSize: 13, fontFamily: "sans-serif" },
  moreButton: { padding: spacing.sm, marginLeft: 8 },
});
