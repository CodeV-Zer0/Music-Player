import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/colors";

type Props = {
  status: "access_required" | "denied" | "error";
  onFullAccess: () => void;
  onSelectFolder: () => void;
  onRetry: () => void;
};

export default function LibraryAccessPrompt({
  status,
  onFullAccess,
  onSelectFolder,
  onRetry,
}: Props) {
  const message = status === "denied"
    ? "Music access was not granted. You can try again or choose a music folder instead."
    : status === "error"
      ? "The music library could not be loaded. Try again or choose a different access option."
      : "Choose how Raga can find music on your device.";

  return (
    <View style={styles.container}>
      <Ionicons name="musical-notes-outline" size={54} color={colors.primary} />
      <Text style={styles.title}>Choose music access</Text>
      <Text style={styles.description}>{message}</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={onFullAccess}>
        <Text style={styles.primaryText}>Allow full music library access</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onSelectFolder}>
        <Text style={styles.secondaryText}>Choose a music folder</Text>
      </TouchableOpacity>
      {status !== "access_required" && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.footnote}>
        Folder access is limited to the folder you select. Android does not offer a limited-access permission for audio.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 16 },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
  },
  primaryButton: {
    width: "100%",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  primaryText: { color: colors.background, fontSize: 14, fontWeight: "800" },
  secondaryButton: {
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 10,
  },
  secondaryText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  retryButton: { padding: 12, marginTop: 4 },
  retryText: { color: colors.primary, fontWeight: "700" },
  footnote: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 16,
  },
});
