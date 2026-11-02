import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ListRenderItemInfo } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetScrollView } from "@gorhom/bottom-sheet";
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
import { Track, usePlaybackProgress, usePlayer } from "../context/PlayerContext";
import { colors, spacing } from "../theme/colors";
import AlbumArt from "../components/AlbumArt";
import PressableScale from "../components/PressableScale";
import Visualizer from "../components/Visualizer";
import { getTrackTheme } from "../theme/dynamicTheme";

const { width, height } = Dimensions.get("window");
const artSize = Math.min(width - 56, height * 0.40, 340);
const queueKeyExtractor = (track: Track, index: number) => `${track.id}-${index}`;

type SheetView = "queue" | "options";

function formatTime(millis: number) {
  const seconds = Math.floor(Math.max(0, millis) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function NowPlayingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { positionMillis, durationMillis } = usePlaybackProgress();
  const {
    currentTrack,
    isLoading,
    isPlaying,
    queue,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    playTrack,
    moveQueueItem,
    isLiked,
    toggleLike,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
    startSleepTimer,
    cancelSleepTimer,
    sleepTimerEnd,
    shuffleEnabled,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    showVisualizer,
  } = usePlayer();

  const sheetRef = useRef<BottomSheet>(null);
  const [sheetView, setSheetView] = useState<SheetView>("queue");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [visEnabled, setVisEnabled] = useState(showVisualizer);

  const playScale = useSharedValue(1);
  const likeScale = useSharedValue(1);
  const previousScale = useSharedValue(1);
  const nextScale = useSharedValue(1);

  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: playScale.value }] }));
  const likeStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));
  const previousStyle = useAnimatedStyle(() => ({ transform: [{ scale: previousScale.value }] }));
  const nextStyle = useAnimatedStyle(() => ({ transform: [{ scale: nextScale.value }] }));

  const trackTheme = getTrackTheme(currentTrack);

  const handleQueueTrack = useCallback((track: Track) => {
    void playTrack(track);
    sheetRef.current?.close();
  }, [playTrack]);
  const currentQueueIndex = queue.findIndex((track) => track.id === currentTrack?.id);

  const renderQueueItem = useCallback(({ item, index }: ListRenderItemInfo<Track>) => {
    const active = item.id === currentTrack?.id;
    const cannotMoveUp = active || index === 0 || index - 1 === currentQueueIndex;
    const cannotMoveDown = active || index === queue.length - 1 || index + 1 === currentQueueIndex;
    return (
      <View style={[styles.queueRow, active && styles.queueRowActive]}>
        <PressableScale
          style={styles.queueTrackButton}
          onPress={() => handleQueueTrack(item)}
        >
          <AlbumArt track={item} size={42} radius={4} iconSize={18} />
          <View style={styles.queueTrackInfo}>
            <Text numberOfLines={1} style={[styles.queueTrackTitle, active && { color: trackTheme.primary }]}>
              {item.title}
            </Text>
            <Text numberOfLines={1} style={styles.queueArtist}>{item.artist_name || "Unknown Artist"}</Text>
          </View>
          {active && <Ionicons name="volume-high" size={20} color={trackTheme.primary} />}
        </PressableScale>
        <View style={styles.queueReorder}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Move ${item.title} up in queue`}
            disabled={cannotMoveUp}
            hitSlop={6}
            onPress={() => moveQueueItem(index, index - 1)}
            style={styles.queueReorderButton}
          >
            <Ionicons
              name="chevron-up"
              size={19}
              color={cannotMoveUp ? colors.textMuted : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Move ${item.title} down in queue`}
            disabled={cannotMoveDown}
            hitSlop={6}
            onPress={() => moveQueueItem(index, index + 1)}
            style={styles.queueReorderButton}
          >
            <Ionicons
              name="chevron-down"
              size={19}
              color={cannotMoveDown ? colors.textMuted : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [currentQueueIndex, currentTrack?.id, handleQueueTrack, moveQueueItem, queue.length, trackTheme.primary]);

  const queueHeader = useMemo(() => (
    <View style={styles.queueHeader}>
      <View>
        <Text style={[styles.sheetTitle, styles.queueHeaderTitle]}>Up next</Text>
        <Text style={styles.queueHint}>Use the arrows to change the listening order.</Text>
      </View>
      <Text style={styles.queueCount}>{queue.length} tracks</Text>
    </View>
  ), [queue.length]);

  useEffect(() => {
    setVisEnabled(showVisualizer);
  }, [showVisualizer]);

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
    setIsSheetOpen(true);
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
      {/* Dynamic Ambient Background Gradient */}
      <LinearGradient
        colors={trackTheme.gradient}
        locations={[0, 0.52, 1]}
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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentTrack.source === "youtube" ? "Online Stream" : "Local Audio"}
          </Text>
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

      {/* Dynamic Album Art with Ambient Glow */}
      <View style={styles.artArea}>
        <View style={[styles.artShadow, { shadowColor: trackTheme.primary }]}>
          <AlbumArt track={currentTrack} size={artSize} radius={10} />
        </View>
      </View>

      {/* Dynamic Animated Visualizer */}
      {visEnabled && (
        <View style={styles.visualizerWrap}>
          <Visualizer isPlaying={isPlaying} color={trackTheme.primary} barCount={26} height={34} />
        </View>
      )}

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
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={27}
                color={liked ? trackTheme.primary : colors.textSecondary}
              />
            </PressableScale>
          </Animated.View>
        </View>

        {!isSheetOpen && (
          <View style={styles.scrubber}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={Math.max(durationMillis, 1)}
              value={isSliding ? sliderValue : positionMillis}
              minimumTrackTintColor={trackTheme.primary}
              maximumTrackTintColor="rgba(255,255,255,0.22)"
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
        )}

        <View style={styles.transport}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Toggle shuffle"
            style={styles.sideControl}
            onPress={() => { haptic(); toggleShuffle(); }}
          >
            <Ionicons name="shuffle" size={23} color={shuffleEnabled ? trackTheme.primary : colors.textSecondary} />
            {shuffleEnabled && <View style={[styles.activeDot, { backgroundColor: trackTheme.primary }]} />}
          </PressableScale>
          <Animated.View style={previousStyle}>
            <PressableScale accessibilityRole="button" accessibilityLabel="Previous track" style={styles.skipControl} onPress={handlePrevious}>
              <Ionicons name="play-skip-back" size={30} color={colors.text} />
            </PressableScale>
          </Animated.View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={isLoading ? "Loading track" : isPlaying ? "Pause" : "Play"}
            style={[styles.playButton, { backgroundColor: trackTheme.primary }]}
            pressedScale={0.94}
            onPress={handlePlayPause}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Animated.View style={playStyle}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={31} color="#000000" />
              </Animated.View>
            )}
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
              <Ionicons name="repeat" size={23} color={repeatMode === "off" ? colors.textSecondary : trackTheme.primary} />
              {repeatMode === "one" && (
                <View style={[styles.repeatBadge, { backgroundColor: trackTheme.primary }]}>
                  <Text style={styles.repeatBadgeText}>1</Text>
                </View>
              )}
            </View>
            {repeatMode !== "off" && <View style={[styles.activeDot, { backgroundColor: trackTheme.primary }]} />}
          </PressableScale>
        </View>

        <View style={styles.lowerActions}>
          <PressableScale accessibilityRole="button" accessibilityLabel="Open queue" style={styles.lowerAction} onPress={() => openSheet("queue")}>
            <Ionicons name="list-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.lowerActionText}>Queue ({queue.length})</Text>
          </PressableScale>
          <PressableScale accessibilityRole="button" accessibilityLabel="Lyrics" style={styles.lowerAction} onPress={() => navigation.navigate("Lyrics")}>
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.lowerActionText}>Lyrics</Text>
          </PressableScale>
          <PressableScale accessibilityRole="button" accessibilityLabel="Open playback options" style={styles.lowerAction} onPress={() => openSheet("options")}>
            <Ionicons name="options-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.lowerActionText}>Options</Text>
          </PressableScale>
        </View>
      </View>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={["56%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        onChange={(index) => setIsSheetOpen(index >= 0)}
      >
        {sheetView === "queue" ? (
          <BottomSheetFlatList
            data={queue}
            keyExtractor={queueKeyExtractor}
            renderItem={renderQueueItem}
            ListHeaderComponent={queueHeader}
            ListEmptyComponent={
              <View style={styles.sheetEmpty}>
                <Ionicons name="musical-notes-outline" size={30} color={colors.textMuted} />
                <Text style={styles.sheetMuted}>No tracks in the queue</Text>
              </View>
            }
            contentContainerStyle={styles.sheetContent}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews
          />
        ) : (
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
              <Text style={styles.sheetTitle}>Playback options</Text>
              <TouchableOpacity style={styles.optionRow} activeOpacity={0.7} onPress={cyclePlaybackRate}>
                <Ionicons name="speedometer-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.optionLabel}>Playback speed</Text>
                <Text style={styles.optionValue}>{playbackRate}x</Text>
              </TouchableOpacity>
              <View style={styles.volumeRow}>
                <Ionicons name={volume === 0 ? "volume-mute-outline" : "volume-high-outline"} size={22} color={colors.textSecondary} />
                <Text style={styles.optionLabel}>Volume</Text>
                <Slider
                  style={styles.volumeSlider}
                  minimumValue={0}
                  maximumValue={1}
                  value={volume}
                  onValueChange={(value) => { void setVolume(value); }}
                  minimumTrackTintColor={trackTheme.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.text}
                  accessibilityLabel="Volume"
                />
                <Text style={styles.volumeValue}>{Math.round(volume * 100)}%</Text>
              </View>
              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.7}
                onPress={() => setVisEnabled(!visEnabled)}
              >
                <Ionicons name="pulse-outline" size={22} color={visEnabled ? trackTheme.primary : colors.textSecondary} />
                <Text style={styles.optionLabel}>Audio visualizer</Text>
                <Text style={[styles.optionValue, visEnabled && { color: trackTheme.primary, fontWeight: "700" }]}>
                  {visEnabled ? "Enabled" : "Off"}
                </Text>
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
          </BottomSheetScrollView>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  headerButton: { width: 42, height: 44, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  kicker: { color: colors.textSecondary, fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  headerTitle: { color: colors.text, fontSize: 12, fontWeight: "600", marginTop: 3 },
  artArea: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  artShadow: {
    borderRadius: 10,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
    elevation: 20,
  },
  visualizerWrap: {
    height: 38,
    justifyContent: "center",
    marginBottom: 8,
  },
  controlsArea: { paddingHorizontal: 24 },
  trackHeading: { minHeight: 56, flexDirection: "row", alignItems: "center", marginBottom: 8 },
  trackText: { flex: 1, minWidth: 0, paddingRight: 12 },
  title: { color: colors.text, fontSize: 21, fontWeight: "700", fontFamily: "sans-serif-medium" },
  artist: { color: colors.textSecondary, fontSize: 14, marginTop: 4, fontFamily: "sans-serif" },
  likeButton: { width: 42, height: 46, alignItems: "center", justifyContent: "center" },
  scrubber: { marginBottom: 12 },
  slider: { width: "100%", height: 32, marginHorizontal: 0 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -2 },
  time: { color: colors.textSecondary, fontSize: 10, fontVariant: ["tabular-nums"] },
  transport: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 66 },
  sideControl: { width: 38, height: 48, alignItems: "center", justifyContent: "center" },
  skipControl: { width: 48, height: 52, alignItems: "center", justifyContent: "center" },
  playButton: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  activeDot: { position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: 2 },
  repeatBadge: { position: "absolute", right: -5, top: -4, width: 12, height: 12, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  repeatBadgeText: { color: "#000000", fontSize: 8, fontWeight: "800" },
  lowerActions: { flexDirection: "row", justifyContent: "space-around", marginTop: 14, paddingTop: 4 },
  lowerAction: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 8 },
  lowerActionText: { color: colors.textSecondary, fontSize: 11, marginLeft: 6, fontWeight: "600" },
  sheetBackground: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetHandle: { backgroundColor: colors.textMuted, width: 38 },
  sheetContent: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 28 },
  sheetHeadingRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 12 },
  queueCount: { color: colors.textSecondary, fontSize: 12 },
  queueHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  queueHeaderTitle: { marginBottom: 2, fontFamily: "sans-serif-medium" },
  queueHint: { color: colors.textMuted, fontSize: 11, fontFamily: "sans-serif" },
  queueRow: { minHeight: 62, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, borderRadius: 10 },
  queueRowActive: { backgroundColor: "rgba(255,255,255,0.06)" },
  queueTrackButton: { flex: 1, minWidth: 0, height: 58, flexDirection: "row", alignItems: "center" },
  queueTrackInfo: { flex: 1, minWidth: 0, marginHorizontal: 10 },
  queueTrackTitle: { color: colors.text, fontSize: 13, fontWeight: "600", fontFamily: "sans-serif" },
  queueArtist: { color: colors.textSecondary, fontSize: 11, marginTop: 3, fontFamily: "sans-serif" },
  queueReorder: { alignItems: "center", justifyContent: "center", marginLeft: 8 },
  queueReorderButton: { width: 30, height: 26, alignItems: "center", justifyContent: "center" },
  sheetEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 34 },
  sheetMuted: { color: colors.textSecondary, fontSize: 13, marginTop: 10 },
  optionRow: { minHeight: 54, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  optionLabel: { flex: 1, color: colors.text, fontSize: 14, marginLeft: 14 },
  optionValue: { color: colors.textSecondary, fontSize: 13, marginRight: 4 },
  volumeRow: { minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  volumeSlider: { flex: 1, height: 36, marginHorizontal: 8 },
  volumeValue: { width: 34, textAlign: "right", color: colors.textSecondary, fontSize: 12, fontVariant: ["tabular-nums"] },
});
