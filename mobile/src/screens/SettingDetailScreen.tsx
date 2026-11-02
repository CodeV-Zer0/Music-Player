import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ToastAndroid, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, spacing } from "../theme/colors";
import { useLibrary } from "../context/LibraryContext";
import { SETTINGS_PLAYER_KEY, SETTINGS_AUDIO_KEY } from "../context/PlayerContext";

export default function SettingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { category, title } = route.params;
  const { accessMode, status: libraryStatus, refreshing, requestFullAccess, selectMusicFolder } = useLibrary();

  const [settings, setSettings] = useState<Record<string, boolean>>({});

  const storageKey = (() => {
    if (category === "player") return SETTINGS_PLAYER_KEY;
    if (category === "audio") return SETTINGS_AUDIO_KEY;
    return `raga_settings_${category}`;
  })();

  const load = async () => {
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored) setSettings(JSON.parse(stored));
  };

  useEffect(() => { load(); }, [category]);

  const toggleSetting = async (key: string, defaultVal = false) => {
    const currentVal = settings[key] ?? defaultVal;
    const val = !currentVal;
    const newSettings = { ...settings, [key]: val };
    setSettings(newSettings);
    await AsyncStorage.setItem(storageKey, JSON.stringify(newSettings));
  };

  const renderContent = () => {
    switch (category) {
      case "ui":
        return (
          <>
            <SettingToggle label="Dark Theme (Pure Black)" value={settings.darkTheme ?? true} onToggle={() => toggleSetting("darkTheme", true)} />
            <SettingToggle label="Show Lyrics Tab" value={settings.showLyrics ?? true} onToggle={() => toggleSetting("showLyrics", true)} />
            <SettingToggle label="Show Download Status" value={settings.showDownload ?? true} onToggle={() => toggleSetting("showDownload", true)} />
          </>
        );
      case "player":
        return (
          <>
            <SettingRow
              label="Show visualizer on Now Playing"
              sub="Animated bars shown while music plays"
              value={settings.showVis ?? false}
              onToggle={() => toggleSetting("showVis", false)}
            />
            <SettingRow
              label="Disable idle screen timeout"
              sub="Screen stays on while music is playing"
              value={settings.disableTimeout ?? false}
              onToggle={() => toggleSetting("disableTimeout", false)}
            />
          </>
        );
      case "audio":
        return (
          <>
            <SettingRow
              label="Crossfade tracks (3s)"
              sub="Smooth transition between songs"
              value={settings.crossfade ?? false}
              onToggle={() => toggleSetting("crossfade", false)}
            />
            <SettingRow
              label="Audio Normalization"
              sub="Equalise volume across tracks"
              value={settings.normalization ?? true}
              onToggle={() => toggleSetting("normalization", true)}
            />
            <SettingRow
              label="Gapless Playback"
              sub="Remove silence between tracks"
              value={settings.gapless ?? true}
              onToggle={() => toggleSetting("gapless", true)}
            />
          </>
        );
      case "advanced":
        return (
          <>
            <View style={styles.accessStatus}>
              <Text style={styles.toggleLabel}>Music library access</Text>
              <Text style={styles.toggleSub}>
                Current: {accessMode === "full"
                  ? "Full library"
                  : accessMode === "folder"
                    ? "Selected folder"
                    : "Not configured"}
              </Text>
              {libraryStatus === "denied" || libraryStatus === "error" ? (
                <Text style={styles.accessWarning}>
                  {libraryStatus === "denied"
                    ? "Music access was not granted. Choose an access option below."
                    : "Could not update music access. Please try again."}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.accessBtn,
                (refreshing || libraryStatus === "loading") && styles.disabledBtn,
              ]}
              disabled={refreshing || libraryStatus === "loading"}
              onPress={() => void requestFullAccess()}
            >
              <Text style={styles.accessBtnText}>Grant full music access</Text>
              <Text style={styles.accessBtnSub}>Scan audio files across your device</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.accessBtn,
                (refreshing || libraryStatus === "loading") && styles.disabledBtn,
              ]}
              disabled={refreshing || libraryStatus === "loading"}
              onPress={() => void selectMusicFolder()}
            >
              <Text style={styles.accessBtnText}>Choose or change music folder</Text>
              <Text style={styles.accessBtnSub}>Limit access to a folder you select</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={async () => {
              await AsyncStorage.clear();
              if (Platform.OS === 'android') ToastAndroid.show("App data reset. Please restart the app.", ToastAndroid.LONG);
              else Alert.alert("Success", "App data reset. Please restart the app.");
            }}>
              <Text style={styles.actionBtnText}>Reset App Data & Cache</Text>
            </TouchableOpacity>
          </>
        );
      default:
        return <Text style={{ color: colors.textSecondary }}>No settings available.</Text>;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ label, sub, value, onToggle }: { label: string; sub?: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sub ? <Text style={styles.toggleSub}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: colors.primary, false: colors.surfaceElevated }} thumbColor={colors.text} />
    </View>
  );
}

// Alias for simple toggles
function SettingToggle({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return <SettingRow label={label} value={value} onToggle={onToggle} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  toggleLabel: { color: colors.text, fontSize: 16, fontWeight: "500" },
  toggleSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  actionBtn: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: "center",
    marginTop: spacing.md,
  },
  actionBtnText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
  accessStatus: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  accessWarning: { color: colors.danger, fontSize: 13, marginTop: spacing.xs },
  accessBtn: { alignItems: "flex-start" },
  accessBtnText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  accessBtnSub: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.xs },
  disabledBtn: { opacity: 0.5 },
});
