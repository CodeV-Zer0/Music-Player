import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, spacing } from "../theme/colors";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error) {
    console.warn("App render failed", error);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>The player hit an unexpected error. You can keep using your library after a reload.</Text>
        <TouchableOpacity style={styles.button} onPress={() => this.setState({ hasError: false })}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 8 },
  body: { color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  button: { backgroundColor: colors.primary, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: colors.background, fontWeight: "800", fontSize: 16 },
});
