import { StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../design/theme";

export function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.sectionLabel,
    color: colors.textMuted,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
});
