import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";

function SettingRow({
  icon, label, subtitle, onPress, rightEl,
}: {
  icon: any; label: string; subtitle?: string;
  onPress?: () => void; rightEl?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {rightEl ?? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <SectionHeader title="APPEARANCE" />
        <SettingRow
          icon="color-palette-outline"
          label="User Interface"
          subtitle="Customize UI, Tabs, Styles etc."
          onPress={() => navigation.navigate("SettingDetail", { category: "ui", title: "User Interface" })}
        />
        <SettingRow
          icon="phone-portrait-outline"
          label="Full Player"
          subtitle="Customize Now Playing Screen"
          onPress={() => navigation.navigate("SettingDetail", { category: "player", title: "Full Player" })}
        />

        <SectionHeader title="AUDIO" />
        <SettingRow
          icon="volume-high-outline"
          label="Audio"
          subtitle="Change Audio Settings"
          onPress={() => navigation.navigate("SettingDetail", { category: "audio", title: "Audio Settings" })}
        />

        <SectionHeader title="OTHER" />
        <SettingRow
          icon="options-outline"
          label="Advanced"
          subtitle="Advanced Options & Features"
          onPress={() => navigation.navigate("SettingDetail", { category: "advanced", title: "Advanced Settings" })}
        />
        <SettingRow
          icon="information-circle-outline"
          label="About Raga"
          subtitle="Version 1.0.0"
          onPress={() => Alert.alert("About", "Raga Music Player v1.0.0\nBuilt with Expo & React Native.")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  sectionHeader: {
    color: colors.textSecondary, fontSize: 13, fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  rowIcon: {
    width: 24, height: 24,
    alignItems: "center", justifyContent: "center", marginRight: spacing.md,
  },
  rowText: { flex: 1 },
  rowLabel: { color: colors.text, fontSize: 16, fontWeight: "500" },
  rowSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
});
