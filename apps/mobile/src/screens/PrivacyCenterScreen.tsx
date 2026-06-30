import { StyleSheet, Text, View } from "react-native";

export function PrivacyCenterScreen() {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Privacy Center</Text>
      <Text style={styles.title}>Location and consent defaults</Text>
      <Text style={styles.row}>Raw location retention: 72 hours</Text>
      <Text style={styles.row}>Admin exact access: reason + 15 min grant</Text>
      <Text style={styles.row}>Customer tracking: active booking only</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f8fbfa",
  },
  label: {
    color: "#6d7875",
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: "#10231f",
    fontSize: 18,
    fontWeight: "800",
  },
  row: {
    color: "#10231f",
  },
});

