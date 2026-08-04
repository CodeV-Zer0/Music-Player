import React from "react";
import { Image, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";
import { Track } from "../context/PlayerContext";

type Props = {
  track?: Track | null;
  size: number;
  radius?: number;
  iconSize?: number;
  style?: ViewStyle;
};

export default function AlbumArt({ track, size, radius = 8, iconSize = 24, style }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }, style]}>
      {track?.thumbnail ? (
        <Image source={{ uri: track.thumbnail }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[colors.surfaceElevated, colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {!track?.thumbnail && (
        <Ionicons
          name={track?.source === "youtube" ? "logo-youtube" : "musical-note"}
          size={iconSize}
          color={track?.source === "youtube" ? colors.danger : colors.textSecondary}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.surfaceElevated,
  },
});
