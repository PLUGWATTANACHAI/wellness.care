import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../design/theme";
import {
  createBookingCommunication,
  createBookingSupportRequest,
  getBookingCommunications,
  type BookingCommunicationDto,
} from "../services/api";

const pilotBookingId = "book_240618";

const fallbackMessages: BookingCommunicationDto[] = [
  {
    id: "comm_pilot_001",
    bookingId: pilotBookingId,
    actor: "ทีมดูแล Wellnest",
    actorRole: "admin",
    messageType: "support_note",
    visibility: "all_parties",
    body: "สวัสดีค่ะ พี่สามารถคุยกับทีมดูแลหรือผู้ให้บริการจาก booking นี้ได้ที่นี่",
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: "comm_pilot_002",
    bookingId: pilotBookingId,
    actor: "นิดา สุขสบาย",
    actorRole: "provider",
    messageType: "provider_message",
    visibility: "customer_provider",
    body: "รับทราบการจองแล้วค่ะ หากถึงคอนโดจะอัปเดตสถานะให้ค่ะ",
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
];

export function ChatCenterScreen() {
  const [messages, setMessages] = useState<BookingCommunicationDto[]>(fallbackMessages);
  const [messageText, setMessageText] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "sending" | "error">("loading");
  const [supportStatus, setSupportStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function loadMessages() {
    setStatus("loading");
    getBookingCommunications(pilotBookingId, "customer")
      .then((items) => {
        setMessages(items.length ? items : fallbackMessages);
        setStatus("ready");
      })
      .catch(() => {
        setMessages(fallbackMessages);
        setStatus("ready");
      });
  }

  useEffect(() => {
    loadMessages();
  }, []);

  async function handleSendMessage() {
    const body = messageText.trim();
    if (!body) return;

    setStatus("sending");
    try {
      const nextMessage = await createBookingCommunication(
        pilotBookingId,
        {
          body,
          messageType: "customer_message",
          visibility: "customer_provider",
        },
        "customer",
      );
      setMessages((currentMessages) => [...currentMessages, nextMessage]);
      setMessageText("");
      setStatus("ready");
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `comm_local_${Date.now()}`,
          bookingId: pilotBookingId,
          actor: "พี่",
          actorRole: "customer",
          messageType: "customer_message",
          visibility: "customer_provider",
          body,
          createdAt: new Date().toISOString(),
        },
      ]);
      setMessageText("");
      setStatus("ready");
    }
  }

  async function handleSupportRequest(reasonCode: "support_request" | "unsafe_message") {
    setSupportStatus("sending");
    try {
      const supportMessage = await createBookingSupportRequest(
        pilotBookingId,
        {
          body: reasonCode === "unsafe_message" ? "ต้องการแจ้งเรื่องความปลอดภัยจากหน้า Chat" : "ต้องการให้ทีมดูแลช่วยเหลือจากหน้า Chat",
          reasonCode,
        },
        "customer",
      );
      setMessages((currentMessages) => [...currentMessages, supportMessage]);
      setSupportStatus("sent");
    } catch {
      setSupportStatus("error");
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.label}>Wellnest Chat</Text>
          <Text style={styles.title}>แชทกับทีมดูแล</Text>
        </View>
        <Text style={styles.statusPill}>{status === "loading" ? "Syncing" : "Online"}</Text>
      </View>
      <Text style={styles.subtitle}>เชื่อมกับ booking communications หลังบ้าน และใช้เป็นช่องทาง support สำหรับลูกค้า</Text>
      <View style={styles.contextCard}>
        <Text style={styles.contextLabel}>Active booking</Text>
        <Text style={styles.contextTitle}>#WN-240618 · นวดคอ บ่า ไหล่ 90 นาที</Text>
        <Text style={styles.contextMeta}>ลูกค้า · ผู้ให้บริการ · ทีมดูแล เห็นข้อความตามสิทธิ์ที่กำหนด</Text>
      </View>
      <View style={styles.messageList}>
        {messages.map((message) => {
          const mine = message.actorRole === "customer";
          return (
            <View key={message.id} style={[styles.messageBubble, mine ? styles.messageBubbleMine : null]}>
              <Text style={[styles.messageActor, mine ? styles.messageTextMine : null]}>{formatActor(message.actorRole, message.actor)}</Text>
              <Text style={[styles.messageBody, mine ? styles.messageTextMine : null]}>{message.body}</Text>
              <Text style={[styles.messageMeta, mine ? styles.messageTextMineSoft : null]}>
                {new Date(message.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        multiline
        onChangeText={setMessageText}
        placeholder="พิมพ์ข้อความถึงทีมดูแลหรือผู้ให้บริการ"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={messageText}
      />
      <Pressable
        accessibilityRole="button"
        disabled={!messageText.trim() || status === "sending"}
        onPress={handleSendMessage}
        style={({ pressed }) => [styles.primaryButton, !messageText.trim() ? styles.buttonDisabled : null, pressed ? styles.buttonPressed : null]}
      >
        <Text style={styles.primaryButtonText}>{status === "sending" ? "กำลังส่ง..." : "ส่งข้อความ"}</Text>
      </Pressable>
      <View style={styles.supportRow}>
        <Pressable
          accessibilityRole="button"
          disabled={supportStatus === "sending"}
          onPress={() => handleSupportRequest("support_request")}
          style={({ pressed }) => [styles.supportButton, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.supportButtonText}>เรียกทีมดูแล</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={supportStatus === "sending"}
          onPress={() => handleSupportRequest("unsafe_message")}
          style={({ pressed }) => [styles.dangerButton, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.dangerButtonText}>แจ้งความปลอดภัย</Text>
        </Pressable>
      </View>
      {supportStatus === "sent" ? <Text style={styles.result}>ส่งเรื่องให้ทีมดูแลแล้ว</Text> : null}
      {supportStatus === "error" ? <Text style={styles.error}>ยังส่ง support request ไม่สำเร็จ แต่หน้าแชทยังใช้งานต่อได้</Text> : null}
    </View>
  );
}

function formatActor(actorRole: string, actor: string) {
  if (actorRole === "customer") return "พี่";
  if (actorRole === "provider") return "ผู้ให้บริการ";
  if (actorRole === "admin") return "ทีมดูแล";
  return actor;
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  statusPill: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.gold,
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  subtitle: {
    color: colors.textSoft,
    lineHeight: 20,
  },
  contextCard: {
    gap: 3,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    padding: 11,
  },
  contextLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  contextTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  contextMeta: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  messageList: {
    gap: 8,
  },
  messageBubble: {
    maxWidth: "92%",
    gap: 3,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    padding: 10,
  },
  messageBubbleMine: {
    alignSelf: "flex-end",
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  messageActor: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  messageBody: {
    color: colors.text,
    lineHeight: 20,
  },
  messageMeta: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
  },
  messageTextMine: {
    color: colors.surface,
  },
  messageTextMineSoft: {
    color: "rgba(255,255,255,0.72)",
  },
  input: {
    minHeight: 78,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 9,
    textAlignVertical: "top",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: "900",
  },
  supportRow: {
    flexDirection: "row",
    gap: 8,
  },
  supportButton: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingVertical: 10,
  },
  supportButtonText: {
    color: colors.primary,
    fontWeight: "900",
  },
  dangerButton: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1b5ad",
    borderRadius: 10,
    backgroundColor: colors.dangerSoft,
    paddingVertical: 10,
  },
  dangerButtonText: {
    color: colors.danger,
    fontWeight: "900",
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  result: {
    color: colors.primary,
    fontWeight: "900",
  },
  error: {
    color: colors.danger,
    fontWeight: "800",
  },
});
