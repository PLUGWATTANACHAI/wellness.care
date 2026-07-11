import { StyleSheet, Text, View } from "react-native";
import { colors } from "../design/theme";

export function PrivacyCenterScreen() {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Privacy Center</Text>
      <Text style={styles.title}>ตำแหน่งและความยินยอม</Text>
      <Text style={styles.row}>เก็บ raw location: 72 ชั่วโมง</Text>
      <Text style={styles.row}>Admin ดูตำแหน่งละเอียด: ต้องมีเหตุผลและสิทธิ์ 15 นาที</Text>
      <Text style={styles.row}>ลูกค้าติดตามตำแหน่ง: เฉพาะ booking ที่ active เท่านั้น</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  row: {
    color: colors.text,
    lineHeight: 20,
  },
});
