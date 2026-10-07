import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../context/PlayerContext";
import { colors, spacing } from "../theme/colors";
import AlbumArt from "../components/AlbumArt";
import PressableScale from "../components/PressableScale";
import { extractArtwork } from "../services/localLibrary";

const { width, height } = Dimensions.get("window");
const artSize = Math.min(width - 48, height * 0.43, 360);

type SheetView = "queue" | "options";

function formatTime(millis: number) {
  const seconds = Math.floor(Math.max(0, millis) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function NowPlayingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const {
    currentTrack,
    isPlaying,
    positionMillis,
    durationMillis,
    queue,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    playTrack,
    isLiked,
    toggleLike,
    playbackRate,
    setPlaybackRate,
    startSleepTimer,
    cancelSleepTimer,
    sleepTimerEnd,
    shuffleEnabled,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
  } = usePlayer();
  const sheetRef = useRef<BottomSheet>(null);
  const [sheetView, setSheetView] = useState<SheetView>("queue");
  const [isSliding, setIsSliding] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [artworkUri, setArtworkUri] = useState<string | undefined>();
  const playScale = useSharedValue(1);
  const likeScale = useSharedValue(1);
  const previousScale = useSharedValue(1);
  const nextScale = useSharedValue(1);

  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: playScale.value }] }));
  const likeStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));
  const previousStyle = useAnimatedStyle(() => ({ transform: [{ scale: previousScale.value }] }));
  const nextStyle = useAnimatedStyle(() => ({ transform: [{ scale: nextScale.value }] }));

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

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.55} />
    ),
    [],
  );

  if (!currentTrack) return null;

  const liked = isLiked(currentTrack.id);
  const openSheet = (view: SheetView) => {
    setSheetView(view);
    sheetRef.current?.snapToIndex(0);
  };
  const haptic = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };
  const triggerPulse = (scale: SharedValue<number>) => {
    scale.value = withSequence(withTiming(0.82, { duration: 90 }), withSpring(1));
  };
  const handlePrevious = () => {
    haptic();
    triggerPulse(previousScale);
    void playPrevious();
  };
  const handleNext = () => {
    haptic();
    triggerPulse(nextScale);
    void playNext();
  };
  const handlePlayPause = () => {
    haptic();
    triggerPulse(playScale);
    void togglePlayPause();
  };
  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    void setPlaybackRate(rates[(currentIndex + 1) % rates.length] ?? 1);
  };
  const timerLabel = sleepTimerEnd
    ? `Ends in ${Math.max(1, Math.ceil((sleepTimerEnd - Date.now()) / 60000))} min`
    : "Off";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#4A392B", "#24201D", colors.background]}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Close now playing"
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-down" size={27} color={colors.text} />
        </PressableScale>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>PLAYING FROM YOUR LIBRARY</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{currentTrack.source === "youtube" ? "Online music" : "Local music"}</Text>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Playback options"
          style={styles.headerButton}
          onPress={() => openSheet("options")}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </PressableScale>
      </View>

      <View style={styles.artArea}>
        <View style={styles.artShadow}>
          <AlbumArt track={{ ...currentTrack, thumbnail: artworkUri }} size={artSize} radius={8} iconSize={76} />
        </View>
      </View>

      <View style={[styles.controlsArea, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <View style={styles.trackHeading}>
          <View style={styles.trackText}>
            <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist_name || "Unknown Artist"}</Text>
          </View>
          <Animated.View style={likeStyle}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={liked ? "Remove from Liked Songs" : "Add to Liked Songs"}
              style={styles.likeButton}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
                triggerPulse(likeScale);
                toggleLike(currentTrack);
              }}
            >
              <Ionicons name={liked ? "heart" : "heart-outline"} size={27} color={liked ? colors.primary : colors.textSecondary} />
            </PressableScale>
          </Animated.View>
        </View>

        <View style={styles.scrubber}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(durationMillis, 1)}
            value={isSliding ? sliderValue : positionMillis}
            minimumTrackTintColor={colors.text}
            maximumTrackTintColor="rgba(255,255,255,0.28)"
            thumbTintColor={colors.text}
            onSlidingStart={() => {
              setSliderValue(positionMillis);
              setIsSliding(true);
            }}
            onValueChange={setSliderValue}
            onSlidingComplete={(value) => {
              setIsSliding(false);
              void seekTo(value);
            }}
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(isSliding ? sliderValue : positionMillis)}</Text>
            <Text style={styles.time}>-{formatTime(Math.max(0, durationMillis - (isSliding ? sliderValue : positionMillis)))}</Text>
          </View>
        </View>

        <View style={styles.transport}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Toggle shuffle"
            style={styles.sideControl}
            onPress={() => { haptic(); toggleShuffle(); }}
          >
            <Ionicons name="shuffle" size={23} color={shuffleEnabled ? colors.primary : colors.textSecondary} />
            {shuffleEnabled && <View style={styles.activeDot} />}
          </PressableScale>
          <Animated.View style={previousStyle}>
            <PressableScale accessibilityRole="button" accessibilityLabel="Previous track" style={styles.skipControl} onPress={handlePrevious}>
              <Ionicons name="play-skip-back" size={30} color={colors.text} />
            </PressableScale>
          </Animated.View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
            style={styles.playButton}
            pressedScale={0.94}
            onPress={handlePlayPause}
          >
            <Animated.View style={playStyle}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={31} color={colors.background} />
            </Animated.View>
          </PressableScale>
          <Animated.View style={nextStyle}>
            <PressableScale accessibilityRole="button" accessibilityLabel="Next track" style={styles.skipControl} onPress={handleNext}>
              <Ionicons name="play-skip-forward" size={30} color={colors.text} />
            </PressableScale>
          </Animated.View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Repeat ${repeatMode}`}
            style={styles.sideControl}
            onPress={() => { haptic(); cycleRepeat(); }}
          >
            <View>
              <Ionicons name="repeat" size={23} color={repeatMode === "off" ? colors.textSecondary : colors.primary} />
              {repeatMode === "one" && <View style={styles.repeatBadge}><Text style={styles.repeatBadgeText}>1</Text></View>}
            </View>
            {repeatMode !== "off" && <View style={styles.activeDot} />}
          </PressableScale>
        </View>

        <View style={styles.lowerActions}>
          <PressableScale accessibilityRole="button" accessibilityLabel="Open queue" style={styles.lowerAction} onPress={() => openSheet("queue")}>
            <Ionicons name="list-outline" size={21} color={colors.textSecondary} />
            <Text style={styles.lowerActionText}>Queue</Text>
          </PressableScale>
          <PressableScale accessibilityRole="button" accessibilityLabel="Open playback options" style={styles.lowerAction} onPress={() => openSheet("options")}>
            <Ionicons name="volume-medium-outline" size={21} color={colors.textSecondary} />
            <Text style={styles.lowerActionText}>Options</Text>
          </PressableScale>
        </View>
      </View>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={["54%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          {sheetView === "queue" ? (
            <>
              <View style={styles.sheetHeadingRow}>
                <Text style={styles.sheetTitle}>Queue</Text>
                <Text style={styles.queueCount}>{queue.length} tracks</Text>
              </View>
              {queue.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Ionicons name="musical-notes-outline" size={30} color={colors.textMuted} />
                  <Text style={styles.sheetMuted}>No tracks in the queue</Text>
                </View>
              ) : queue.map((track, index) => {
                const active = track.id === currentTrack.id;
                return (
                  <PressableScale
                    key={`${track.id}-${index}`}
                    style={styles.queueRow}
                    onPress={() => {
                      void playTrack(track, queue);
                      sheetRef.current?.close();
                    }}
                  >
                    <AlbumArt track={track} size={42} radius={4} iconSize={18} />
                    <View style={styles.queueTrackInfo}>
                      <Text numberOfLines={1} style={[styles.queueTrackTitle, active && styles.activeText]}>{track.title}</Text>
                      <Text numberOfLines={1} style={styles.queueArtist}>{track.artist_name || "Unknown Artist"}</Text>
                    </View>
                    {active && <Ionicons name="volume-high" size={18} color={colors.primary} />}
                  </PressableScale>
                );
              })}
            </>
          ) : (
            <>
              <Text style={styles.sheetTitle}>Playback options</Text>
              <TouchableOpacity style={styles.optionRow} activeOpacity={0.7} onPress={cyclePlaybackRate}>
                <Ionicons name="speedometer-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.optionLabel}>Playback speed</Text>
                <Text style={styles.optionValue}>{playbackRate}x</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.7}
                onPress={() => sleepTimerEnd ? cancelSleepTimer() : startSleepTimer(30)}
              >
                <Ionicons name="moon-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.optionLabel}>Sleep timer</Text>
                <Text style={styles.optionValue}>{timerLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionRow} activeOpacity={0.7} onPress={() => { sheetRef.current?.close(); navigation.navigate("Lyrics"); }}>
                <Ionicons name="document-text-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.optionLabel}>View lyrics</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  headerButton: { width: 42, height: 44, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  kicker: { color: colors.textSecondary, fontSize: 9, fontWeight: "700" },
  headerTitle: { color: colors.text, fontSize: 12, fontWeight: "600", marginTop: 3 },
  artArea: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  artShadow: { borderRadius: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.38, shadowRadius: 20, elevation: 14 },
  controlsArea: { paddingHorizontal: 25 },
  trackHeading: { minHeight: 57, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  trackText: { flex: 1, minWidth: 0, paddingRight: 12 },
  title: { color: colors.text, fontSize: 21, fontWeight: "800" },
  artist: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  likeButton: { width: 42, height: 46, alignItems: "center", justifyContent: "center" },
  scrubber: { marginBottom: 14 },
  slider: { width: "100%", height: 32, marginHorizontal: 0 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -2 },
  time: { color: colors.textSecondary, fontSize: 10, fontVariant: ["tabular-nums"] },
  transport: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 66 },
  sideControl: { width: 38, height: 48, alignItems: "center", justifyContent: "center" },
  skipControl: { width: 48, height: 52, alignItems: "center", justifyContent: "center" },
  playButton: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: colors.text },
  activeDot: { position: "absolute", bottom: 1, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  repeatBadge: { position: "absolute", right: -5, top: -4, width: 12, height: 12, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  repeatBadgeText: { color: colors.background, fontSize: 8, fontWeight: "800" },
  lowerActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  lowerAction: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 2 },
  lowerActionText: { color: colors.textSecondary, fontSize: 11, marginLeft: 6 },
  sheetBackground: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  sheetHandle: { backgroundColor: colors.textMuted, width: 38 },
  sheetContent: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 28 },
  sheetHeadingRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: 12 },
  queueCount: { color: colors.textSecondary, fontSize: 12 },
  queueRow: { height: 56, flexDirection: "row", alignItems: "center" },
  queueTrackInfo: { flex: 1, minWidth: 0, marginHorizontal: 10 },
  queueTrackTitle: { color: colors.text, fontSize: 13, fontWeight: "600" },
  queueArtist: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
  activeText: { color: colors.primary },
  sheetEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 34 },
  sheetMuted: { color: colors.textSecondary, fontSize: 13, marginTop: 10 },
  optionRow: { minHeight: 54, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  optionLabel: { flex: 1, color: colors.text, fontSize: 14, marginLeft: 14 },
  optionValue: { color: colors.textSecondary, fontSize: 13, marginRight: 4 },
});
