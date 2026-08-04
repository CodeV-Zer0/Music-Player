import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView } from "react-native";
import { useRoute } from "@react-navigation/native";
import { colors, spacing } from "../theme/colors";
import { requestMediaPermission, scanLocalAudio, LocalTrack } from "../services/localLibrary";
import { usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";

export default function ArtistScreen() {
  const route = useRoute<any>();
  const { artistName } = route.params;
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const { playTrack } = usePlayer();

  useEffect(() => {
    requestMediaPermission().then((granted) => {
      if (!granted) return;
      scanLocalAudio().then((all) => {
        setTracks(all.filter((t) => (t.artist_name || "Unknown Artist") === artistName));
      });
    });
  }, [artistName]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{artistName}</Text>
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TrackRow track={item} onPress={() => playTrack(item, tracks)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", padding: spacing.md },
});
