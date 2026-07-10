import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, typography } from "../design/theme";

type ActionButtonVariant = "primary" | "secondary" | "location" | "dark";

export function ActionButton({
  children,
  disabled,
  onPress,
  variant = "primary",
}: {
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  variant?: ActionButtonVariant;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.text, variant === "secondary" ? styles.secondaryText : null, variant === "location" ? styles.locationText : null]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
  },
  location: {
    backgroundColor: colors.blueSoft,
  },
  dark: {
    backgroundColor: colors.text,
  },
  text: {
    ...typography.button,
    color: colors.surface,
  },
  secondaryText: {
    color: colors.green,
  },
  locationText: {
    color: colors.blue,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
  },
});
