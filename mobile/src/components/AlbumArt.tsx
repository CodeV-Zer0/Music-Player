import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Track } from "../context/PlayerContext";
import { extractArtwork, getSystemArtworkUri, peekArtwork } from "../services/localLibrary";

type Props = {
  track?: Track | null;
  size: number;
  radius?: number;
  iconSize?: number;
  style?: ViewStyle;
};

function AlbumArt({ track, size, radius = 8, iconSize, style }: Props) {
  const fallbackUri = useMemo(() => {
    if (!track) return undefined;
    return track.thumbnail || peekArtwork(track.id) || getSystemArtworkUri(track);
  }, [track]);
  const [artwork, setArtwork] = useState<string | undefined>(fallbackUri);
  const [failedUri, setFailedUri] = useState<string>();

  useEffect(() => {
    setArtwork(fallbackUri);
    setFailedUri(undefined);
    if (!track || track.source === "youtube" || fallbackUri?.startsWith("http")) return;

    let active = true;
    if (!fallbackUri) {
      void extractArtwork(track).then((uri) => {
        if (active && uri) setArtwork(uri);
      });
    }
    return () => {
      active = false;
    };
  }, [track, fallbackUri]);

  const shown = artwork && artwork !== failedUri ? artwork : undefined;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }, style]}>
      {shown ? (
        <Image
          source={{ uri: shown }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={() => {
            setFailedUri(shown);
            if (track && track.source !== "youtube") {
              void extractArtwork(track).then((uri) => {
                if (uri) setArtwork(uri);
              });
            }
          }}
        />
      ) : track ? (
        <Ionicons name="musical-note" size={iconSize ?? Math.max(16, Math.round(size * 0.34))} color="#454545" />
      ) : null}
    </View>
  );
}

export default React.memo(AlbumArt, (prev, next) => (
  prev.size === next.size &&
  prev.radius === next.radius &&
  prev.track?.id === next.track?.id &&
  prev.track?.thumbnail === next.track?.thumbnail
));

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#090909",
  },
});
