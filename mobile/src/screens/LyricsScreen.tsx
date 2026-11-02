import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { colors, spacing } from "../theme/colors";
import { usePlaybackProgress, usePlayer } from "../context/PlayerContext";
import { getTrackTheme } from "../theme/dynamicTheme";
import PressableScale from "../components/PressableScale";
import { getEmbeddedLyrics } from "../services/localLibrary";

const { height } = Dimensions.get("window");

type LyricLine = {
  timeMs: number;
  text: string;
};

function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split("\n");
  const parsed: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1]!, 10);
      const seconds = parseInt(match[2]!, 10);
      const centis = match[3]!.length === 2 ? parseInt(match[3]!, 10) * 10 : parseInt(match[3]!, 10);
      const timeMs = minutes * 60000 + seconds * 1000 + centis;
      const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim();
      if (text) {
        parsed.push({ timeMs, text });
      }
    }
  }

  return parsed.sort((a, b) => a.timeMs - b.timeMs);
}

export default function LyricsScreen() {
  const navigation = useNavigation<any>();
  const { currentTrack, seekTo } = usePlayer();
  const { positionMillis } = usePlaybackProgress();
  const [syncedLines, setSyncedLines] = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const itemLayouts = useRef<{ [key: number]: number }>({});
  const activeIndexRef = useRef<number>(-1);

  const trackTheme = getTrackTheme(currentTrack);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSyncedLines([]);
    setPlainLyrics(null);
    activeIndexRef.current = -1;
    itemLayouts.current = {};

    if (!currentTrack) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const fetchLyrics = async () => {
      try {
        const embeddedLyrics = await getEmbeddedLyrics(currentTrack);
        if (!active) return;
        if (embeddedLyrics) {
          const parsed = parseLrc(embeddedLyrics);
          if (parsed.length > 0) {
            setSyncedLines(parsed);
          } else {
            setPlainLyrics(embeddedLyrics);
          }
          return;
        }

        const title = encodeURIComponent(currentTrack.title);
        const artist = encodeURIComponent(currentTrack.artist_name || "");

        const res = await fetch(`https://lrclib.net/api/get?track_name=${title}&artist_name=${artist}`);

        if (!res.ok) {
          if (res.status === 404) throw new Error("Lyrics not found for this track.");
          throw new Error("Could not fetch lyrics.");
        }

        const data = await res.json();
        if (!active) return;
        if (data.syncedLyrics) {
          const parsed = parseLrc(data.syncedLyrics);
          if (parsed.length > 0) {
            setSyncedLines(parsed);
          } else {
            setPlainLyrics(data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, ""));
          }
        } else if (data.plainLyrics) {
          setPlainLyrics(data.plainLyrics);
        } else {
          throw new Error("No lyrics available for this song.");
        }
      } catch (e: any) {
        if (active) setError(e.message ?? "Something went wrong fetching lyrics");
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchLyrics();
    return () => {
      active = false;
    };
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist_name]);

  // Find active line index based on current playback position
  let activeIndex = -1;
  if (syncedLines.length > 0) {
    for (let i = 0; i < syncedLines.length; i++) {
      if (positionMillis >= (syncedLines[i]?.timeMs ?? 0)) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  // Smoothly auto-scroll when active lyric line changes
  useEffect(() => {
    if (activeIndex !== -1 && activeIndex !== activeIndexRef.current) {
      activeIndexRef.current = activeIndex;
      const yOffset = itemLayouts.current[activeIndex];
      if (yOffset !== undefined && scrollRef.current) {
        scrollRef.current.scrollTo({
          y: Math.max(0, yOffset - height * 0.35),
          animated: true,
        });
      }
    }
  }, [activeIndex]);

  const handleLinePress = (timeMs: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    void seekTo(timeMs);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={trackTheme.gradient} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerKicker}>LYRICS</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>{currentTrack?.title}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={trackTheme.primary} />
              <Text style={styles.statusText}>Syncing lyrics...</Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.center}>
              <Ionicons name="musical-notes-outline" size={54} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={styles.statusText}>{error}</Text>
              <Text style={styles.subStatusText}>We couldn't locate synchronized lyrics for this file.</Text>
            </View>
          )}

          {!loading && syncedLines.length > 0 && (
            <View style={styles.syncedList}>
              {syncedLines.map((line, index) => {
                const isActive = index === activeIndex;
                const isPast = index < activeIndex;

                return (
                  <TouchableOpacity
                    key={`line-${index}`}
                    activeOpacity={0.75}
                    onPress={() => handleLinePress(line.timeMs)}
                    onLayout={(e) => {
                      itemLayouts.current[index] = e.nativeEvent.layout.y;
                    }}
                    style={[styles.lyricRow, isActive && styles.lyricRowActive]}
                  >
                    <Text
                      style={[
                        styles.lyricLine,
                        isActive && [styles.lyricActive, { color: colors.text }],
                        isPast && styles.lyricPast,
                      ]}
                    >
                      {line.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {!loading && plainLyrics && (
            <View style={styles.plainContainer}>
              <Text style={styles.plainLyricsText}>{plainLyrics}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
  headerKicker: { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  headerTitle: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 2 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 },
  center: { alignItems: "center", justifyContent: "center", marginTop: 100, paddingHorizontal: 30 },
  statusText: { color: colors.text, marginTop: 18, fontSize: 16, fontWeight: "700", textAlign: "center" },
  subStatusText: { color: colors.textSecondary, marginTop: 8, fontSize: 13, textAlign: "center" },
  syncedList: { paddingTop: 10 },
  lyricRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  lyricRowActive: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  lyricLine: {
    color: "rgba(255, 255, 255, 0.38)",
    fontSize: 22,
    lineHeight: 32,
    fontWeight: "700",
  },
  lyricActive: {
    fontSize: 26,
    lineHeight: 36,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  lyricPast: {
    color: "rgba(255, 255, 255, 0.55)",
  },
  plainContainer: { paddingTop: 20 },
  plainLyricsText: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 30,
    fontWeight: "600",
  },
});
