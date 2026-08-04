import React, { useEffect, useState } from "react";
import { Alert, View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";
import { requestMediaPermission, scanLocalAudio, LocalTrack } from "../services/localLibrary";
import { useNavigation } from "@react-navigation/native";
import { usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";

export default function HomeScreen() {
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [status, setStatus] = useState<"loading" | "denied" | "ready">("loading");
  const { playTrack } = usePlayer();
  const navigation = useNavigation<any>();

  const loadLibrary = async () => {
    setStatus("loading");
    const granted = await requestMediaPermission();
    if (!granted) {
      setStatus("denied");
      return;
    }
    const found = await scanLocalAudio();
    setTracks(found);
    setStatus("ready");
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const renderHeader = () => {
    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";

    return (
      <View style={styles.headerContainer}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>Raga neon</Text>
            <Text style={styles.headerTitle}>{greeting}</Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity
              hitSlop={10}
              style={styles.topBarButton}
              onPress={() => Alert.alert("Notifications", "You are all caught up.")}
            >
              <Ionicons name="notifications-outline" size={21} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={10}
              style={styles.topBarButton}
              onPress={() => Alert.alert("Recently played", "Recently played songs will appear here.")}
            >
              <Ionicons name="time-outline" size={21} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={10}
              style={styles.topBarButton}
              onPress={() => navigation.navigate("Settings")}
            >
              <Ionicons name="settings-outline" size={21} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>Offline ready</Text>
            <Text style={styles.heroTitle}>Your sound grid is live</Text>
            <Text style={styles.heroSub}>{tracks.length} local tracks scanned and ready to play.</Text>
          </View>
          <View style={styles.visualizer}>
            {[24, 42, 30, 54, 36].map((height, index) => (
              <View key={index} style={[styles.visualizerBar, { height }]} />
            ))}
          </View>
        </View>

        <View style={styles.quickRow}>
          <View style={styles.quickChip}>
            <Ionicons name="flash" size={14} color={colors.primary} />
            <Text style={styles.quickText}>Dynamic mix</Text>
          </View>
          <View style={styles.quickChip}>
            <Ionicons name="cloud-offline" size={14} color={colors.success} />
            <Text style={styles.quickText}>Airplane mode</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1 }}>
        {status === "loading" && <Text style={styles.empty}>Scanning your phone for music…</Text>}

        {status === "denied" && (
          <View style={styles.center}>
            <Text style={styles.empty}>
              Raga needs permission to access your device's audio files to show your library.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadLibrary}>
              <Text style={styles.retryText}>Grant permission</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "ready" && tracks.length === 0 && (
          <Text style={styles.empty}>No audio files found on this device.</Text>
        )}

        {status === "ready" && tracks.length > 0 && (
          <FlatList
            ListHeaderComponent={renderHeader}
            data={tracks}
            keyExtractor={(t) => t.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TrackRow track={item} onPress={() => playTrack(item, tracks)} />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerContainer: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 3 },
  headerTitle: { color: colors.text, fontSize: 28, fontWeight: "900" },
  topBarRight: { flexDirection: "row", alignItems: "center" },
  topBarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  heroCard: {
    minHeight: 148,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "flex-end",
    shadowColor: colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  heroGlow: {
    position: "absolute",
    right: -44,
    top: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: colors.glowPink,
  },
  heroCopy: { flex: 1, paddingRight: spacing.md },
  heroKicker: { color: colors.primary, fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 8 },
  heroTitle: { color: colors.text, fontSize: 24, fontWeight: "900", lineHeight: 29 },
  heroSub: { color: colors.textSecondary, fontSize: 13, marginTop: 8, lineHeight: 18 },
  visualizer: { width: 78, height: 70, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  visualizerBar: { width: 9, borderRadius: 8, backgroundColor: colors.primary },
  quickRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  quickText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  empty: { color: colors.textSecondary, padding: spacing.md, textAlign: "center", marginTop: 40 },
  center: { alignItems: "center", justifyContent: "center", padding: spacing.lg, flex: 1 },
  retryButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: spacing.md },
  retryText: { color: colors.background, fontWeight: "bold", fontSize: 16 },
  listContent: { paddingBottom: 150 },
});
