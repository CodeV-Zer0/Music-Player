import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, withTiming, useSharedValue, withSpring, withSequence } from "react-native-reanimated";
import { colors, spacing } from "../theme/colors";
import { usePlayer } from "../context/PlayerContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

function formatTime(millis: number) {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const PressableAnimated = Animated.createAnimatedComponent(TouchableOpacity);

export default function NowPlayingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const {
    currentTrack, isPlaying, positionMillis, durationMillis, queue,
    togglePlayPause, playNext, playPrevious, seekTo, isLiked, toggleLike,
    playbackRate, setPlaybackRate, startSleepTimer, cancelSleepTimer, sleepTimerEnd
  } = usePlayer();

  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  const bottomSheetRef = useRef<BottomSheet>(null);

  // Animations
  const playIconScale = useSharedValue(1);
  const playIconOpacity = useSharedValue(1);
  const likeScale = useSharedValue(1);
  const skipNextScale = useSharedValue(1);
  const skipPrevScale = useSharedValue(1);

  useEffect(() => {
    playIconScale.value = withSequence(withTiming(0.8, { duration: 100 }), withSpring(1));
    playIconOpacity.value = withSequence(withTiming(0.5, { duration: 100 }), withTiming(1, { duration: 100 }));
  }, [isPlaying, playIconScale, playIconOpacity]);

  const animatedPlayStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playIconScale.value }],
    opacity: playIconOpacity.value,
  }));

  const animatedLikeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }]
  }));

  const animatedSkipNextStyle = useAnimatedStyle(() => ({ transform: [{ scale: skipNextScale.value }] }));
  const animatedSkipPrevStyle = useAnimatedStyle(() => ({ transform: [{ scale: skipPrevScale.value }] }));

  if (!currentTrack) return null;

  const queueIndex = queue.findIndex((track) => track.id === currentTrack.id);
  
  const handlePrevious = () => {
    skipPrevScale.value = withSequence(withTiming(0.8, { duration: 100 }), withSpring(1));
    if (queueIndex <= 0) return;
    playPrevious();
  };
  
  const handleNext = () => {
    skipNextScale.value = withSequence(withTiming(0.8, { duration: 100 }), withSpring(1));
    if (queueIndex === -1 || queueIndex >= queue.length - 1) return;
    playNext();
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    likeScale.value = withSequence(withTiming(0.5, { duration: 100 }), withSpring(1.2), withSpring(1));
    toggleLike(currentTrack);
  };

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePlayPause();
  };

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[colors.surfaceElevated, colors.backgroundAlt, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.header, { paddingTop: insets.top || spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>PLAYING FROM PLAYLIST</Text>
          <Text style={styles.headerTitle}>Liked Songs</Text>
        </View>
        <TouchableOpacity hitSlop={10} style={styles.iconBtn} onPress={() => bottomSheetRef.current?.expand()}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.artworkContainer}>
        <View style={styles.artworkPlaceholder}>
          <Ionicons name="musical-notes" size={80} color={colors.primary} />
        </View>
      </View>

      <View style={styles.bottomControls}>
        <View style={styles.infoRow}>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist_name || "Unknown Artist"}</Text>
          </View>
          <PressableAnimated hitSlop={10} onPress={handleLike} style={animatedLikeStyle}>
            <Ionicons 
              name={isLiked(currentTrack.id) ? "heart" : "heart-outline"} 
              size={28} 
              color={isLiked(currentTrack.id) ? colors.primary : colors.text} 
            />
          </PressableAnimated>
        </View>

        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={durationMillis || 1}
            value={isSliding ? sliderValue : positionMillis}
            minimumTrackTintColor={colors.text}
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor={colors.text}
            onSlidingStart={() => setIsSliding(true)}
            onValueChange={(val) => setSliderValue(val)}
            onSlidingComplete={(val) => {
              setIsSliding(false);
              seekTo(val);
            }}
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(isSliding ? sliderValue : positionMillis)}</Text>
            <Text style={styles.time}>{formatTime(durationMillis)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            hitSlop={10}
            onPress={() => setShuffleEnabled(!shuffleEnabled)}
          >
            <Ionicons name="shuffle" size={24} color={shuffleEnabled ? colors.primary : colors.textSecondary} />
            {shuffleEnabled && <View style={styles.dot} />}
          </TouchableOpacity>
          
          <PressableAnimated onPress={handlePrevious} hitSlop={10} style={animatedSkipPrevStyle}>
            <Ionicons name="play-skip-back" size={36} color={colors.text} />
          </PressableAnimated>
          
          <TouchableOpacity activeOpacity={0.8} onPress={handlePlayPause} style={styles.playBtn}>
            <Animated.View style={animatedPlayStyle}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={32} color={colors.backgroundAlt} />
            </Animated.View>
          </TouchableOpacity>
          
          <PressableAnimated onPress={handleNext} hitSlop={10} style={animatedSkipNextStyle}>
            <Ionicons name="play-skip-forward" size={36} color={colors.text} />
          </PressableAnimated>
          
          <TouchableOpacity
            hitSlop={10}
            onPress={() => setRepeatEnabled(!repeatEnabled)}
          >
            <Ionicons name="repeat" size={24} color={repeatEnabled ? colors.primary : colors.textSecondary} />
            {repeatEnabled && <View style={styles.dot} />}
          </TouchableOpacity>
        </View>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['50%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surfaceElevated }}
        handleIndicatorStyle={{ backgroundColor: colors.textSecondary }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Options</Text>
          
          <TouchableOpacity style={styles.sheetRow} onPress={() => {}}>
            <Ionicons name="list" size={24} color={colors.textSecondary} />
            <Text style={styles.sheetText}>View Queue</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sheetRow} onPress={() => {}}>
            <Ionicons name="volume-medium" size={24} color={colors.textSecondary} />
            <Text style={styles.sheetText}>Volume Controls</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetRow} onPress={() => navigation.navigate("Lyrics")}>
            <Ionicons name="document-text-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.sheetText}>View Lyrics</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.sm 
  },
  iconBtn: { padding: 4 },
  headerCenter: { alignItems: "center" },
  headerKicker: { color: colors.textSecondary, fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  headerTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  
  artworkContainer: { 
    flex: 1, 
    paddingHorizontal: spacing.xl, 
    alignItems: "center", 
    justifyContent: "center",
  },
  artworkPlaceholder: {
    width: width - 48, 
    height: width - 48, 
    backgroundColor: colors.surface,
    alignItems: "center", 
    justifyContent: "center",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
  },
  
  bottomControls: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  textContainer: { flex: 1, paddingRight: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 4 },
  artist: { color: colors.textSecondary, fontSize: 16, fontWeight: "500" },
  
  sliderContainer: { marginBottom: spacing.md },
  slider: { width: "100%", height: 30, marginLeft: -15, marginRight: -15 }, // Overcome default padding
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -6 },
  time: { color: colors.textSecondary, fontSize: 11, fontWeight: "500" },
  
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  playBtn: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, alignSelf: "center", marginTop: 4 },

  sheetContent: { padding: spacing.lg },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: spacing.lg, textAlign: "center" },
  sheetRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  sheetText: { color: colors.text, fontSize: 16, marginLeft: spacing.md, fontWeight: "500" }
});
