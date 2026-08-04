import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing } from "../theme/colors";
import { usePlayer } from "../context/PlayerContext";

export default function LyricsScreen() {
  const navigation = useNavigation<any>();
  const { currentTrack } = usePlayer();
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTrack) return;
    setLoading(true);
    setError(null);
    setLyrics(null);

    const fetchLyrics = async () => {
      try {
        const title = encodeURIComponent(currentTrack.title);
        const artist = encodeURIComponent(currentTrack.artist_name || "");
        
        // LRCLIB API to get lyrics
        const res = await fetch(`https://lrclib.net/api/get?track_name=${title}&artist_name=${artist}`);
        
        if (!res.ok) {
          if (res.status === 404) throw new Error("Lyrics not found for this track.");
          throw new Error("Failed to fetch lyrics.");
        }
        
        const data = await res.json();
        if (data.syncedLyrics) {
          // Since we don't have a synced lyrics parser ready, just show the plain lyrics for now
          // A true synced lyrics engine would parse the [mm:ss.xx] tags and map them to positionMillis
          setLyrics(data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2}\]/g, ''));
        } else if (data.plainLyrics) {
          setLyrics(data.plainLyrics);
        } else {
          throw new Error("No lyrics available.");
        }
      } catch (e: any) {
        setError(e.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [currentTrack]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lyrics</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.statusText}>Searching for lyrics...</Text>
          </View>
        )}
        
        {error && !loading && (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.statusText}>{error}</Text>
          </View>
        )}

        {lyrics && !loading && (
          <Text style={styles.lyricsText}>{lyrics}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  headerTitle: { color: colors.text, fontSize: 14, fontWeight: "800", textTransform: "uppercase" },
  content: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, paddingBottom: 60 },
  center: { alignItems: "center", justifyContent: "center", marginTop: 80 },
  statusText: { color: colors.textSecondary, marginTop: 16, fontSize: 16, fontWeight: "600" },
  lyricsText: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 34,
    fontWeight: "700",
    textAlign: "center"
  },
});
