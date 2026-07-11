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
  { id: "tomorrow_1400", label: "พรุ่งนี้ · 14:00", offsetHours: 30 },
  { id: "tomorrow_1800", label: "พรุ่งนี้ · 18:00", offsetHours: 34 },
  { id: "next_day_1000", label: "วันถัดไป · 10:00", offsetHours: 50 },
];

const promoItems = [
  { title: "First booking", body: "ลด 120 บาทสำหรับการจองครั้งแรก" },
  { title: "After work care", body: "ช่วง 18:00-21:00 มี provider เพิ่ม" },
];

const nearbyProviders = [
  { name: "Mina", meta: "4.92 · 18 นาที" },
  { name: "Narin", meta: "4.88 · 24 นาที" },
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
  return (
    <View style={styles.card}>
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.label}>พร้อมดูแลพี่วันนี้</Text>
          <Text style={styles.title}>Wellnest Home</Text>
        </View>
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>{status === "error" ? "Offline" : "Online"}</Text>
        </View>
      </View>
      <View style={styles.walletStrip}>
        <View style={styles.walletTile}>
          <Text style={styles.walletLabel}>Coins</Text>
          <Text style={styles.walletValue}>{customerProfile?.coins.toLocaleString("th-TH") ?? "0"}</Text>
        </View>
        <View style={styles.walletTile}>
          <Text style={styles.walletLabel}>Points</Text>
          <Text style={styles.walletValue}>{customerProfile?.points.toLocaleString("th-TH") ?? "0"}</Text>
        </View>
        <View style={styles.walletTile}>
          <Text style={styles.walletLabel}>Tier</Text>
          <Text style={styles.walletValue}>{customerProfile?.tier ?? "Member"}</Text>
        </View>
      </View>
      <View style={styles.bookingSummaryCard}>
        <View>
          <Text style={styles.summaryLabel}>Available tonight</Text>
          <Text style={styles.summaryTitle}>บริการ wellness ส่วนตัวถึงคอนโด</Text>
          <Text style={styles.summaryMeta}>เลือกบริการ เวลาที่สะดวก และยืนยันพื้นที่ ระบบจะจับคู่ผู้ให้บริการใกล้พี่</Text>
        </View>
        <View style={styles.providerMiniCard}>
          <Text style={styles.providerAvatar}>M</Text>
          <Text style={styles.providerMiniName}>Mina</Text>
          <Text style={styles.providerMiniMeta}>4.92 · 18 นาที</Text>
        </View>
      </View>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>บริการ</Text>
        <Text style={styles.sectionAction}>ดูทั้งหมด</Text>
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
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>โปรวันนี้</Text>
      </View>
      <View style={styles.promoList}>
        {promoItems.map((promo) => (
          <View key={promo.title} style={styles.promoCard}>
            <Text style={styles.promoTitle}>{promo.title}</Text>
            <Text style={styles.promoBody}>{promo.body}</Text>
          </View>
        ))}
      </View>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>ผู้ให้บริการใกล้พี่</Text>
      </View>
      <View style={styles.nearbyProviderList}>
        {nearbyProviders.map((provider) => (
          <View key={provider.name} style={styles.nearbyProviderCard}>
            <Text style={styles.nearbyAvatar}>{provider.name.slice(0, 1)}</Text>
            <View style={styles.nearbyProviderCopy}>
              <Text style={styles.nearbyProviderName}>{provider.name}</Text>
              <Text style={styles.nearbyProviderMeta}>{provider.meta}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>เริ่มจองบริการ</Text>
        <Text style={styles.sectionAction}>{selectedService?.name ?? "เลือกบริการ"}</Text>
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
            : "ยังไม่มีที่อยู่บริการ"}
        </Text>
        {customerAddress?.formattedAddress ? <Text style={styles.addressText}>{customerAddress.formattedAddress}</Text> : null}
        {customerAddress?.lat && customerAddress.lng ? (
          <Text style={styles.mapText}>
            ยืนยันจากแผนที่แล้ว · {customerAddress.lat.toFixed(5)}, {customerAddress.lng.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.warning}>กรุณาบันทึกที่อยู่จากแผนที่ในหน้าโปรไฟล์ก่อนจอง</Text>
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
            {addressConfirmed ? "ยืนยันที่อยู่นี้แล้ว" : "ยืนยันที่อยู่นี้"}
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
            <Text style={styles.reviewLabel}>บริการ</Text>
            <Text style={styles.reviewValue}>{selectedService?.name ?? latestBooking.serviceId}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>วันและเวลา</Text>
            <Text style={styles.reviewValue}>{selectedSlot.label}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>ที่อยู่</Text>
            <Text style={styles.reviewValue}>
              {customerAddress ? `${customerAddress.condoName} · ${customerAddress.meetingPoint || "meeting point not set"}` : latestBooking.addressId}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>ค่าบริการ</Text>
            <Text style={styles.reviewValue}>฿{(priceBreakdown?.subtotalTHB ?? latestBooking.totalTHB).toLocaleString("th-TH")}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>ส่วนลด Coins</Text>
            <Text style={styles.discountValue}>
              -฿{(priceBreakdown?.coinsDiscountTHB ?? 0).toLocaleString("th-TH")}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>ค่าดูแลระบบ</Text>
            <Text style={styles.reviewValue}>฿{(priceBreakdown?.platformFeeTHB ?? 0).toLocaleString("th-TH")}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>ยอดที่ต้องชำระ</Text>
            <Text style={styles.reviewTotal}>
              ฿{(priceBreakdown?.totalTHB ?? latestBooking.totalTHB).toLocaleString("th-TH")}
            </Text>
          </View>
          {priceBreakdown ? (
            <Text style={styles.policyText}>
              ใช้ {priceBreakdown.coinsUsed.toLocaleString("th-TH")} coins · ได้รับ {priceBreakdown.pointsEarned.toLocaleString("th-TH")} points หลังชำระเงิน
            </Text>
          ) : null}
          <Text style={styles.holdText}>
            {slotHold?.held
              ? `ล็อกคิวผู้ให้บริการไว้ให้ชำระเงิน · เหลือ ${holdCountdownText}`
              : "คิวผู้ให้บริการหมดเวลาแล้ว กรุณาตรวจผู้ให้บริการอีกครั้ง"}
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
              {reviewAccepted ? "ตรวจสอบข้อมูลแล้ว" : "ยืนยันข้อมูลก่อนชำระเงิน"}
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
              บัตรเครดิต
            </Text>
          </Pressable>
        </View>
        <Text style={styles.row}>
          {paymentIntent
            ? `฿${paymentIntent.amountTHB.toLocaleString("th-TH")} · ${paymentIntent.paymentMethod} · ${paymentIntent.status}`
            : latestBooking
              ? reviewAccepted
                ? priceBreakdown && slotHold?.held
                  ? `พร้อมชำระ ฿${priceBreakdown.totalTHB.toLocaleString("th-TH")}`
                  : "คิวหมดเวลา กรุณาจองใหม่อีกครั้ง"
                : "กรุณายืนยันข้อมูลก่อนชำระเงิน"
              : "กรุณายืนยันการจองก่อนชำระเงิน"}
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
              {paymentStatus === "creating" ? "กำลังสร้างรายการ..." : paymentMethod === "promptpay" ? "เปิด QR PromptPay" : "บัตรเครดิตจะเปิดใช้งานเร็ว ๆ นี้"}
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
                ? "กำลังยืนยัน..."
                : paymentIntent?.provider === "sandbox"
                  ? "ยืนยันการชำระเงิน"
                  : "เปิดหน้าชำระเงินอีกครั้ง"}
            </Text>
          </Pressable>
        </View>
        {paymentMethod === "card" ? (
          <Text style={styles.note}>
            บัตรเครดิตจะเปิดหลังเพิ่มระบบเก็บ token ที่ปลอดภัยครบถ้วน
          </Text>
        ) : null}
        {paymentIntent?.checkoutUrl ? <Text style={styles.note}>ชำระเงินในหน้า Omise/QR ที่เปิดขึ้น ระบบจะยืนยันการจองหลังได้รับสถานะชำระเงิน</Text> : null}
        {paymentStatus === "error" ? <Text style={styles.error}>ชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง</Text> : null}
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
            {trackingStatus === "error" ? "ยังไม่มีตำแหน่งผู้ให้บริการสำหรับงานนี้" : "รอตำแหน่งจากผู้ให้บริการ"}
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
          <Text style={styles.trackingTitle}>สถานะการจอง</Text>
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
          <Text style={styles.trackingTitle}>ข้อความกับผู้ให้บริการ</Text>
          <Text style={styles.row}>
            {communicationStatus === "loading"
              ? "กำลังโหลดข้อความ..."
              : communications.length
                ? `${communications.length} ข้อความ`
                : "ยังไม่มีข้อความ"}
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
            placeholder="พิมพ์ข้อความถึงผู้ให้บริการ"
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
            <Text style={styles.buttonText}>{communicationStatus === "sending" ? "กำลังส่ง..." : "ส่งข้อความ"}</Text>
          </Pressable>
          {communicationStatus === "error" ? <Text style={styles.error}>ยังส่งข้อความไม่ได้ในขณะนี้</Text> : null}
          <View style={styles.supportBox}>
            <Text style={styles.trackingTitle}>ต้องการความช่วยเหลือ?</Text>
            <TextInput
              multiline
              value={supportRequestText}
              onChangeText={(text) => {
                setSupportRequestText(text);
                if (supportStatus === "sent" || supportStatus === "error") setSupportStatus("idle");
              }}
              placeholder="แจ้งทีมดูแลว่าเกิดอะไรขึ้น"
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
                <Text style={styles.supportButtonText}>ขอความช่วยเหลือ</Text>
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
                <Text style={styles.supportDangerButtonText}>แจ้งความปลอดภัย</Text>
              </Pressable>
            </View>
            {supportStatus === "sent" ? <Text style={styles.result}>ส่งเรื่องให้ทีมดูแลแล้ว</Text> : null}
            {supportStatus === "error" ? <Text style={styles.error}>ยังส่งเรื่องไม่ได้ กรุณาลองอีกครั้ง</Text> : null}
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
      <Text style={styles.note}>Wellnest จะใช้ข้อมูลนี้เพื่อจัดคิวบริการและดูแลความปลอดภัยของการจองเท่านั้น</Text>
    </View>
  );
}

function formatCommunicationActor(actorRole: string) {
  if (actorRole === "provider") return "ผู้ให้บริการ";
  if (actorRole === "admin") return "ทีมดูแล";
  return "พี่";
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
  walletStrip: {
    flexDirection: "row",
    gap: 8,
  },
  walletTile: {
    flex: 1,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  walletLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  walletValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  sectionTitleRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
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
  promoList: {
    gap: 8,
  },
  promoCard: {
    gap: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  promoTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  promoBody: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  nearbyProviderList: {
    gap: 8,
  },
  nearbyProviderCard: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  nearbyAvatar: {
    overflow: "hidden",
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.gold,
    color: colors.text,
    fontWeight: "900",
    lineHeight: 34,
    textAlign: "center",
  },
  nearbyProviderCopy: {
    flex: 1,
    gap: 2,
  },
  nearbyProviderName: {
    color: colors.text,
    fontWeight: "900",
  },
  nearbyProviderMeta: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 17,
  },
  bookingSummaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
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
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  serviceChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
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
