import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
      <Text style={styles.title}>{role === "customer" ? "Customer inbox" : "Provider inbox"}</Text>
      <Text style={styles.countText}>
        {unreadCount > 0 ? `${unreadCount} unread update(s)` : "All caught up"}
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
        <Text style={styles.buttonText}>{status === "loading" ? "Loading..." : status === "saving" ? "Saving..." : "Refresh"}</Text>
      </Pressable>
      <View style={styles.list}>
        {notifications.map((notification) => (
          <View key={notification.id} style={[styles.item, !notification.readAt ? styles.itemUnread : null]}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{notification.title}</Text>
              {!notification.readAt ? <Text style={styles.unreadBadge}>New</Text> : null}
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
                <Text style={styles.readButtonText}>Mark as read</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {status === "ready" && notifications.length === 0 ? <Text style={styles.note}>No notifications yet.</Text> : null}
        {status === "error" ? <Text style={styles.error}>Could not load notifications.</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#fff",
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
  countText: {
    color: "#087f5b",
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
    borderColor: "#d7e2df",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingVertical: 9,
  },
  roleChipActive: {
    borderColor: "#0793a4",
    backgroundColor: "#e7f7f4",
  },
  roleChipText: {
    color: "#50615d",
    fontWeight: "800",
  },
  roleChipTextActive: {
    color: "#0793a4",
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#0793a4",
    paddingVertical: 10,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
  list: {
    gap: 8,
  },
  item: {
    gap: 3,
    borderWidth: 1,
    borderColor: "#edf3f1",
    borderRadius: 8,
    backgroundColor: "#f8fbfa",
    padding: 10,
  },
  itemUnread: {
    borderColor: "#9bd5d8",
    backgroundColor: "#f1fbfb",
  },
  itemHeader: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: {
    flex: 1,
    color: "#10231f",
    fontWeight: "800",
  },
  unreadBadge: {
    borderRadius: 8,
    backgroundColor: "#0793a4",
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  itemBody: {
    color: "#50615d",
    lineHeight: 20,
  },
  itemMeta: {
    color: "#6d7875",
    fontSize: 12,
  },
  note: {
    color: "#6d7875",
  },
  readButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0793a4",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingVertical: 8,
  },
  readButtonText: {
    color: "#0793a4",
    fontWeight: "800",
  },
  error: {
    color: "#b42318",
    fontWeight: "800",
  },
});
