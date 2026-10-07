import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
import { usePlayer } from "../context/PlayerContext";
import { colors } from "../theme/colors";
import AlbumArt from "./AlbumArt";
import PressableScale from "./PressableScale";
import { extractArtwork } from "../services/localLibrary";

export default function MiniPlayer() {
  const navigation = useNavigation<any>();
  const {
    currentTrack,
    isPlaying,
    positionMillis,
    durationMillis,
    togglePlayPause,
    isLiked,
    toggleLike,
  } = usePlayer();
  const iconScale = useSharedValue(1);
  const [artworkUri, setArtworkUri] = useState<string | undefined>();
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  useEffect(() => {
    iconScale.value = withSequence(withTiming(0.78, { duration: 90 }), withSpring(1));
  }, [iconScale, isPlaying]);

  useEffect(() => {
    let active = true;
    setArtworkUri(currentTrack?.thumbnail);
    if (currentTrack && !currentTrack.thumbnail && currentTrack.source !== "youtube") {
      void extractArtwork(currentTrack).then((uri) => {
        if (active && uri) setArtworkUri(uri);
      });
    }
    return () => { active = false; };
  }, [currentTrack?.id, currentTrack?.thumbnail, currentTrack?.source]);

  if (!currentTrack) return null;

  const progress = durationMillis > 0
    ? Math.min(1, Math.max(0, positionMillis / durationMillis))
    : 0;

  const pressHaptic = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.row}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Open now playing"
          style={styles.trackPress}
          onPress={() => navigation.navigate("NowPlaying")}
        >
          <AlbumArt track={{ ...currentTrack, thumbnail: artworkUri }} size={44} radius={5} iconSize={20} />
          <View style={styles.trackInfo}>
            <Text numberOfLines={1} style={styles.title}>{currentTrack.title}</Text>
            <Text numberOfLines={1} style={styles.artist}>
              {currentTrack.artist_name || "Unknown Artist"}
            </Text>
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
            color={isLiked(currentTrack.id) ? colors.primary : colors.textSecondary}
          />
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? "Pause" : "Play"}
          hitSlop={8}
          style={styles.playButton}
          onPress={() => {
            pressHaptic();
            void togglePlayPause();
          }}
        >
          <Animated.View style={iconStyle}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={25} color={colors.text} />
          </Animated.View>
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
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
  },
  progressTrack: { height: 2, backgroundColor: "rgba(255,255,255,0.18)" },
  progressFill: { height: 2, backgroundColor: colors.primary },
  row: { flex: 1, flexDirection: "row", alignItems: "center", paddingLeft: 8, paddingRight: 4 },
  trackPress: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", height: "100%" },
  trackInfo: { flex: 1, minWidth: 0, marginLeft: 10, marginRight: 4 },
  title: { color: colors.text, fontSize: 13, fontWeight: "600" },
  artist: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  iconButton: { width: 42, height: 48, alignItems: "center", justifyContent: "center" },
  playButton: { width: 42, height: 48, alignItems: "center", justifyContent: "center" },
});
