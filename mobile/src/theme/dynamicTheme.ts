import { Track } from "../context/PlayerContext";
import { colors } from "./colors";

export type TrackTheme = {
  primary: string;
  secondary: string;
  gradient: [string, string, string];
  glow: string;
};

// Curated Spotify-style vibrant atmospheric palettes
const PALETTES: Array<{ primary: string; secondary: string; darkTop: string; darkMid: string }> = [
  { primary: "#1DB954", secondary: "#1ED760", darkTop: "#0B1C10", darkMid: "#050A06" }, // Spotify Green
  { primary: "#8B5CF6", secondary: "#A78BFA", darkTop: "#10091C", darkMid: "#05030A" }, // Electric Violet
  { primary: "#EC4899", secondary: "#F472B6", darkTop: "#1A0711", darkMid: "#080309" }, // Neon Pink
  { primary: "#F59E0B", secondary: "#FBBF24", darkTop: "#1A1004", darkMid: "#090602" }, // Amber Glow
  { primary: "#06B6D4", secondary: "#22D3EE", darkTop: "#031418", darkMid: "#02080A" }, // Cyan Aqua
  { primary: "#EF4444", secondary: "#F87171", darkTop: "#190606", darkMid: "#080202" }, // Crimson Red
  { primary: "#3B82F6", secondary: "#60A5FA", darkTop: "#07101F", darkMid: "#03060C" }, // Royal Blue
  { primary: "#10B981", secondary: "#34D399", darkTop: "#05170F", darkMid: "#020805" }, // Emerald
  { primary: "#E11D48", secondary: "#FB7185", darkTop: "#19050A", darkMid: "#080203" }, // Rose
  { primary: "#6366F1", secondary: "#818CF8", darkTop: "#0B0B1C", darkMid: "#04040A" }, // Indigo
];

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTrackTheme(track?: Track | null): TrackTheme {
  if (!track) {
    return {
      primary: colors.primary,
      secondary: colors.primaryAlt,
      gradient: ["#101010", "#050505", colors.background],
      glow: "rgba(29, 185, 84, 0.35)",
    };
  }

  const seed = `${track.id}-${track.title}-${track.artist_name || ""}`;
  const index = stringHash(seed) % PALETTES.length;
  const palette = PALETTES[index] ?? PALETTES[0]!;

  return {
    primary: palette.primary,
    secondary: palette.secondary,
    gradient: [palette.darkTop, palette.darkMid, colors.background],
    glow: `${palette.primary}40`,
  };
}
