import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "../design/theme";

export function WellnestCard({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "soft" }) {
  return <View style={[styles.card, tone === "soft" ? styles.soft : null]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  soft: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
  },
});
