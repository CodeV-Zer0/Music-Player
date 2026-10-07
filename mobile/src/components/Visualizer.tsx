import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { colors } from "../theme/colors";

const BAR_COUNT = 20;

export default function Visualizer({ isPlaying }: { isPlaying: boolean }) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.1))
  ).current;

  useEffect(() => {
    const animations = bars.map((bar, i) => {
      const duration = 350 + Math.random() * 350;
      const delay = i * 30;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 0.2 + Math.random() * 0.8,
            duration,
            delay,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.05 + Math.random() * 0.3,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    });

    if (isPlaying) {
      animations.forEach(a => a.start());
    } else {
      // Settle to a flat low line when paused
      bars.forEach(bar =>
        Animated.timing(bar, { toValue: 0.08, duration: 400, useNativeDriver: true }).start()
      );
    }

    return () => animations.forEach(a => a.stop());
  }, [isPlaying]);

  return (
    <View style={styles.container}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
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
    height: 48,
    gap: 3,
    paddingHorizontal: 8,
  },
  bar: {
    width: 3,
    height: 40,
    borderRadius: 2,
    backgroundColor: colors.primary,
    opacity: 0.85,
  },
});
