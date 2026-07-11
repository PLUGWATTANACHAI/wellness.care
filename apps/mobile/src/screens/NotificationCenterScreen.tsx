import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../design/theme";
import { getNotifications, markNotificationRead, type NotificationDto } from "../services/api";

type InboxRole = "customer" | "provider";

export function NotificationCenterScreen() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [role, setRole] = useState<InboxRole>("customer");
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "saving">("loading");

  function loadNotifications() {
    setStatus("loading");
    getNotifications(role)
      .then((items) => {
        setNotifications(items);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    loadNotifications();
  }, [role]);

  async function handleMarkRead(notificationId: string) {
    setStatus("saving");
    try {
      await markNotificationRead(notificationId, role);
      await getNotifications(role).then(setNotifications);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Notifications</Text>
      <Text style={styles.title}>{role === "customer" ? "กล่องข้อความลูกค้า" : "กล่องข้อความผู้ให้บริการ"}</Text>
      <Text style={styles.countText}>
        {unreadCount > 0 ? `${unreadCount} รายการยังไม่ได้อ่าน` : "ไม่มีข้อความใหม่"}
      </Text>
      <View style={styles.roleSwitch}>
        {(["customer", "provider"] as const).map((nextRole) => (
          <Pressable
            accessibilityRole="button"
            key={nextRole}
            disabled={status === "loading" || status === "saving"}
            onPress={() => setRole(nextRole)}
            style={({ pressed }) => [
              styles.roleChip,
              role === nextRole ? styles.roleChipActive : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={[styles.roleChipText, role === nextRole ? styles.roleChipTextActive : null]}>
              {nextRole === "customer" ? "Customer" : "Provider"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={status === "loading" || status === "saving"}
        onPress={loadNotifications}
        style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
      >
        <Text style={styles.buttonText}>{status === "loading" ? "กำลังโหลด..." : status === "saving" ? "กำลังบันทึก..." : "Refresh"}</Text>
      </Pressable>
      <View style={styles.list}>
        {notifications.map((notification) => (
          <View key={notification.id} style={[styles.item, !notification.readAt ? styles.itemUnread : null]}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{notification.title}</Text>
              {!notification.readAt ? <Text style={styles.unreadBadge}>ใหม่</Text> : null}
            </View>
            <Text style={styles.itemBody}>{notification.body}</Text>
            <Text style={styles.itemMeta}>{new Date(notification.createdAt).toLocaleString("th-TH")}</Text>
            {!notification.readAt ? (
              <Pressable
                accessibilityRole="button"
                disabled={status === "saving"}
                onPress={() => handleMarkRead(notification.id)}
                style={({ pressed }) => [styles.readButton, pressed ? styles.buttonPressed : null]}
              >
                <Text style={styles.readButtonText}>อ่านแล้ว</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {status === "ready" && notifications.length === 0 ? <Text style={styles.note}>ยังไม่มีการแจ้งเตือน</Text> : null}
        {status === "error" ? <Text style={styles.error}>โหลดการแจ้งเตือนไม่สำเร็จ</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
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
  countText: {
    color: colors.primary,
    fontWeight: "800",
  },
  roleSwitch: {
    flexDirection: "row",
    gap: 8,
  },
  roleChip: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingVertical: 9,
  },
  roleChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  roleChipText: {
    color: colors.textSoft,
    fontWeight: "800",
  },
  roleChipTextActive: {
    color: colors.primary,
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: colors.surface,
    fontWeight: "800",
  },
  list: {
    gap: 8,
  },
  item: {
    gap: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    padding: 10,
  },
  itemUnread: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  itemHeader: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: {
    flex: 1,
    color: colors.text,
    fontWeight: "800",
  },
  unreadBadge: {
    borderRadius: 8,
    backgroundColor: colors.primary,
    color: colors.surface,
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  itemBody: {
    color: colors.textSoft,
    lineHeight: 20,
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  note: {
    color: colors.textMuted,
  },
  readButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingVertical: 8,
  },
  readButtonText: {
    color: colors.primary,
    fontWeight: "800",
  },
  error: {
    color: "#b42318",
    fontWeight: "800",
  },
});
