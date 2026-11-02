import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  isPlaying: boolean;
  color?: string;
  barCount?: number;
  height?: number;
  style?: ViewStyle;
};

export default function Visualizer({
  isPlaying,
  color = colors.primary,
  barCount = 24,
  height = 42,
  style,
}: Props) {
  const bars = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.12))
  ).current;

  useEffect(() => {
    const animations = bars.map((bar, i) => {
      // Create organic wave patterns with varying frequency and heights
      const centerFactor = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
      const maxHeight = 0.35 + Math.random() * 0.65 * (0.6 + centerFactor * 0.4);
      const minHeight = 0.08 + Math.random() * 0.15;
      const duration = 280 + Math.random() * 320;
      const delay = (i % 6) * 45;

      return Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: maxHeight,
            duration,
            delay,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: minHeight,
            duration: duration * 1.1,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
    });

    if (isPlaying) {
      animations.forEach((a) => a.start());
    } else {
      bars.forEach((bar) => {
        Animated.timing(bar, {
          toValue: 0.1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    }

    return () => animations.forEach((a) => a.stop());
  }, [isPlaying, barCount]);

  return (
    <View style={[styles.container, { height }, style]}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 8,
  },
  bar: {
    width: 3.2,
    height: "100%",
    borderRadius: 2,
    opacity: 0.9,
  },
});
