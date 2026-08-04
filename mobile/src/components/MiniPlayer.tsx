import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { usePlayer } from "../context/PlayerContext";
import Animated, { useAnimatedStyle, withTiming, useSharedValue, withSpring, withSequence } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

export default function MiniPlayer() {
  const navigation = useNavigation<any>();
  const { currentTrack, isPlaying, togglePlayPause, positionMillis, durationMillis, isLiked, toggleLike } = usePlayer();

  const playIconScale = useSharedValue(1);
  const playIconOpacity = useSharedValue(1);

  useEffect(() => {
    playIconScale.value = withSequence(withTiming(0.8, { duration: 100 }), withSpring(1));
    playIconOpacity.value = withSequence(withTiming(0.5, { duration: 100 }), withTiming(1, { duration: 100 }));
  }, [isPlaying, playIconScale, playIconOpacity]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playIconScale.value }],
    opacity: playIconOpacity.value,
  }));

  if (!currentTrack) return null;

  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePlayPause();
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleLike(currentTrack);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("NowPlaying")}
      style={styles.container}
    >
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: progress * (width - 16) }]} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.artworkPlaceholder}>
          <Ionicons name="musical-notes" size={24} color={colors.primary} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentTrack.artist_name || "Unknown Artist"}
          </Text>
        </View>

        <TouchableOpacity hitSlop={15} style={styles.likeBtn} onPress={handleLike}>
          <Ionicons name={isLiked(currentTrack.id) ? "heart" : "heart-outline"} size={24} color={isLiked(currentTrack.id) ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity hitSlop={15} onPress={handlePlayPause} style={styles.playBtn}>
          <Animated.View style={animatedIconStyle}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={28} color={colors.text} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: 8,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  progressBarBg: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    width: "100%",
  },
  progressBarFill: {
    height: 2,
    backgroundColor: colors.text,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  artworkPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  likeBtn: {
    paddingHorizontal: 12,
  },
  playBtn: {
    paddingRight: 8,
    paddingLeft: 4,
  },
});
