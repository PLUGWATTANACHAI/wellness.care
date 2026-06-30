import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
      const result = await sendProviderLocation(topJob.id);
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

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Provider App</Text>
      <Text style={styles.title}>{topJob ? `Job ${topJob.code}` : "Provider jobs"}</Text>
      <Text style={styles.row}>API: {status === "error" ? "connection issue" : "connected to provider jobs"}</Text>
      <Text style={styles.row}>Customer: {topJob?.customer ?? "loading..."}</Text>
      <Text style={styles.row}>Service: {topJob?.service ?? "loading..."}</Text>
      <Text style={styles.row}>Status: {topJob?.status ?? "loading..."}</Text>
      <Text style={styles.row}>
        Offer: {topJob?.offerStatus ?? "-"}
        {topJob?.offerExpiresAt ? ` · expires ${new Date(topJob.offerExpiresAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}` : ""}
      </Text>
      <Text style={styles.row}>
        Provider: {profile ? `${profile.name} · ${profile.onlineStatus} · ${profile.rating.toFixed(1)}★` : "loading profile..."}
      </Text>
      <Text style={styles.row}>
        Service area: {profile ? `${(profile.serviceRadiusMeters / 1000).toFixed(1)} km radius` : "loading radius..."}
      </Text>
      <Text style={styles.row}>
        Skills: {profile?.skills?.length ? profile.skills.slice(0, 2).join(" · ") : "loading skills..."}
      </Text>
      <Text style={styles.row}>
        Hours: {profile?.workingHours?.length ? profile.workingHours.slice(0, 2).join(" · ") : "loading hours..."}
      </Text>
      <Text style={styles.row}>
        Location sharing: {locationConsentAccepted ? "consent accepted" : "needs provider consent"}
      </Text>
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
          <Text style={styles.buttonText}>Accept</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!topJob || status === "saving" || topJob.offerStatus !== "offered"}
          onPress={handleReject}
          style={({ pressed }) => [styles.rejectButton, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!topJob || status === "saving"}
          onPress={handleOnTheWay}
          style={({ pressed }) => [styles.buttonSecondary, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.buttonSecondaryText}>{status === "saving" ? "Saving..." : "On the way"}</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!topJob || status === "saving"}
        onPress={handleCheckRadius}
        style={({ pressed }) => [styles.radiusButton, pressed ? styles.buttonPressed : null]}
      >
        <Text style={styles.radiusButtonText}>
          {status === "saving" ? "Checking..." : "Check service radius"}
        </Text>
      </Pressable>
      {radiusCheck ? (
        <Text style={radiusCheck.withinRadius ? styles.result : styles.warning}>
          {radiusCheck.withinRadius ? "Inside service area" : "Outside service area"} · {(radiusCheck.distanceMeters / 1000).toFixed(2)} km
          from base
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={status === "saving"}
          onPress={handleLocationConsent}
          style={({ pressed }) => [styles.buttonSecondary, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.buttonSecondaryText}>
            {locationConsentAccepted ? "Consent saved" : "Allow location"}
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
          <Text style={styles.buttonText}>Send location</Text>
        </Pressable>
      </View>
      {locationResult ? (
        <Text style={styles.result}>
          Location visible to active customer · retained {locationResult.retentionHours}h
        </Text>
      ) : null}
      {topJob ? (
        <View style={styles.communicationBox}>
          <Text style={styles.sectionTitle}>Customer messages</Text>
          <Text style={styles.row}>
            {communicationStatus === "loading"
              ? "Loading messages..."
              : communications.length
                ? `${communications.length} booking message(s)`
                : "No customer-provider messages yet"}
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
            placeholder="Message the customer"
            placeholderTextColor="#81908c"
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
            <Text style={styles.buttonText}>{communicationStatus === "sending" ? "Sending..." : "Send message"}</Text>
          </Pressable>
          {communicationStatus === "error" ? <Text style={styles.warning}>Messages are unavailable right now.</Text> : null}
          <View style={styles.supportBox}>
            <Text style={styles.sectionTitle}>Need support?</Text>
            <TextInput
              multiline
              value={supportRequestText}
              onChangeText={(text) => {
                setSupportRequestText(text);
                if (supportStatus === "sent" || supportStatus === "error") setSupportStatus("idle");
              }}
              placeholder="Tell operations what happened"
              placeholderTextColor="#81908c"
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
                <Text style={styles.buttonSecondaryText}>Request support</Text>
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
                <Text style={styles.rejectButtonText}>Report safety</Text>
              </Pressable>
            </View>
            {supportStatus === "sent" ? <Text style={styles.result}>Support request sent privately to operations.</Text> : null}
            {supportStatus === "error" ? <Text style={styles.warning}>Could not send support request.</Text> : null}
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
                        : "Operations has your request."}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
      <Text style={styles.note}>{jobs.length} Supabase-backed job(s) available for this provider.</Text>
    </View>
  );
}

function formatCommunicationActor(actorRole: string) {
  if (actorRole === "customer") return "Customer";
  if (actorRole === "admin") return "Support";
  return "You";
}

function formatSupportReason(reasonCode: BookingSupportCaseDto["reasonCode"]) {
  const labels: Record<BookingSupportCaseDto["reasonCode"], string> = {
    support_request: "Support request",
    unsafe_message: "Safety report",
    arrival_issue: "Arrival issue",
    payment_issue: "Payment issue",
  };

  return labels[reasonCode];
}

function formatSupportStatus(status: BookingSupportCaseDto["status"]) {
  const labels: Record<BookingSupportCaseDto["status"], string> = {
    open: "Received",
    in_review: "In review",
    resolved: "Resolved",
  };

  return labels[status];
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#fffaf0",
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
  sectionTitle: {
    color: "#10231f",
    fontWeight: "800",
  },
  note: {
    color: "#6d7875",
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
    backgroundColor: "#0793a4",
    paddingVertical: 10,
  },
  buttonSecondary: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0793a4",
    backgroundColor: "#fff",
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
    color: "#fff",
    fontWeight: "800",
  },
  buttonSecondaryText: {
    color: "#0793a4",
    fontWeight: "800",
  },
  rejectButtonText: {
    color: "#b42318",
    fontWeight: "800",
  },
  result: {
    color: "#087f5b",
    fontWeight: "800",
  },
  warning: {
    color: "#b42318",
    fontWeight: "800",
  },
  radiusButton: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#10231f",
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
    borderColor: "#d7e2df",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingVertical: 8,
  },
  statusChipActive: {
    borderColor: "#0793a4",
    backgroundColor: "#e7f7f4",
  },
  statusChipText: {
    color: "#50615d",
    fontWeight: "800",
  },
  statusChipTextActive: {
    color: "#0793a4",
  },
  communicationBox: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#d8e7eb",
    borderRadius: 8,
    backgroundColor: "#f6fcfd",
    padding: 10,
  },
  communicationItem: {
    gap: 3,
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 9,
  },
  communicationMeta: {
    color: "#50615d",
    fontSize: 12,
    fontWeight: "800",
  },
  messageInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: "#d7e2df",
    borderRadius: 8,
    backgroundColor: "#fff",
    color: "#10231f",
    paddingHorizontal: 10,
    paddingVertical: 9,
    textAlignVertical: "top",
  },
  supportBox: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#d8e7eb",
    paddingTop: 10,
  },
  caseList: {
    gap: 8,
  },
  caseItem: {
    gap: 3,
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 9,
  },
});
