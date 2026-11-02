import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { usePlaybackProgress, usePlayer } from "../context/PlayerContext";
import { colors } from "../theme/colors";
import AlbumArt from "./AlbumArt";
import PressableScale from "./PressableScale";
import Visualizer from "./Visualizer";
import { getTrackTheme } from "../theme/dynamicTheme";

export default function MiniPlayer() {
  const navigation = useNavigation<any>();
  const { positionMillis, durationMillis } = usePlaybackProgress();
  const {
    currentTrack,
    isLoading,
    isPlaying,
    togglePlayPause,
    isLiked,
    toggleLike,
  } = usePlayer();
  const iconScale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  const trackTheme = getTrackTheme(currentTrack);

  useEffect(() => {
    iconScale.value = withSequence(withTiming(0.78, { duration: 90 }), withSpring(1));
  }, [iconScale, isPlaying]);

  if (!currentTrack) return null;

  const progress = durationMillis > 0
    ? Math.min(1, Math.max(0, positionMillis / durationMillis))
    : 0;

  const pressHaptic = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  return (
    <View style={[styles.container, { borderLeftColor: trackTheme.primary }]}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: trackTheme.primary }]} />
      </View>
      <View style={styles.row}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Open now playing"
          style={styles.trackPress}
          onPress={() => navigation.navigate("NowPlaying")}
        >
          <AlbumArt track={currentTrack} size={44} radius={6} />
          <View style={styles.trackInfo}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={styles.title}>{currentTrack.title}</Text>
            </View>
            <View style={styles.metaRow}>
              {isPlaying && (
                <Visualizer isPlaying={isPlaying} color={trackTheme.primary} barCount={4} height={10} style={styles.miniWave} />
              )}
              <Text numberOfLines={1} style={styles.artist}>
                {currentTrack.artist_name || "Unknown Artist"}
              </Text>
            </View>
          </View>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={isLiked(currentTrack.id) ? "Remove from Liked Songs" : "Add to Liked Songs"}
          hitSlop={8}
          style={styles.iconButton}
          onPress={() => {
            pressHaptic();
            toggleLike(currentTrack);
          }}
        >
          <Ionicons
            name={isLiked(currentTrack.id) ? "heart" : "heart-outline"}
            size={21}
            color={isLiked(currentTrack.id) ? trackTheme.primary : colors.textSecondary}
          />
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={isLoading ? "Loading track" : isPlaying ? "Pause" : "Play"}
          hitSlop={8}
          style={styles.playButton}
          onPress={() => {
            pressHaptic();
            void togglePlayPause();
          }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Animated.View style={iconStyle}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={25} color={colors.text} />
            </Animated.View>
          )}
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 62,
    marginHorizontal: 8,
    marginBottom: 4,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderLeftWidth: 3,
  },
  progressTrack: { height: 2, backgroundColor: "rgba(255,255,255,0.14)" },
  progressFill: { height: 2 },
  row: { flex: 1, flexDirection: "row", alignItems: "center", paddingLeft: 8, paddingRight: 4 },
  trackPress: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", height: "100%" },
  trackInfo: { flex: 1, minWidth: 0, marginLeft: 10, marginRight: 4 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  title: { color: colors.text, fontSize: 13, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  miniWave: { marginRight: 6, width: 14, height: 10, paddingHorizontal: 0 },
  artist: { color: colors.textSecondary, fontSize: 11 },
  iconButton: { width: 40, height: 48, alignItems: "center", justifyContent: "center" },
  playButton: { width: 42, height: 48, alignItems: "center", justifyContent: "center" },
});
