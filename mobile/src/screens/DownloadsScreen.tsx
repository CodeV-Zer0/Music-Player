import React from "react";
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing } from "../theme/colors";
import { usePlayer } from "../context/PlayerContext";
import TrackRow from "../components/TrackRow";

export default function DownloadsScreen() {
  const navigation = useNavigation<any>();
  const { downloads, playTrack } = usePlayer();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Downloads</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={downloads}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <TrackRow track={item} onPress={() => playTrack(item, downloads)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Downloads</Text>
            <Text style={styles.emptySub}>Tracks you download will appear here for offline listening.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  empty: { alignItems: "center", justifyContent: "center", marginTop: 60, paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "600", marginTop: 16 },
  emptySub: { color: colors.textSecondary, fontSize: 14, textAlign: "center", marginTop: 8 },
});
