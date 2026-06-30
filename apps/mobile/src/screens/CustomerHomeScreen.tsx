import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  checkProviderAvailability,
  confirmSandboxPayment,
  createBooking,
  createBookingCommunication,
  createBookingSupportRequest,
  createPaymentIntent,
  getCustomerProfile,
  getBookingCommunications,
  getBookingSupportCases,
  getBookingSlotHold,
  getPriceBreakdown,
  getProviderLocation,
  getServices,
  getBookingTimeline,
  type BookingCommunicationDto,
  type BookingSupportCaseDto,
  type BookingDto,
  type BookingSlotHoldDto,
  type BookingTimelineDto,
  type CustomerProfileDto,
  type PaymentIntentDto,
  type PriceBreakdownDto,
  type ProviderAvailabilityDto,
  type ProviderLocationDto,
  type ServiceItemDto,
} from "../services/api";

const bookingSlots = [
  { id: "tomorrow_1400", label: "Tomorrow · 14:00", offsetHours: 30 },
  { id: "tomorrow_1800", label: "Tomorrow · 18:00", offsetHours: 34 },
  { id: "next_day_1000", label: "Next day · 10:00", offsetHours: 50 },
];

export function CustomerHomeScreen() {
  const [services, setServices] = useState<ServiceItemDto[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();
  const [selectedSlotId, setSelectedSlotId] = useState(bookingSlots[0].id);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfileDto | undefined>();
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [latestBooking, setLatestBooking] = useState<BookingDto | undefined>();
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "creating">("loading");
  const [availabilityStatus, setAvailabilityStatus] = useState<"idle" | "checking" | "ready" | "unavailable" | "error">("idle");
  const [availability, setAvailability] = useState<ProviderAvailabilityDto | undefined>();
  const [trackingStatus, setTrackingStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [trackedLocation, setTrackedLocation] = useState<ProviderLocationDto | undefined>();
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "creating" | "ready" | "confirming" | "error">("idle");
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentDto | undefined>();
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdownDto | undefined>();
  const [slotHold, setSlotHold] = useState<BookingSlotHoldDto | undefined>();
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const [timeline, setTimeline] = useState<BookingTimelineDto[]>([]);
  const [communications, setCommunications] = useState<BookingCommunicationDto[]>([]);
  const [communicationText, setCommunicationText] = useState("");
  const [communicationStatus, setCommunicationStatus] = useState<"idle" | "loading" | "sending" | "error">("idle");
  const [supportRequestText, setSupportRequestText] = useState("");
  const [supportStatus, setSupportStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [supportCases, setSupportCases] = useState<BookingSupportCaseDto[]>([]);

  useEffect(() => {
    Promise.all([getServices(), getCustomerProfile()])
      .then(([items, profile]) => {
        setServices(items);
        setSelectedServiceId(items[0]?.id);
        setCustomerProfile(profile);
        setAddressConfirmed(Boolean(profile.address?.id && profile.address.googlePlaceId));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  async function handleCreateBooking() {
    if (!selectedServiceId || !customerProfile?.address?.id || !addressConfirmed || !availability?.available) return;

    setStatus("creating");
    try {
      const booking = await createBooking({
        serviceId: selectedServiceId,
        addressId: customerProfile.address.id,
        scheduledAt: getSelectedScheduledAt(),
      });
      const breakdown = await getPriceBreakdown(booking.id);
      const hold = await getBookingSlotHold(booking.id);
      setLatestBooking(booking);
      setPriceBreakdown(breakdown);
      setSlotHold(hold);
      await getBookingTimeline(booking.id, "customer").then(setTimeline).catch(() => setTimeline([]));
      await loadCommunications(booking.id);
      await loadSupportCases(booking.id);
      setPaymentIntent(undefined);
      setPaymentStatus("idle");
      setReviewAccepted(false);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const selectedSlot = bookingSlots.find((slot) => slot.id === selectedSlotId) || bookingSlots[0];
  const customerAddress = customerProfile?.address;
  const canCheckAvailability = Boolean(selectedServiceId && customerAddress?.id && addressConfirmed);
  const canCreateBooking = Boolean(canCheckAvailability && availability?.available);
  const trackingBookingId = latestBooking?.id ?? "book_mqn1ex1f_05qxp01u";

  function getSelectedScheduledAt() {
    return new Date(Date.now() + selectedSlot.offsetHours * 60 * 60 * 1000).toISOString();
  }

  function resetAvailability() {
    setAvailability(undefined);
    setAvailabilityStatus("idle");
    setLatestBooking(undefined);
    setPaymentIntent(undefined);
    setPriceBreakdown(undefined);
    setSlotHold(undefined);
    setReviewAccepted(false);
    setTimeline([]);
    setCommunications([]);
    setCommunicationText("");
    setCommunicationStatus("idle");
    setSupportRequestText("");
    setSupportStatus("idle");
    setSupportCases([]);
  }

  async function handleCheckAvailability() {
    if (!selectedServiceId || !customerAddress?.id || !addressConfirmed) return;

    setAvailabilityStatus("checking");
    try {
      const result = await checkProviderAvailability({
        serviceId: selectedServiceId,
        addressId: customerAddress.id,
        scheduledAt: getSelectedScheduledAt(),
      });
      setAvailability(result);
      setAvailabilityStatus(result.available ? "ready" : "unavailable");
    } catch {
      setAvailabilityStatus("error");
    }
  }

  async function handleRefreshProviderLocation() {
    setTrackingStatus("loading");
    try {
      const location = await getProviderLocation(trackingBookingId);
      setTrackedLocation(location);
      setTrackingStatus("ready");
    } catch {
      setTrackingStatus("error");
    }
  }

  async function handleCreatePaymentIntent() {
    if (!latestBooking || !reviewAccepted || !priceBreakdown || !slotHold?.held) return;

    setPaymentStatus("creating");
    try {
      const payment = await createPaymentIntent(latestBooking.id);
      setPaymentIntent(payment);
      setPaymentStatus("ready");
    } catch {
      setPaymentStatus("error");
    }
  }

  async function handleConfirmPayment() {
    if (!paymentIntent) return;

    setPaymentStatus("confirming");
    try {
      const payment = await confirmSandboxPayment(paymentIntent.id);
      setPaymentIntent(payment);
      setLatestBooking((booking) => (booking ? { ...booking, status: "payment_confirmed" } : booking));
      await getBookingTimeline(payment.bookingId, "customer").then(setTimeline).catch(() => setTimeline([]));
      await loadCommunications(payment.bookingId);
      await loadSupportCases(payment.bookingId);
      setPaymentStatus("ready");
    } catch {
      setPaymentStatus("error");
    }
  }

  async function loadCommunications(bookingId: string) {
    setCommunicationStatus("loading");
    try {
      const items = await getBookingCommunications(bookingId, "customer");
      setCommunications(items);
      setCommunicationStatus("idle");
    } catch {
      setCommunications([]);
      setCommunicationStatus("error");
    }
  }

  async function loadSupportCases(bookingId: string) {
    try {
      const items = await getBookingSupportCases(bookingId, "customer");
      setSupportCases(items);
    } catch {
      setSupportCases([]);
    }
  }

  async function handleSendCommunication() {
    if (!latestBooking || !communicationText.trim()) return;

    setCommunicationStatus("sending");
    try {
      await createBookingCommunication(latestBooking.id, { body: communicationText.trim() }, "customer");
      setCommunicationText("");
      await loadCommunications(latestBooking.id);
    } catch {
      setCommunicationStatus("error");
    }
  }

  async function handleCreateSupportRequest(reasonCode: "support_request" | "unsafe_message") {
    if (!latestBooking || !supportRequestText.trim()) return;

    setSupportStatus("sending");
    try {
      await createBookingSupportRequest(
        latestBooking.id,
        {
          body: supportRequestText.trim(),
          reasonCode,
        },
        "customer",
      );
      setSupportRequestText("");
      setSupportStatus("sent");
      await loadSupportCases(latestBooking.id);
    } catch {
      setSupportStatus("error");
    }
  }

  useEffect(() => {
    if (!latestBooking || !slotHold?.held || paymentIntent?.status === "succeeded") return undefined;

    const intervalId = setInterval(() => {
      getBookingSlotHold(latestBooking.id)
        .then(setSlotHold)
        .catch(() => setSlotHold((current) => (current ? { ...current, held: false, secondsRemaining: 0 } : current)));
    }, 15000);

    return () => clearInterval(intervalId);
  }, [latestBooking, paymentIntent?.status, slotHold?.held]);

  const holdSecondsRemaining = slotHold?.secondsRemaining ?? 0;
  const holdMinutes = Math.floor(holdSecondsRemaining / 60);
  const holdSeconds = holdSecondsRemaining % 60;
  const holdCountdownText = `${holdMinutes}:${holdSeconds.toString().padStart(2, "0")}`;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Customer App</Text>
      <Text style={styles.title}>Book condo wellness service</Text>
      <Text style={styles.row}>API: {status === "error" ? "connection issue" : "connected to Wellnest API"}</Text>
      <View style={styles.serviceList}>
        {services.map((service) => {
          const active = service.id === selectedServiceId;

          return (
            <Pressable
              accessibilityRole="button"
              key={service.id}
              onPress={() => {
                setSelectedServiceId(service.id);
                resetAvailability();
              }}
              style={({ pressed }) => [
                styles.serviceChip,
                active ? styles.serviceChipActive : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={[styles.serviceChipText, active ? styles.serviceChipTextActive : null]}>
                {service.name}
              </Text>
              <Text style={[styles.serviceChipMeta, active ? styles.serviceChipTextActive : null]}>
                ฿{service.priceTHB} · {service.durationMinutes || "delivery"} min
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.row}>
        Selected: {selectedService ? `${selectedService.name} · ฿${selectedService.priceTHB}` : "loading services..."}
      </Text>
      <View style={styles.confirmBox}>
        <Text style={styles.trackingTitle}>1. Select service time</Text>
        <View style={styles.slotList}>
          {bookingSlots.map((slot) => {
            const active = slot.id === selectedSlotId;

            return (
              <Pressable
                accessibilityRole="button"
                key={slot.id}
                onPress={() => {
                  setSelectedSlotId(slot.id);
                  resetAvailability();
                }}
                style={({ pressed }) => [
                  styles.slotChip,
                  active ? styles.slotChipActive : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={[styles.slotText, active ? styles.slotTextActive : null]}>{slot.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.confirmBox}>
        <Text style={styles.trackingTitle}>2. Confirm address</Text>
        <Text style={styles.row}>
          {customerAddress
            ? `${customerAddress.condoName} · ${customerAddress.meetingPoint || "meeting point not set"}`
            : "No address saved yet"}
        </Text>
        {customerAddress?.formattedAddress ? <Text style={styles.addressText}>{customerAddress.formattedAddress}</Text> : null}
        {customerAddress?.lat && customerAddress.lng ? (
          <Text style={styles.mapText}>
            Map confirmed · {customerAddress.lat.toFixed(5)}, {customerAddress.lng.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.warning}>Please save a map address in Account before booking.</Text>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={!customerAddress?.googlePlaceId}
          onPress={() => {
            setAddressConfirmed((confirmed) => !confirmed);
            resetAvailability();
          }}
          style={({ pressed }) => [
            styles.confirmButton,
            addressConfirmed ? styles.confirmButtonActive : null,
            !customerAddress?.googlePlaceId ? styles.buttonDisabled : null,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={[styles.confirmButtonText, addressConfirmed ? styles.confirmButtonTextActive : null]}>
            {addressConfirmed ? "Address confirmed" : "Tap to confirm address"}
          </Text>
        </Pressable>
      </View>
      <View style={styles.confirmBox}>
        <Text style={styles.trackingTitle}>3. Check provider availability</Text>
        <Text style={styles.row}>
          {availability?.available && availability.nearestProvider
            ? `${availability.nearestProvider.name} is available nearby · ${(availability.nearestProvider.distanceMeters / 1000).toFixed(2)} km`
            : availabilityStatus === "unavailable"
              ? describeAvailabilityReason(availability?.reason)
              : "Check provider availability before creating the booking."}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={!canCheckAvailability || availabilityStatus === "checking"}
          onPress={handleCheckAvailability}
          style={({ pressed }) => [
            styles.availabilityButton,
            availability?.available ? styles.availabilityButtonReady : null,
            !canCheckAvailability ? styles.buttonDisabled : null,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.availabilityButtonText}>
            {availabilityStatus === "checking"
              ? "Checking..."
              : availability?.available
                ? "Provider available"
                : "Check provider"}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.row}>Summary: {selectedService?.name ?? "service"} · {selectedSlot.label}</Text>
      {latestBooking ? (
        <Text style={styles.result}>Created {latestBooking.code} · {latestBooking.status}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={status === "loading" || status === "creating" || !canCreateBooking}
        onPress={handleCreateBooking}
        style={({ pressed }) => [
          styles.button,
          !canCreateBooking ? styles.buttonDisabled : null,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.buttonText}>{status === "creating" ? "Creating..." : "Create booking"}</Text>
      </Pressable>
      {latestBooking ? (
        <View style={styles.reviewBox}>
          <Text style={styles.trackingTitle}>4. Review before payment</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Service</Text>
            <Text style={styles.reviewValue}>{selectedService?.name ?? latestBooking.serviceId}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Schedule</Text>
            <Text style={styles.reviewValue}>{selectedSlot.label}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Address</Text>
            <Text style={styles.reviewValue}>
              {customerAddress ? `${customerAddress.condoName} · ${customerAddress.meetingPoint || "meeting point not set"}` : latestBooking.addressId}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Service price</Text>
            <Text style={styles.reviewValue}>฿{(priceBreakdown?.subtotalTHB ?? latestBooking.totalTHB).toLocaleString("th-TH")}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Coins discount</Text>
            <Text style={styles.discountValue}>
              -฿{(priceBreakdown?.coinsDiscountTHB ?? 0).toLocaleString("th-TH")}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Platform fee</Text>
            <Text style={styles.reviewValue}>฿{(priceBreakdown?.platformFeeTHB ?? 0).toLocaleString("th-TH")}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Total to pay</Text>
            <Text style={styles.reviewTotal}>
              ฿{(priceBreakdown?.totalTHB ?? latestBooking.totalTHB).toLocaleString("th-TH")}
            </Text>
          </View>
          {priceBreakdown ? (
            <Text style={styles.policyText}>
              Uses {priceBreakdown.coinsUsed.toLocaleString("th-TH")} coins · earns {priceBreakdown.pointsEarned.toLocaleString("th-TH")} points after payment.
            </Text>
          ) : null}
          <Text style={styles.holdText}>
            {slotHold?.held
              ? `Provider slot held for payment · ${holdCountdownText} remaining`
              : "Provider slot hold expired. Please re-check availability."}
          </Text>
          <Text style={styles.policyText}>
            Free cancellation is planned for early MVP rules until a provider accepts the job. Final policy text should be confirmed before launch.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setReviewAccepted((accepted) => !accepted)}
            style={({ pressed }) => [
              styles.confirmButton,
              reviewAccepted ? styles.confirmButtonActive : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={[styles.confirmButtonText, reviewAccepted ? styles.confirmButtonTextActive : null]}>
              {reviewAccepted ? "Review confirmed" : "Confirm review"}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.paymentBox}>
        <Text style={styles.trackingTitle}>Payment sandbox</Text>
        <Text style={styles.row}>
          {paymentIntent
            ? `฿${paymentIntent.amountTHB.toLocaleString("th-TH")} · ${paymentIntent.status}`
            : latestBooking
              ? reviewAccepted
                ? priceBreakdown && slotHold?.held
                  ? `Ready to pay ฿${priceBreakdown.totalTHB.toLocaleString("th-TH")}`
                  : "Slot hold expired. Please create a fresh booking."
                : "Please confirm the booking review before payment."
              : "Create booking before payment"}
        </Text>
        <View style={styles.paymentActions}>
          <Pressable
            accessibilityRole="button"
            disabled={!latestBooking || !reviewAccepted || !priceBreakdown || !slotHold?.held || paymentStatus === "creating" || paymentStatus === "confirming"}
            onPress={handleCreatePaymentIntent}
            style={({ pressed }) => [
              styles.buttonSecondary,
              !latestBooking || !reviewAccepted || !priceBreakdown || !slotHold?.held ? styles.buttonDisabled : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonSecondaryText}>
              {paymentStatus === "creating" ? "Creating..." : "Proceed to payment"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!paymentIntent || paymentIntent.status === "succeeded" || paymentStatus === "confirming"}
            onPress={handleConfirmPayment}
            style={({ pressed }) => [
              styles.button,
              !paymentIntent || paymentIntent.status === "succeeded" ? styles.buttonDisabled : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonText}>{paymentStatus === "confirming" ? "Confirming..." : "Pay test"}</Text>
          </Pressable>
        </View>
        {paymentStatus === "error" ? <Text style={styles.error}>Payment sandbox failed. Please retry.</Text> : null}
      </View>
      <View style={styles.trackingBox}>
        <Text style={styles.trackingTitle}>Provider tracking</Text>
        <Text style={styles.row}>Visible only after provider accepts and starts the trip.</Text>
        {trackedLocation ? (
          <Text style={styles.result}>
            {trackedLocation.lat.toFixed(5)}, {trackedLocation.lng.toFixed(5)} · {trackedLocation.accuracyMeters ?? "-"}m ·
            {trackedLocation.lastUpdatedSecondsAgo}s ago
          </Text>
        ) : (
          <Text style={styles.row}>
            {trackingStatus === "error" ? "No active provider location yet" : "Waiting for provider location"}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={trackingStatus === "loading"}
          onPress={handleRefreshProviderLocation}
          style={({ pressed }) => [styles.buttonSecondary, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.buttonSecondaryText}>
            {trackingStatus === "loading" ? "Refreshing..." : "Refresh provider location"}
          </Text>
        </Pressable>
      </View>
      {timeline.length > 0 ? (
        <View style={styles.timelineBox}>
          <Text style={styles.trackingTitle}>Booking timeline</Text>
          {timeline.map((event) => (
            <View key={event.id} style={styles.timelineItem}>
              <Text style={styles.timelineTitle}>{event.title}</Text>
              <Text style={styles.row}>{event.actor} · {event.status}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {latestBooking ? (
        <View style={styles.communicationBox}>
          <Text style={styles.trackingTitle}>Booking messages</Text>
          <Text style={styles.row}>
            {communicationStatus === "loading"
              ? "Loading messages..."
              : communications.length
                ? `${communications.length} message(s) with your provider`
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
            placeholder="Message your provider"
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
          {communicationStatus === "error" ? <Text style={styles.error}>Messages are unavailable right now.</Text> : null}
          <View style={styles.supportBox}>
            <Text style={styles.trackingTitle}>Need support?</Text>
            <TextInput
              multiline
              value={supportRequestText}
              onChangeText={(text) => {
                setSupportRequestText(text);
                if (supportStatus === "sent" || supportStatus === "error") setSupportStatus("idle");
              }}
              placeholder="Tell support what happened"
              placeholderTextColor="#81908c"
              style={styles.messageInput}
            />
            <View style={styles.supportActions}>
              <Pressable
                accessibilityRole="button"
                disabled={!supportRequestText.trim() || supportStatus === "sending"}
                onPress={() => handleCreateSupportRequest("support_request")}
                style={({ pressed }) => [
                  styles.supportButton,
                  !supportRequestText.trim() ? styles.buttonDisabled : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.supportButtonText}>Request support</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!supportRequestText.trim() || supportStatus === "sending"}
                onPress={() => handleCreateSupportRequest("unsafe_message")}
                style={({ pressed }) => [
                  styles.supportDangerButton,
                  !supportRequestText.trim() ? styles.buttonDisabled : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.supportDangerButtonText}>Report safety</Text>
              </Pressable>
            </View>
            {supportStatus === "sent" ? <Text style={styles.result}>Support request sent privately to operations.</Text> : null}
            {supportStatus === "error" ? <Text style={styles.error}>Could not send support request.</Text> : null}
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
      <Text style={styles.note}>Connected: service catalog and booking API now use Supabase-backed backend.</Text>
    </View>
  );
}

function formatCommunicationActor(actorRole: string) {
  if (actorRole === "provider") return "Provider";
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

function describeAvailabilityReason(reason?: ProviderAvailabilityDto["reason"]) {
  const descriptions: Record<string, string> = {
    no_provider_online: "No online provider is available right now.",
    provider_unskilled: "No online provider is assigned to this service yet.",
    outside_working_hours: "Providers are outside working hours for this selected time.",
    provider_on_leave: "Providers are marked unavailable for this selected time.",
    outside_service_radius: "The address is outside the current provider service radius.",
    provider_busy: "Providers are busy at this selected time.",
    missing_address_location: "This address needs map coordinates before booking.",
  };

  return descriptions[reason || ""] || "No provider is available for this time and address.";
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
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
  row: {
    color: "#10231f",
  },
  note: {
    color: "#6d7875",
    lineHeight: 20,
  },
  serviceList: {
    gap: 8,
  },
  serviceChip: {
    gap: 3,
    borderWidth: 1,
    borderColor: "#e3e9e7",
    borderRadius: 8,
    backgroundColor: "#f8fbfa",
    padding: 10,
  },
  serviceChipActive: {
    borderColor: "#0793a4",
    backgroundColor: "#e7f7f4",
  },
  serviceChipText: {
    color: "#10231f",
    fontWeight: "800",
  },
  serviceChipMeta: {
    color: "#6d7875",
    fontSize: 12,
  },
  confirmBox: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#d7e2df",
    borderRadius: 8,
    backgroundColor: "#f8fbfa",
    padding: 10,
  },
  reviewBox: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#b9ddd6",
    borderRadius: 8,
    backgroundColor: "#eefaf7",
    padding: 10,
  },
  reviewRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  reviewLabel: {
    color: "#50615d",
    fontSize: 12,
    fontWeight: "800",
  },
  reviewValue: {
    flex: 1,
    color: "#10231f",
    textAlign: "right",
  },
  reviewTotal: {
    color: "#087f5b",
    fontWeight: "800",
  },
  discountValue: {
    color: "#b42318",
    fontWeight: "800",
  },
  policyText: {
    color: "#50615d",
    fontSize: 12,
    lineHeight: 18,
  },
  holdText: {
    color: "#087f5b",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  availabilityButton: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#10231f",
    paddingVertical: 10,
  },
  availabilityButtonReady: {
    backgroundColor: "#087f5b",
  },
  availabilityButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  slotList: {
    gap: 8,
  },
  slotChip: {
    borderWidth: 1,
    borderColor: "#d7e2df",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  slotChipActive: {
    borderColor: "#0793a4",
    backgroundColor: "#e7f7f4",
  },
  slotText: {
    color: "#50615d",
    fontWeight: "800",
  },
  slotTextActive: {
    color: "#0793a4",
  },
  addressText: {
    color: "#50615d",
    lineHeight: 20,
  },
  mapText: {
    color: "#087f5b",
    fontSize: 12,
    fontWeight: "800",
  },
  warning: {
    color: "#b42318",
    fontSize: 12,
    fontWeight: "800",
  },
  confirmButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#10231f",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingVertical: 10,
  },
  confirmButtonActive: {
    borderColor: "#087f5b",
    backgroundColor: "#e7f7f4",
  },
  confirmButtonText: {
    color: "#10231f",
    fontWeight: "800",
  },
  confirmButtonTextActive: {
    color: "#087f5b",
  },
  serviceChipTextActive: {
    color: "#067889",
  },
  result: {
    color: "#087f5b",
    fontWeight: "800",
  },
  trackingBox: {
    gap: 6,
    borderRadius: 8,
    backgroundColor: "#f1fbfb",
    padding: 10,
  },
  trackingTitle: {
    color: "#10231f",
    fontWeight: "800",
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
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
  buttonSecondary: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0793a4",
    backgroundColor: "#fff",
    paddingVertical: 10,
  },
  buttonSecondaryText: {
    color: "#0793a4",
    fontWeight: "800",
  },
  paymentBox: {
    gap: 6,
    borderRadius: 8,
    backgroundColor: "#fff8e8",
    padding: 10,
  },
  paymentActions: {
    flexDirection: "row",
    gap: 8,
  },
  timelineBox: {
    gap: 8,
    borderRadius: 8,
    backgroundColor: "#f8fbfa",
    padding: 10,
  },
  timelineItem: {
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#e3e9e7",
    paddingBottom: 8,
  },
  timelineTitle: {
    color: "#10231f",
    fontWeight: "800",
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
  supportActions: {
    flexDirection: "row",
    gap: 8,
  },
  supportButton: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0793a4",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingVertical: 10,
  },
  supportButtonText: {
    color: "#0793a4",
    fontWeight: "800",
  },
  supportDangerButton: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1b5ad",
    borderRadius: 8,
    backgroundColor: "#fff7f5",
    paddingVertical: 10,
  },
  supportDangerButtonText: {
    color: "#b42318",
    fontWeight: "800",
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
  error: {
    color: "#b42318",
    fontWeight: "800",
  },
});
