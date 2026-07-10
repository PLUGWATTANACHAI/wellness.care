import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../design/theme";
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
  const [paymentMethod, setPaymentMethod] = useState<"promptpay" | "card">("promptpay");
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
  const canCreatePaymentIntent = Boolean(
    latestBooking &&
      reviewAccepted &&
      priceBreakdown &&
      slotHold?.held &&
      paymentMethod === "promptpay" &&
      paymentStatus !== "creating" &&
      paymentStatus !== "confirming",
  );
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
      const payment = await createPaymentIntent({
        bookingId: latestBooking.id,
        method: paymentMethod,
      });
      setPaymentIntent(payment);
      setPaymentStatus("ready");
      if (payment.checkoutUrl) {
        await Linking.openURL(payment.checkoutUrl);
      }
    } catch {
      setPaymentStatus("error");
    }
  }

  async function handleConfirmPayment() {
    if (!paymentIntent) return;

    if (paymentIntent.provider !== "sandbox") {
      if (paymentIntent.checkoutUrl) {
        await Linking.openURL(paymentIntent.checkoutUrl);
      }
      return;
    }

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
  const selectedServicePrice = selectedService ? `฿${selectedService.priceTHB.toLocaleString("th-TH")}` : "เลือกบริการ";
  const activeProviderName = availability?.nearestProvider?.name ?? "Provider matching";
  const activeProviderMeta =
    availability?.available && availability.nearestProvider
      ? `ใกล้พี่ ${(availability.nearestProvider.distanceMeters / 1000).toFixed(2)} กม.`
      : "ตรวจผู้ให้บริการก่อนยืนยัน";

  return (
    <View style={styles.card}>
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.label}>Book service</Text>
          <Text style={styles.title}>เลือกบริการที่ต้องการ</Text>
        </View>
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>{status === "error" ? "Offline" : "Online"}</Text>
        </View>
      </View>
      <View style={styles.bookingSummaryCard}>
        <View>
          <Text style={styles.summaryLabel}>วันนี้แนะนำ</Text>
          <Text style={styles.summaryTitle}>{selectedService?.name ?? "Wellness service"}</Text>
          <Text style={styles.summaryMeta}>{selectedSlot.label} · {selectedServicePrice}</Text>
        </View>
        <View style={styles.providerMiniCard}>
          <Text style={styles.providerAvatar}>W</Text>
          <Text style={styles.providerMiniName}>{activeProviderName}</Text>
          <Text style={styles.providerMiniMeta}>{activeProviderMeta}</Text>
        </View>
      </View>
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
                ฿{service.priceTHB.toLocaleString("th-TH")} · {service.durationMinutes || "delivery"} min
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>1</Text>
          <View>
            <Text style={styles.trackingTitle}>เลือกวันและเวลา</Text>
            <Text style={styles.stepCaption}>เวลาที่ผู้ให้บริการสามารถเตรียมงานได้</Text>
          </View>
        </View>
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
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>2</Text>
          <View>
            <Text style={styles.trackingTitle}>ยืนยันที่อยู่บริการ</Text>
            <Text style={styles.stepCaption}>ใช้ตำแหน่งจากแผนที่เพื่อให้ผู้ให้บริการเดินทางถูกต้อง</Text>
          </View>
        </View>
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
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>3</Text>
          <View>
            <Text style={styles.trackingTitle}>ตรวจผู้ให้บริการ</Text>
            <Text style={styles.stepCaption}>ระบบจะจับคู่จากบริการ เวลา และพื้นที่ของพี่</Text>
          </View>
        </View>
        <Text style={styles.row}>
          {availability?.available && availability.nearestProvider
            ? `${availability.nearestProvider.name} พร้อมให้บริการ · ${(availability.nearestProvider.distanceMeters / 1000).toFixed(2)} กม.`
            : availabilityStatus === "unavailable"
              ? describeAvailabilityReason(availability?.reason)
              : "กดตรวจผู้ให้บริการก่อนยืนยันการจอง"}
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
              ? "กำลังตรวจ..."
              : availability?.available
                ? "มีผู้ให้บริการพร้อม"
                : "ตรวจผู้ให้บริการ"}
          </Text>
        </Pressable>
      </View>
      {latestBooking ? (
        <Text style={styles.result}>Booking {latestBooking.code} · {formatBookingStatus(latestBooking.status)}</Text>
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
        <Text style={styles.buttonText}>{status === "creating" ? "กำลังสร้างการจอง..." : "ยืนยันการจอง"}</Text>
      </Pressable>
      {latestBooking ? (
        <View style={styles.reviewBox}>
          <Text style={styles.trackingTitle}>ตรวจสอบก่อนชำระเงิน</Text>
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
            ยกเลิกได้ตามเงื่อนไขบริการก่อนผู้ให้บริการเริ่มเดินทาง รายละเอียดนโยบายฉบับเต็มจะยืนยันก่อนเปิดสาธารณะ
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
        <Text style={styles.trackingTitle}>ชำระเงิน</Text>
        <View style={styles.paymentMethodRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPaymentMethod("promptpay");
              setPaymentIntent(undefined);
            }}
            style={({ pressed }) => [
              styles.methodChip,
              paymentMethod === "promptpay" ? styles.methodChipActive : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={[styles.methodChipText, paymentMethod === "promptpay" ? styles.methodChipTextActive : null]}>
              PromptPay / QR
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPaymentMethod("card");
              setPaymentIntent(undefined);
            }}
            style={({ pressed }) => [
              styles.methodChip,
              paymentMethod === "card" ? styles.methodChipActive : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={[styles.methodChipText, paymentMethod === "card" ? styles.methodChipTextActive : null]}>
              Credit card
            </Text>
          </Pressable>
        </View>
        <Text style={styles.row}>
          {paymentIntent
            ? `฿${paymentIntent.amountTHB.toLocaleString("th-TH")} · ${paymentIntent.paymentMethod} · ${paymentIntent.status}`
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
            disabled={!canCreatePaymentIntent}
            onPress={handleCreatePaymentIntent}
            style={({ pressed }) => [
              styles.buttonSecondary,
              !canCreatePaymentIntent ? styles.buttonDisabled : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonSecondaryText}>
              {paymentStatus === "creating" ? "Creating..." : paymentMethod === "promptpay" ? "Open PromptPay QR" : "Card tokenization next"}
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
            <Text style={styles.buttonText}>
              {paymentStatus === "confirming"
                ? "Confirming..."
                : paymentIntent?.provider === "sandbox"
                  ? "Confirm test payment"
                  : "Reopen payment"}
            </Text>
          </Pressable>
        </View>
        {paymentMethod === "card" ? (
          <Text style={styles.note}>
            Card live payment is next. The API is ready for Omise card tokens; the app will add secure tokenization before testers use cards.
          </Text>
        ) : null}
        {paymentIntent?.checkoutUrl ? <Text style={styles.note}>Complete payment in the opened Omise checkout/QR page. Booking confirms after webhook.</Text> : null}
        {paymentStatus === "error" ? <Text style={styles.error}>Payment failed. Please retry.</Text> : null}
      </View>
      <View style={styles.trackingBox}>
        <Text style={styles.trackingTitle}>ติดตามผู้ให้บริการ</Text>
        <Text style={styles.row}>จะแสดงเมื่อผู้ให้บริการรับงานและเริ่มเดินทาง</Text>
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
            {trackingStatus === "loading" ? "กำลังอัปเดต..." : "อัปเดตตำแหน่ง"}
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
      <Text style={styles.note}>Wellnest จะใช้ข้อมูลนี้เพื่อจัดคิวบริการและดูแลความปลอดภัยของการจองเท่านั้น</Text>
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

function formatBookingStatus(status: string) {
  const labels: Record<string, string> = {
    pending_payment: "รอชำระเงิน",
    payment_confirmed: "ชำระเงินแล้ว",
    confirmed: "ยืนยันแล้ว",
    provider_assigned: "จับคู่ผู้ให้บริการแล้ว",
    completed: "สำเร็จ",
  };

  return labels[status] || status;
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
    gap: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  screenHeader: {
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
    fontSize: 18,
    fontWeight: "800",
  },
  row: {
    color: colors.text,
    lineHeight: 20,
  },
  note: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  liveBadge: {
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveBadgeText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  bookingSummaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#163b38",
    padding: 14,
  },
  summaryLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
  },
  summaryMeta: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 18,
  },
  providerMiniCard: {
    width: 112,
    gap: 4,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 8,
  },
  providerAvatar: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.gold,
    color: colors.text,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  providerMiniName: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  providerMiniMeta: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    textAlign: "center",
  },
  serviceList: {
    gap: 8,
  },
  serviceChip: {
    gap: 3,
    borderWidth: 1,
    borderColor: "#e1ebe8",
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  serviceChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#e8f7f8",
  },
  serviceChipText: {
    color: colors.text,
    fontWeight: "800",
  },
  serviceChipMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  stepCard: {
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepNumber: {
    overflow: "hidden",
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.text,
    color: "#fff",
    fontWeight: "900",
    lineHeight: 28,
    textAlign: "center",
  },
  stepCaption: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  reviewBox: {
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    padding: 12,
  },
  reviewRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  reviewLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "800",
  },
  reviewValue: {
    flex: 1,
    color: colors.text,
    textAlign: "right",
  },
  reviewTotal: {
    color: colors.green,
    fontWeight: "800",
  },
  discountValue: {
    color: colors.danger,
    fontWeight: "800",
  },
  policyText: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  holdText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  availabilityButton: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: colors.text,
    paddingVertical: 10,
  },
  availabilityButtonReady: {
    backgroundColor: colors.green,
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
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  slotChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#e7f7f4",
  },
  slotText: {
    color: colors.textSoft,
    fontWeight: "800",
  },
  slotTextActive: {
    color: colors.primary,
  },
  addressText: {
    color: colors.textSoft,
    lineHeight: 20,
  },
  mapText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "800",
  },
  warning: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
  },
  confirmButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingVertical: 10,
  },
  confirmButtonActive: {
    borderColor: colors.green,
    backgroundColor: "#e7f7f4",
  },
  confirmButtonText: {
    color: colors.text,
    fontWeight: "800",
  },
  confirmButtonTextActive: {
    color: colors.green,
  },
  serviceChipTextActive: {
    color: colors.primaryDark,
  },
  result: {
    color: colors.green,
    fontWeight: "800",
  },
  trackingBox: {
    gap: 6,
    borderRadius: 8,
    backgroundColor: "#f1fbfb",
    padding: 12,
  },
  trackingTitle: {
    color: colors.text,
    fontWeight: "800",
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
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    paddingVertical: 10,
  },
  buttonSecondaryText: {
    color: colors.primary,
    fontWeight: "800",
  },
  paymentBox: {
    gap: 8,
    borderRadius: 8,
    backgroundColor: "#fff8e8",
    padding: 12,
  },
  paymentActions: {
    flexDirection: "row",
    gap: 8,
  },
  paymentMethodRow: {
    flexDirection: "row",
    gap: 8,
  },
  methodChip: {
    borderWidth: 1,
    borderColor: "#d8e7eb",
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  methodChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#e8f7f8",
  },
  methodChipText: {
    color: colors.textSoft,
    fontWeight: "800",
  },
  methodChipTextActive: {
    color: colors.primaryDark,
  },
  timelineBox: {
    gap: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: 10,
  },
  timelineItem: {
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#e3e9e7",
    paddingBottom: 8,
  },
  timelineTitle: {
    color: colors.text,
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
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingVertical: 10,
  },
  supportButtonText: {
    color: colors.primary,
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
    color: colors.danger,
    fontWeight: "800",
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
  error: {
    color: colors.danger,
    fontWeight: "800",
  },
});
