import { TextInput, type TextInputProps, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../design/theme";

export function TextField(props: TextInputProps) {
  return <TextInput {...props} placeholderTextColor={colors.textMuted} style={[styles.input, props.style]} />;
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
