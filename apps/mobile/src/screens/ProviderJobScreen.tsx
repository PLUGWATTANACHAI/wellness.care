import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../design/theme";
import {
  acceptProviderJob,
  checkProviderServiceRadius,
  createBookingCommunication,
  createBookingSupportRequest,
  getBookingCommunications,
  getBookingSupportCases,
  getProviderJobs,
  getProviderProfile,
  recordConsent,
  rejectProviderJob,
  sendProviderLocation,
  type BookingCommunicationDto,
  type BookingSupportCaseDto,
  type BookingListItemDto,
  type ProviderProfileDto,
  type ProviderLocationAcceptedDto,
  type ServiceRadiusCheckDto,
  updateProviderProfile,
  updateProviderJobStatus,
} from "../services/api";
import { requestCurrentCoordinates } from "../services/currentLocation";

export function ProviderJobScreen() {
  const [jobs, setJobs] = useState<BookingListItemDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "saving">("loading");
  const [locationConsentAccepted, setLocationConsentAccepted] = useState(false);
  const [locationResult, setLocationResult] = useState<ProviderLocationAcceptedDto | undefined>();
  const [radiusCheck, setRadiusCheck] = useState<ServiceRadiusCheckDto | undefined>();
  const [profile, setProfile] = useState<ProviderProfileDto | undefined>();
  const [communications, setCommunications] = useState<BookingCommunicationDto[]>([]);
  const [communicationText, setCommunicationText] = useState("");
  const [communicationStatus, setCommunicationStatus] = useState<"idle" | "loading" | "sending" | "error">("idle");
  const [supportRequestText, setSupportRequestText] = useState("");
  const [supportStatus, setSupportStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [supportCases, setSupportCases] = useState<BookingSupportCaseDto[]>([]);

  function loadJobs() {
    setStatus("loading");
    Promise.all([getProviderJobs(), getProviderProfile()])
      .then(([items, nextProfile]) => {
        setJobs(items);
        setProfile(nextProfile);
        if (items[0]?.id) {
          void loadCommunications(items[0].id);
          void loadSupportCases(items[0].id);
        } else {
          setCommunications([]);
          setCommunicationText("");
          setCommunicationStatus("idle");
          setSupportRequestText("");
          setSupportStatus("idle");
          setSupportCases([]);
        }
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    loadJobs();
  }, []);

  const topJob = jobs[0];

  async function handleAccept() {
    if (!topJob) return;

    setStatus("saving");
    try {
      await acceptProviderJob(topJob.id);
      await getProviderJobs().then(setJobs);
      await loadCommunications(topJob.id);
      await loadSupportCases(topJob.id);
      setRadiusCheck(undefined);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function handleReject() {
    if (!topJob) return;

    setStatus("saving");
    try {
      await rejectProviderJob(topJob.id);
      await getProviderJobs().then(setJobs);
      setRadiusCheck(undefined);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function handleOnTheWay() {
    if (!topJob) return;

    setStatus("saving");
    try {
      await updateProviderJobStatus(topJob.id, "provider_on_the_way");
      await getProviderJobs().then(setJobs);
      await loadCommunications(topJob.id);
      await loadSupportCases(topJob.id);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function handleLocationConsent() {
    setStatus("saving");
    try {
      await recordConsent("location_sharing", "provider_location_v1.0", "provider_job_screen", "provider");
      setLocationConsentAccepted(true);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function handleSendLocation() {
    if (!topJob || !locationConsentAccepted) return;

    setStatus("saving");
    try {
      const currentCoordinates = await requestCurrentCoordinates();
      if (!currentCoordinates) {
        setStatus("error");
        return;
      }

      const result = await sendProviderLocation(topJob.id, currentCoordinates);
      setLocationResult(result);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function handleCheckRadius() {
    if (!topJob) return;

    setStatus("saving");
    try {
      const result = await checkProviderServiceRadius(topJob.id);
      setRadiusCheck(result);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function handleSetOnlineStatus(onlineStatus: "online" | "offline" | "busy") {
    setStatus("saving");
    try {
      const nextProfile = await updateProviderProfile({ onlineStatus });
      setProfile(nextProfile);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function loadCommunications(bookingId: string) {
    setCommunicationStatus("loading");
    try {
      const items = await getBookingCommunications(bookingId, "provider");
      setCommunications(items);
      setCommunicationStatus("idle");
    } catch {
      setCommunications([]);
      setCommunicationStatus("error");
    }
  }

  async function loadSupportCases(bookingId: string) {
    try {
      const items = await getBookingSupportCases(bookingId, "provider");
      setSupportCases(items);
    } catch {
      setSupportCases([]);
    }
  }

  async function handleSendCommunication() {
    if (!topJob || !communicationText.trim()) return;

    setCommunicationStatus("sending");
    try {
      await createBookingCommunication(topJob.id, { body: communicationText.trim() }, "provider");
      setCommunicationText("");
      await loadCommunications(topJob.id);
    } catch {
      setCommunicationStatus("error");
    }
  }

  async function handleCreateSupportRequest(reasonCode: "support_request" | "unsafe_message") {
    if (!topJob || !supportRequestText.trim()) return;

    setSupportStatus("sending");
    try {
      await createBookingSupportRequest(
        topJob.id,
        {
          body: supportRequestText.trim(),
          reasonCode,
        },
        "provider",
      );
      setSupportRequestText("");
      setSupportStatus("sent");
      await loadSupportCases(topJob.id);
    } catch {
      setSupportStatus("error");
    }
  }

  const offerExpiresAt = topJob?.offerExpiresAt
    ? new Date(topJob.offerExpiresAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : undefined;
  const providerInitial = profile?.name?.slice(0, 1) || "W";

  return (
    <View style={styles.card}>
      <View style={styles.providerHero}>
        <View style={styles.providerHeroCopy}>
          <Text style={styles.label}>Provider workspace</Text>
          <Text style={styles.title}>{topJob ? `งาน ${topJob.code}` : "งานที่พร้อมให้รับ"}</Text>
          <Text style={styles.heroMeta}>
            {profile ? `${profile.name} · ${profile.rating.toFixed(1)}★ · ${formatOnlineStatus(profile.onlineStatus)}` : "กำลังโหลดข้อมูลผู้ให้บริการ"}
          </Text>
        </View>
        <Text style={styles.providerAvatar}>{providerInitial}</Text>
      </View>
      <View style={styles.metricGrid}>
        <View style={styles.metricTile}>
          <Text style={styles.metricLabel}>Jobs</Text>
          <Text style={styles.metricValue}>{jobs.length}</Text>
        </View>
        <View style={styles.metricTile}>
          <Text style={styles.metricLabel}>Area</Text>
          <Text style={styles.metricValue}>{profile ? `${(profile.serviceRadiusMeters / 1000).toFixed(1)} km` : "-"}</Text>
        </View>
        <View style={styles.metricTile}>
          <Text style={styles.metricLabel}>Location</Text>
          <Text style={styles.metricValue}>{locationConsentAccepted ? "On" : "Off"}</Text>
        </View>
      </View>
      <View style={styles.jobCard}>
        <View style={styles.jobCardHeader}>
          <View>
            <Text style={styles.sectionTitle}>งานล่าสุด</Text>
            <Text style={styles.jobTitle}>{topJob?.service ?? "ยังไม่มีงานใหม่"}</Text>
          </View>
          <View style={styles.offerBadge}>
            <Text style={styles.offerBadgeText}>{formatOfferStatus(topJob?.offerStatus)}</Text>
          </View>
        </View>
        <Text style={styles.row}>ลูกค้า: {topJob?.customer ?? "รอข้อมูลลูกค้า"}</Text>
        <Text style={styles.row}>สถานะงาน: {formatJobStatus(topJob?.status)}</Text>
        <Text style={styles.row}>{offerExpiresAt ? `รับงานก่อน ${offerExpiresAt}` : "เมื่อมีงานใหม่ ระบบจะแสดงเวลาหมดอายุของ offer"}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>บริการที่ทำได้</Text>
        <Text style={styles.row}>{profile?.skills?.length ? profile.skills.slice(0, 3).join(" · ") : "กำลังโหลด skill"}</Text>
        <Text style={styles.mutedRow}>{profile?.workingHours?.length ? profile.workingHours.slice(0, 2).join(" · ") : "กำลังโหลดเวลาทำงาน"}</Text>
      </View>
      <View style={styles.actions}>
        {(["online", "busy", "offline"] as const).map((onlineStatus) => (
          <Pressable
            accessibilityRole="button"
            key={onlineStatus}
            disabled={status === "saving"}
            onPress={() => handleSetOnlineStatus(onlineStatus)}
            style={({ pressed }) => [
              styles.statusChip,
              profile?.onlineStatus === onlineStatus ? styles.statusChipActive : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={[styles.statusChipText, profile?.onlineStatus === onlineStatus ? styles.statusChipTextActive : null]}>
              {onlineStatus}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={!topJob || status === "saving"}
          onPress={handleAccept}
          style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.buttonText}>รับงาน</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!topJob || status === "saving" || topJob.offerStatus !== "offered"}
          onPress={handleReject}
          style={({ pressed }) => [styles.rejectButton, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.rejectButtonText}>ปฏิเสธ</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!topJob || status === "saving"}
          onPress={handleOnTheWay}
          style={({ pressed }) => [styles.buttonSecondary, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.buttonSecondaryText}>{status === "saving" ? "กำลังบันทึก..." : "กำลังเดินทาง"}</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!topJob || status === "saving"}
        onPress={handleCheckRadius}
        style={({ pressed }) => [styles.radiusButton, pressed ? styles.buttonPressed : null]}
      >
        <Text style={styles.radiusButtonText}>
          {status === "saving" ? "กำลังตรวจ..." : "ตรวจพื้นที่ให้บริการ"}
        </Text>
      </Pressable>
      {radiusCheck ? (
        <Text style={radiusCheck.withinRadius ? styles.result : styles.warning}>
          {radiusCheck.withinRadius ? "อยู่ในพื้นที่ให้บริการ" : "อยู่นอกพื้นที่ให้บริการ"} · {(radiusCheck.distanceMeters / 1000).toFixed(2)} กม.
        </Text>
      ) : null}
      <View style={styles.locationCard}>
        <View>
          <Text style={styles.sectionTitle}>แชร์ตำแหน่งระหว่างเดินทาง</Text>
          <Text style={styles.mutedRow}>ลูกค้าจะเห็นตำแหน่งเฉพาะตอนมีงาน active และเก็บตาม retention policy</Text>
        </View>
        <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={status === "saving"}
          onPress={handleLocationConsent}
          style={({ pressed }) => [styles.buttonSecondary, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.buttonSecondaryText}>
            {locationConsentAccepted ? "ยินยอมแล้ว" : "อนุญาตตำแหน่ง"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!topJob || !locationConsentAccepted || status === "saving"}
          onPress={handleSendLocation}
          style={({ pressed }) => [
            styles.button,
            !locationConsentAccepted ? styles.buttonDisabled : null,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.buttonText}>ส่งตำแหน่ง</Text>
        </Pressable>
        </View>
      </View>
      {locationResult ? (
        <Text style={styles.result}>
          ลูกค้าเห็นตำแหน่งสำหรับงานนี้แล้ว · เก็บ {locationResult.retentionHours} ชม.
        </Text>
      ) : null}
      {topJob ? (
        <View style={styles.communicationBox}>
          <Text style={styles.sectionTitle}>ข้อความกับลูกค้า</Text>
          <Text style={styles.row}>
            {communicationStatus === "loading"
              ? "กำลังโหลดข้อความ..."
              : communications.length
                ? `${communications.length} ข้อความ`
                : "ยังไม่มีข้อความระหว่างลูกค้าและผู้ให้บริการ"}
          </Text>
          {communications.map((item) => (
            <View key={item.id} style={styles.communicationItem}>
              <Text style={styles.communicationMeta}>
                {formatCommunicationActor(item.actorRole)} · {new Date(item.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
              </Text>
              <Text style={styles.row}>{item.body}</Text>
            </View>
          ))}
          <TextInput
            multiline
            value={communicationText}
            onChangeText={setCommunicationText}
            placeholder="พิมพ์ข้อความถึงลูกค้า"
            placeholderTextColor={colors.textMuted}
            style={styles.messageInput}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!communicationText.trim() || communicationStatus === "sending"}
            onPress={handleSendCommunication}
            style={({ pressed }) => [
              styles.button,
              !communicationText.trim() ? styles.buttonDisabled : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonText}>{communicationStatus === "sending" ? "กำลังส่ง..." : "ส่งข้อความ"}</Text>
          </Pressable>
          {communicationStatus === "error" ? <Text style={styles.warning}>ยังใช้ข้อความไม่ได้ในขณะนี้</Text> : null}
          <View style={styles.supportBox}>
            <Text style={styles.sectionTitle}>ต้องการให้ทีมช่วยดูแล?</Text>
            <TextInput
              multiline
              value={supportRequestText}
              onChangeText={(text) => {
                setSupportRequestText(text);
                if (supportStatus === "sent" || supportStatus === "error") setSupportStatus("idle");
              }}
              placeholder="แจ้งทีมดูแลว่าเกิดอะไรขึ้น"
              placeholderTextColor={colors.textMuted}
              style={styles.messageInput}
            />
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={!supportRequestText.trim() || supportStatus === "sending"}
                onPress={() => handleCreateSupportRequest("support_request")}
                style={({ pressed }) => [
                  styles.buttonSecondary,
                  !supportRequestText.trim() ? styles.buttonDisabled : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.buttonSecondaryText}>ขอความช่วยเหลือ</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!supportRequestText.trim() || supportStatus === "sending"}
                onPress={() => handleCreateSupportRequest("unsafe_message")}
                style={({ pressed }) => [
                  styles.rejectButton,
                  !supportRequestText.trim() ? styles.buttonDisabled : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.rejectButtonText}>แจ้งความปลอดภัย</Text>
              </Pressable>
            </View>
            {supportStatus === "sent" ? <Text style={styles.result}>ส่งเรื่องให้ทีมดูแลแล้ว</Text> : null}
            {supportStatus === "error" ? <Text style={styles.warning}>ยังส่งเรื่องไม่ได้</Text> : null}
            {supportCases.length > 0 ? (
              <View style={styles.caseList}>
                {supportCases.map((supportCase) => (
                  <View key={supportCase.id} style={styles.caseItem}>
                    <Text style={styles.communicationMeta}>
                      {formatSupportReason(supportCase.reasonCode)} · {formatSupportStatus(supportCase.status)}
                    </Text>
                    <Text style={styles.row}>
                      {supportCase.status === "resolved" && supportCase.resolutionNote
                        ? supportCase.resolutionNote
                        : "ทีมดูแลรับเรื่องแล้ว"}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
      <Text style={styles.note}>งานและตำแหน่งเชื่อมกับ Supabase staging สำหรับรอบทดสอบนี้</Text>
    </View>
  );
}

function formatOnlineStatus(status?: ProviderProfileDto["onlineStatus"]) {
  if (status === "online") return "พร้อมรับงาน";
  if (status === "busy") return "กำลังให้บริการ";
  if (status === "offline") return "ปิดรับงาน";
  return "กำลังโหลด";
}

function formatOfferStatus(status?: BookingListItemDto["offerStatus"]) {
  if (status === "offered") return "รอรับงาน";
  if (status === "accepted") return "รับแล้ว";
  if (status === "rejected") return "ปฏิเสธ";
  if (status === "expired") return "หมดเวลา";
  return "ไม่มี offer";
}

function formatJobStatus(status?: BookingListItemDto["status"]) {
  const labels: Record<string, string> = {
    pending_payment: "รอชำระเงิน",
    payment_confirmed: "ชำระเงินแล้ว",
    confirmed: "ยืนยันแล้ว",
    provider_assigned: "มอบหมายงานแล้ว",
    provider_on_the_way: "กำลังเดินทาง",
    completed: "สำเร็จ",
  };

  return labels[status || ""] || status || "รอข้อมูล";
}

function formatCommunicationActor(actorRole: string) {
  if (actorRole === "customer") return "ลูกค้า";
  if (actorRole === "admin") return "ทีมดูแล";
  return "คุณ";
}

function formatSupportReason(reasonCode: BookingSupportCaseDto["reasonCode"]) {
  const labels: Record<BookingSupportCaseDto["reasonCode"], string> = {
    support_request: "ขอความช่วยเหลือ",
    unsafe_message: "แจ้งความปลอดภัย",
    arrival_issue: "ปัญหาการเดินทาง",
    payment_issue: "ปัญหาการชำระเงิน",
  };

  return labels[reasonCode];
}

function formatSupportStatus(status: BookingSupportCaseDto["status"]) {
  const labels: Record<BookingSupportCaseDto["status"], string> = {
    open: "รับเรื่องแล้ว",
    in_review: "กำลังตรวจสอบ",
    resolved: "แก้ไขแล้ว",
  };

  return labels[status];
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  providerHero: {
    minHeight: 132,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
    padding: 14,
  },
  providerHeroCopy: {
    flex: 1,
    gap: 5,
  },
  label: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  heroMeta: {
    color: "rgba(255,255,255,0.8)",
    lineHeight: 20,
  },
  providerAvatar: {
    overflow: "hidden",
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: colors.gold,
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 54,
    textAlign: "center",
  },
  metricGrid: {
    flexDirection: "row",
    gap: 8,
  },
  metricTile: {
    flex: 1,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  metricValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  jobCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    padding: 12,
  },
  jobCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  jobTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
  offerBadge: {
    borderRadius: 8,
    backgroundColor: colors.gold,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  offerBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  infoCard: {
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
  },
  locationCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    padding: 12,
  },
  row: {
    color: colors.text,
    lineHeight: 20,
  },
  mutedRow: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  note: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
  },
  buttonSecondary: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingVertical: 10,
  },
  rejectButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1b5ad",
    backgroundColor: "#fff7f5",
    paddingVertical: 10,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: colors.surface,
    fontWeight: "800",
  },
  buttonSecondaryText: {
    color: colors.primary,
    fontWeight: "800",
  },
  rejectButtonText: {
    color: "#b42318",
    fontWeight: "800",
  },
  result: {
    color: colors.primary,
    fontWeight: "800",
  },
  warning: {
    color: "#b42318",
    fontWeight: "800",
  },
  radiusButton: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: colors.text,
    paddingVertical: 10,
  },
  radiusButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  statusChip: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingVertical: 8,
  },
  statusChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  statusChipText: {
    color: colors.textSoft,
    fontWeight: "800",
  },
  statusChipTextActive: {
    color: colors.primary,
  },
  communicationBox: {
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    padding: 10,
  },
  communicationItem: {
    gap: 3,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 9,
  },
  communicationMeta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "800",
  },
  messageInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 9,
    textAlignVertical: "top",
  },
  supportBox: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  caseList: {
    gap: 8,
  },
  caseItem: {
    gap: 3,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 9,
  },
});
