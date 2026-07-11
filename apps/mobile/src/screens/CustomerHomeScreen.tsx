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
  getPartnerClinics,
  getPartnerClinicSlots,
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
  type PartnerClinicDto,
  type PartnerClinicSlotDto,
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

const awCampaign = {
  eyebrow: "Featured campaign",
  title: "Wellness Week Privilege",
  body: "พื้นที่ AW สำหรับ artwork โปรโมชันหลัก ส่วนลดสมาชิก หรือแคมเปญพาร์ทเนอร์",
};

const fallbackPartnerClinics: PartnerClinicDto[] = [
  {
    id: "clinic_sathorn_wellness",
    name: "Sathorn Wellness Clinic",
    category: "Recovery clinic",
    area: "Sathorn · 1.8 km",
    address: "Empire Tower, Sathorn",
    headline: "Aroma recovery และ office stretch หลังเลิกงาน",
    description: "เหมาะกับลูกค้าที่ต้องการเข้าคลินิกพาร์ทเนอร์ใกล้ออฟฟิศหรือคอนโด",
    promotionTitle: "After-work recovery",
    promotionBody: "รับส่วนลดเปิดตัวสำหรับรอบ 18:00-21:00 ในวันธรรมดา",
    services: [
      { serviceId: "svc_beauty_90", name: "Aroma Recovery Session", priceTHB: 1590, durationMinutes: 90 },
      { serviceId: "svc_massage_90", name: "Neck & Shoulder Recovery", priceTHB: 1290, durationMinutes: 90 },
    ],
  },
  {
    id: "clinic_langsuan_recovery",
    name: "Langsuan Recovery Studio",
    category: "Recovery studio",
    area: "Langsuan · 2.4 km",
    address: "Langsuan Village, Chidlom",
    headline: "Therapy room และ wellness kit สำหรับการฟื้นฟู",
    description: "เหมาะกับแพ็กเกจดูแลตัวเองที่ต้องใช้ห้องบริการของคลินิก",
    promotionTitle: "Studio care bundle",
    promotionBody: "จอง service bundle พร้อม wellness kit ได้ในรอบเดียว",
    services: [
      { serviceId: "svc_product_sleep", name: "Wellness Kit Consultation", priceTHB: 690, durationMinutes: 0 },
      { serviceId: "svc_beauty_90", name: "Recovery Studio Session", priceTHB: 1590, durationMinutes: 90 },
    ],
  },
];

export function CustomerHomeScreen() {
  const [services, setServices] = useState<ServiceItemDto[]>([]);
  const [partnerClinics, setPartnerClinics] = useState<PartnerClinicDto[]>(fallbackPartnerClinics);
  const [clinicSlots, setClinicSlots] = useState<PartnerClinicSlotDto[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();
  const [selectedClinicId, setSelectedClinicId] = useState<string | undefined>();
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
  const [bookingFlow, setBookingFlow] = useState<"home" | "service" | "clinic">("home");
  const [bookingStep, setBookingStep] = useState(1);

  useEffect(() => {
    Promise.all([
      getServices(),
      getCustomerProfile(),
      getPartnerClinics().catch(() => fallbackPartnerClinics),
    ])
      .then(([items, profile, clinics]) => {
        setServices(items);
        setSelectedServiceId(items[0]?.id);
        setCustomerProfile(profile);
        setPartnerClinics(clinics.length ? clinics : fallbackPartnerClinics);
        setAddressConfirmed(Boolean(profile.address?.id && profile.address.googlePlaceId));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (!selectedClinicId) {
      setClinicSlots([]);
      return;
    }

    getPartnerClinicSlots(selectedClinicId)
      .then(setClinicSlots)
      .catch(() => setClinicSlots([]));
  }, [selectedClinicId]);

  async function handleCreateBooking() {
    if (!selectedServiceId || !customerProfile?.address?.id || !addressConfirmed || !availability?.available) return;

    setStatus("creating");
    try {
      const booking = await createBooking({
        serviceId: selectedServiceId,
        addressId: customerProfile.address.id,
        scheduledAt: getSelectedScheduledAt(),
        partnerClinicId: selectedClinicId,
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
      setBookingStep(selectedClinicId ? 5 : 4);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const selectedClinic = partnerClinics.find((clinic) => clinic.id === selectedClinicId);
  const selectedClinicService = selectedClinic?.services.find((service) => service.serviceId === selectedServiceId);
  const isBookingFlowActive = bookingFlow !== "home";
  const dateTimeStep = selectedClinic ? 3 : 2;
  const confirmStep = selectedClinic ? 4 : 3;
  const paymentStep = selectedClinic ? 5 : 4;
  const clinicBookingSlots = clinicSlots.length
    ? clinicSlots.map((slot) => ({
        id: slot.id,
        label: formatClinicSlot(slot.startsAt),
        scheduledAt: slot.startsAt,
        serviceId: slot.serviceId,
      }))
    : bookingSlots.map((slot) => ({
        id: `clinic_${slot.id}`,
        label: slot.label,
        scheduledAt: new Date(Date.now() + slot.offsetHours * 60 * 60 * 1000).toISOString(),
        serviceId: selectedClinicService?.serviceId ?? selectedClinic?.services[0]?.serviceId,
      }));
  const visibleBookingSlots = selectedClinic ? clinicBookingSlots : bookingSlots;
  const selectedSlot = bookingSlots.find((slot) => slot.id === selectedSlotId) || bookingSlots[0];
  const selectedClinicSlot = clinicBookingSlots.find((slot) => slot.id === selectedSlotId) || clinicBookingSlots[0];
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
    if (selectedClinic && selectedClinicSlot?.scheduledAt) return selectedClinicSlot.scheduledAt;
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
  const bookingProgress = selectedClinic
    ? [
        { label: "คลินิก", done: bookingStep > 1, active: bookingStep === 1 },
        { label: "หน้าคลินิก", done: bookingStep > 2, active: bookingStep === 2 },
        { label: "วัน/เวลา", done: bookingStep > 3, active: bookingStep === 3 },
        { label: "ยืนยัน", done: bookingStep > 4, active: bookingStep === 4 },
        { label: "ชำระเงิน", done: paymentIntent?.status === "succeeded", active: bookingStep === 5 },
      ]
    : [
        { label: "บริการ", done: bookingStep > 1, active: bookingStep === 1 },
        { label: "เวลา", done: bookingStep > 2, active: bookingStep === 2 },
        { label: "ที่อยู่", done: bookingStep > 3, active: bookingStep === 3 },
        { label: "ชำระเงิน", done: paymentIntent?.status === "succeeded", active: bookingStep === 4 },
      ];
  const paymentReadyText = latestBooking
    ? reviewAccepted
      ? priceBreakdown && slotHold?.held
        ? `พร้อมชำระ ฿${priceBreakdown.totalTHB.toLocaleString("th-TH")}`
        : "คิวหมดเวลา กรุณาจองใหม่อีกครั้ง"
      : "กรุณายืนยันข้อมูลก่อนชำระเงิน"
    : "กรุณายืนยันการจองก่อนชำระเงิน";

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
      {!isBookingFlowActive ? (
        <>
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
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryLabel}>Private wellness</Text>
          <Text style={styles.summaryTitle}>จองบริการดูแลตัวเองแบบส่วนตัว</Text>
          <Text style={styles.summaryMeta}>เลือกบริการ เวลา และพื้นที่ให้ชัดเจน แล้วระบบจะจัดการขั้นตอนถัดไปอย่างเป็นระเบียบ</Text>
        </View>
        <View style={styles.heroTrustCard}>
          <Text style={styles.heroTrustTitle}>Verified care</Text>
          <Text style={styles.heroTrustMeta}>ยืนยันพื้นที่ก่อนจอง · ชำระเงินผ่านระบบ · ติดตามสถานะได้</Text>
        </View>
      </View>
      <View style={styles.awPanel}>
        <View style={styles.awMark}>
          <Text style={styles.awMarkText}>AW</Text>
        </View>
        <View style={styles.awCopy}>
          <Text style={styles.awEyebrow}>{awCampaign.eyebrow}</Text>
          <Text style={styles.awTitle}>{awCampaign.title}</Text>
          <Text style={styles.awBody}>{awCampaign.body}</Text>
        </View>
      </View>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>เลือกบริการหลัก</Text>
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
                setSelectedClinicId(undefined);
                setBookingFlow("service");
                setBookingStep(2);
                setAddressConfirmed(Boolean(customerProfile?.address?.id && customerProfile.address.googlePlaceId));
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
        <Text style={styles.sectionTitle}>Partner Clinics</Text>
        <Text style={styles.sectionAction}>จองกับคลินิก</Text>
      </View>
      <View style={styles.clinicList}>
        {partnerClinics.map((clinic) => (
          <Pressable
            accessibilityRole="button"
            key={clinic.id}
            onPress={() => {
              setSelectedServiceId(clinic.services[0]?.serviceId);
              setSelectedClinicId(clinic.id);
              setBookingFlow("clinic");
              setBookingStep(2);
              setSelectedSlotId(`clinic_${bookingSlots[0].id}`);
              setAddressConfirmed(false);
              resetAvailability();
            }}
            style={({ pressed }) => [
              styles.clinicCard,
              selectedClinicId === clinic.id ? styles.clinicCardActive : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.clinicLogo}>{clinic.name.slice(0, 1)}</Text>
            <View style={styles.clinicCopy}>
              <Text style={styles.clinicName}>{clinic.name}</Text>
              <Text style={styles.clinicType}>{clinic.category}</Text>
              <Text style={styles.clinicMeta}>{clinic.area} · {clinic.headline}</Text>
            </View>
            <Text style={styles.clinicCta}>{selectedClinicId === clinic.id ? "เลือกแล้ว" : "จอง"}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.homeReadyCard}>
          <Text style={styles.homeReadyTitle}>เลือกบริการหรือคลินิกเพื่อเริ่มจอง</Text>
          <Text style={styles.homeReadyCopy}>
            หน้า Home จะเก็บเฉพาะบริการ โปรโมชัน และพาร์ทเนอร์คลินิก ส่วนรายละเอียดวันเวลา ยืนยัน และชำระเงินจะเปิดหลังพี่เลือกสิ่งที่ต้องการ
          </Text>
        </View>
        </>
      ) : null}
      {isBookingFlowActive ? (
        <>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>เริ่มจองบริการ</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setBookingFlow("home");
            setSelectedClinicId(undefined);
            resetAvailability();
          }}
        >
          <Text style={styles.sectionAction}>กลับหน้า Home</Text>
        </Pressable>
      </View>
      <View style={styles.flowModeCard}>
        <Text style={styles.flowModeLabel}>{selectedClinic ? "Clinic booking flow" : "At-home service flow"}</Text>
        <Text style={styles.flowModeTitle}>{selectedClinic?.name ?? selectedService?.name ?? "เลือกบริการ"}</Text>
        <Text style={styles.flowModeCopy}>
          {selectedClinic
            ? "ลำดับ: คลินิก > หน้าคลินิกนั้น > วัน/เวลา > ยืนยัน > ชำระเงิน"
            : "ลำดับ: บริการ > วัน/เวลา > ที่อยู่ > ตรวจผู้ให้บริการ > ชำระเงิน"}
        </Text>
      </View>
      {selectedClinic && bookingStep === 2 ? (
        <View style={styles.selectedClinicCard}>
          <Text style={styles.selectedClinicLabel}>คลินิกที่เลือก</Text>
          <Text style={styles.selectedClinicName}>{selectedClinic.name}</Text>
          <Text style={styles.selectedClinicMeta}>{selectedClinic.area} · {selectedClinic.address}</Text>
        </View>
      ) : null}
      {selectedClinic && bookingStep === 2 ? (
        <View style={styles.clinicDetailCard}>
          <View style={styles.clinicHeroRow}>
            <Text style={styles.clinicDetailMark}>{selectedClinic.name.slice(0, 1)}</Text>
            <View style={styles.clinicDetailCopy}>
              <Text style={styles.selectedClinicLabel}>หน้าคลินิกพาร์ทเนอร์</Text>
              <Text style={styles.clinicDetailTitle}>{selectedClinic.headline}</Text>
              <Text style={styles.clinicDetailMeta}>{selectedClinic.description}</Text>
            </View>
          </View>
          <View style={styles.clinicPromoCard}>
            <Text style={styles.clinicPromoLabel}>โปรโมชั่นคลินิก</Text>
            <Text style={styles.clinicPromoTitle}>{selectedClinic.promotionTitle}</Text>
            <Text style={styles.clinicPromoBody}>{selectedClinic.promotionBody}</Text>
          </View>
          <Text style={styles.clinicPackageTitle}>รายการที่จองได้</Text>
          {selectedClinic.services.map((service) => {
            const active = service.serviceId === selectedServiceId;

            return (
              <Pressable
                accessibilityRole="button"
                key={service.serviceId}
                onPress={() => {
                  setSelectedServiceId(service.serviceId);
                  setSelectedSlotId(clinicBookingSlots.find((slot) => slot.serviceId === service.serviceId)?.id ?? clinicBookingSlots[0]?.id ?? `clinic_${bookingSlots[0].id}`);
                  resetAvailability();
                }}
                style={({ pressed }) => [
                  styles.clinicPackageCard,
                  active ? styles.clinicPackageCardActive : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <View style={styles.clinicPackageCopy}>
                  <Text style={styles.clinicPackageName}>{service.name}</Text>
                  <Text style={styles.clinicPackageMeta}>
                    {service.durationMinutes || "delivery"} min · ฿{service.priceTHB.toLocaleString("th-TH")}
                  </Text>
                </View>
                <Text style={styles.clinicPackageCta}>{active ? "เลือกแล้ว" : "เลือก"}</Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            onPress={() => setBookingStep(3)}
            style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
          >
            <Text style={styles.buttonText}>เลือกวันและเวลา</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.bookingProgressCard}>
        <View style={styles.progressTrack}>
          {bookingProgress.map((step, index) => (
            <View key={step.label} style={styles.progressItem}>
              <Text
                style={[
                  styles.progressDot,
                  step.done ? styles.progressDotDone : null,
                  step.active && !step.done ? styles.progressDotActive : null,
                ]}
              >
                {step.done ? "✓" : index + 1}
              </Text>
              <Text style={[styles.progressLabel, step.done || step.active ? styles.progressLabelActive : null]}>{step.label}</Text>
            </View>
          ))}
        </View>
      </View>
      {bookingStep === dateTimeStep ? <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>{selectedClinic ? "3" : "2"}</Text>
          <View>
            <Text style={styles.trackingTitle}>{selectedClinic ? "เลือกเวลาที่คลินิก" : "เลือกวันและเวลา"}</Text>
            <Text style={styles.stepCaption}>
              {selectedClinic ? "ช่วงเวลาที่คลินิกพาร์ทเนอร์รับ booking" : "เวลาที่ผู้ให้บริการสามารถเตรียมงานได้"}
            </Text>
          </View>
        </View>
        <View style={styles.slotList}>
          {visibleBookingSlots.map((slot) => {
            const active = slot.id === selectedSlotId;

            return (
              <Pressable
                accessibilityRole="button"
                key={slot.id}
                onPress={() => {
                  setSelectedSlotId(slot.id);
                  if ("serviceId" in slot && slot.serviceId) setSelectedServiceId(slot.serviceId);
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
        <Pressable
          accessibilityRole="button"
          onPress={() => setBookingStep(confirmStep)}
          style={({ pressed }) => [styles.buttonSecondary, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.buttonSecondaryText}>{selectedClinic ? "ยืนยันรอบคลินิก" : "ยืนยันวันเวลา"}</Text>
        </Pressable>
      </View> : null}
      {bookingStep === confirmStep ? <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>{selectedClinic ? "4" : "3"}</Text>
          <View>
            <Text style={styles.trackingTitle}>{selectedClinic ? "ยืนยันคลินิกพาร์ทเนอร์" : "ยืนยันที่อยู่บริการ"}</Text>
            <Text style={styles.stepCaption}>
              {selectedClinic ? "ระบบจะส่งคำขอจองไปยังคลินิกนี้ และยืนยันรายละเอียดก่อนชำระเงิน" : "ใช้ตำแหน่งจากแผนที่เพื่อให้ผู้ให้บริการเดินทางถูกต้อง"}
            </Text>
          </View>
        </View>
        {selectedClinic ? (
          <View style={styles.clinicBookingCard}>
            <Text style={styles.selectedClinicLabel}>Partner clinic</Text>
            <Text style={styles.selectedClinicName}>{selectedClinic.name}</Text>
            <Text style={styles.selectedClinicMeta}>{selectedClinic.address} · {selectedClinic.area}</Text>
            <Text style={styles.policyText}>รอบ production จะบันทึก clinic location เป็นข้อมูลแยกจากที่อยู่คอนโดของลูกค้า</Text>
          </View>
        ) : (
          <>
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
          </>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={!selectedClinic && !customerAddress?.googlePlaceId}
          onPress={() => {
            setAddressConfirmed((confirmed) => !confirmed);
            resetAvailability();
          }}
          style={({ pressed }) => [
            styles.confirmButton,
            addressConfirmed ? styles.confirmButtonActive : null,
            !selectedClinic && !customerAddress?.googlePlaceId ? styles.buttonDisabled : null,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={[styles.confirmButtonText, addressConfirmed ? styles.confirmButtonTextActive : null]}>
            {selectedClinic
              ? addressConfirmed ? "ยืนยันคลินิกนี้แล้ว" : "ยืนยันคลินิกนี้"
              : addressConfirmed ? "ยืนยันที่อยู่นี้แล้ว" : "ยืนยันที่อยู่นี้"}
          </Text>
        </Pressable>
      </View> : null}
      {bookingStep === confirmStep ? <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>{selectedClinic ? "4" : "3"}</Text>
          <View>
            <Text style={styles.trackingTitle}>{selectedClinic ? "ตรวจรอบว่างของคลินิก" : "ตรวจผู้ให้บริการ"}</Text>
            <Text style={styles.stepCaption}>
              {selectedClinic ? "รอบนี้ยังใช้ availability pipeline เดิม และเตรียมต่อ clinic slots ใน production" : "ระบบจะจับคู่จากบริการ เวลา และพื้นที่ของพี่"}
            </Text>
          </View>
        </View>
        <Text style={styles.row}>
          {availability?.available && availability.nearestProvider
            ? selectedClinic
              ? `${selectedClinic.name} รับคำขอจองได้ · ใช้บริการ ${selectedService?.name ?? "ที่เลือก"}`
              : `${availability.nearestProvider.name} พร้อมให้บริการ · ${(availability.nearestProvider.distanceMeters / 1000).toFixed(2)} กม.`
            : availabilityStatus === "unavailable"
              ? describeAvailabilityReason(availability?.reason)
              : selectedClinic ? "กดตรวจรอบว่างของคลินิกก่อนยืนยันการจอง" : "กดตรวจผู้ให้บริการก่อนยืนยันการจอง"}
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
                ? selectedClinic ? "คลินิกพร้อมรับจอง" : "มีผู้ให้บริการพร้อม"
                : selectedClinic ? "ตรวจรอบว่างคลินิก" : "ตรวจผู้ให้บริการ"}
          </Text>
        </Pressable>
      </View> : null}
      {bookingStep === confirmStep ? <Pressable
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
      </Pressable> : null}
      {latestBooking && bookingStep === paymentStep ? (
        <View style={styles.bookingConfirmedCard}>
          <View>
            <Text style={styles.confirmedLabel}>Booking confirmed</Text>
            <Text style={styles.confirmedCode}>{latestBooking.code}</Text>
          </View>
          <View style={styles.confirmedPill}>
            <Text style={styles.confirmedPillText}>{formatBookingStatus(latestBooking.status)}</Text>
          </View>
          <Text style={styles.confirmedMeta}>
            {selectedClinic ? `${selectedClinic.name} · ` : ""}{selectedClinic ? selectedClinicSlot?.label : selectedSlot.label} · {selectedClinicService?.name ?? selectedService?.name ?? latestBooking.serviceId}
          </Text>
          <Text style={styles.confirmedMeta}>
            {slotHold?.held ? `คิวถูกล็อกไว้ · เหลือ ${holdCountdownText}` : "คิวหมดเวลา กรุณาตรวจผู้ให้บริการอีกครั้ง"}
          </Text>
        </View>
      ) : null}
      {latestBooking && bookingStep === paymentStep ? (
        <View style={styles.reviewBox}>
          <Text style={styles.trackingTitle}>ตรวจสอบก่อนชำระเงิน</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>บริการ</Text>
            <Text style={styles.reviewValue}>{selectedClinicService?.name ?? selectedService?.name ?? latestBooking.serviceId}</Text>
          </View>
          {selectedClinic ? (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>คลินิก</Text>
              <Text style={styles.reviewValue}>{selectedClinic.name}</Text>
            </View>
          ) : null}
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>วันและเวลา</Text>
            <Text style={styles.reviewValue}>{selectedClinic ? selectedClinicSlot?.label : selectedSlot.label}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{selectedClinic ? "สถานที่" : "ที่อยู่"}</Text>
            <Text style={styles.reviewValue}>
              {selectedClinic
                ? selectedClinic.address
                : customerAddress ? `${customerAddress.condoName} · ${customerAddress.meetingPoint || "meeting point not set"}` : latestBooking.addressId}
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
              styles.reviewConsentRow,
              reviewAccepted ? styles.reviewConsentRowActive : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={[styles.reviewCheckbox, reviewAccepted ? styles.reviewCheckboxActive : null]}>{reviewAccepted ? "✓" : ""}</Text>
            <Text style={[styles.reviewConsentText, reviewAccepted ? styles.reviewConsentTextActive : null]}>
              {selectedClinic
                ? "ตรวจสอบบริการ เวลา คลินิก ยอดชำระ และเงื่อนไขการยกเลิกแล้ว"
                : "ตรวจสอบบริการ เวลา ที่อยู่ ยอดชำระ และเงื่อนไขการยกเลิกแล้ว"}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {latestBooking && bookingStep === paymentStep ? <View style={styles.paymentBox}>
        <View style={styles.paymentHeader}>
          <View>
            <Text style={styles.trackingTitle}>ชำระเงิน</Text>
            <Text style={styles.paymentCaption}>PromptPay / QR พร้อมใช้ก่อน บัตรเครดิตจะตามหลังเมื่อ tokenization พร้อม</Text>
          </View>
          <Text style={styles.paymentStatusBadge}>{paymentIntent?.status === "succeeded" ? "Paid" : "Pending"}</Text>
        </View>
        <View style={styles.paymentReadyCard}>
          <Text style={styles.paymentReadyLabel}>ยอดสำหรับรายการนี้</Text>
          <Text style={styles.paymentReadyValue}>
            {priceBreakdown ? `฿${priceBreakdown.totalTHB.toLocaleString("th-TH")}` : latestBooking ? `฿${latestBooking.totalTHB.toLocaleString("th-TH")}` : "รอยืนยันการจอง"}
          </Text>
          <Text style={styles.paymentReadyMeta}>{paymentReadyText}</Text>
        </View>
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
            disabled
            onPress={() => {
              setPaymentMethod("card");
              setPaymentIntent(undefined);
            }}
            style={({ pressed }) => [
              styles.methodChip,
              paymentMethod === "card" ? styles.methodChipActive : null,
              styles.methodChipDisabled,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={[styles.methodChipText, paymentMethod === "card" ? styles.methodChipTextActive : null]}>
              บัตรเครดิต · เร็ว ๆ นี้
            </Text>
          </Pressable>
        </View>
        {paymentIntent ? (
          <View style={styles.qrPreviewCard}>
            <Text style={styles.qrMark}>QR</Text>
            <View style={styles.qrCopy}>
              <Text style={styles.qrTitle}>{paymentIntent.provider === "sandbox" ? "Sandbox PromptPay" : "Opn / Omise Checkout"}</Text>
              <Text style={styles.qrMeta}>฿{paymentIntent.amountTHB.toLocaleString("th-TH")} · {paymentIntent.paymentMethod} · {paymentIntent.status}</Text>
            </View>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={
            paymentIntent
              ? paymentIntent.status === "succeeded" || paymentStatus === "confirming"
              : !canCreatePaymentIntent
          }
          onPress={paymentIntent ? handleConfirmPayment : handleCreatePaymentIntent}
          style={({ pressed }) => [
            styles.button,
            paymentIntent
              ? paymentIntent.status === "succeeded" || paymentStatus === "confirming" ? styles.buttonDisabled : null
              : !canCreatePaymentIntent ? styles.buttonDisabled : null,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.buttonText}>
            {paymentStatus === "creating"
              ? "กำลังสร้าง QR..."
              : paymentStatus === "confirming"
                ? "กำลังตรวจสอบ..."
                : paymentIntent
                  ? paymentIntent.provider === "sandbox"
                    ? "ตรวจสอบสถานะชำระเงิน"
                    : "เปิดหน้าชำระเงินอีกครั้ง"
                  : "สร้าง QR เพื่อชำระเงิน"}
          </Text>
        </Pressable>
        {paymentMethod === "card" ? (
          <Text style={styles.note}>
            บัตรเครดิตจะเปิดหลังเพิ่มระบบเก็บ token ที่ปลอดภัยครบถ้วน
          </Text>
        ) : null}
        {paymentIntent?.checkoutUrl ? <Text style={styles.note}>ชำระเงินในหน้า Omise/QR ที่เปิดขึ้น ระบบจะยืนยันการจองหลังได้รับสถานะชำระเงิน</Text> : null}
        {paymentStatus === "error" ? <Text style={styles.error}>ชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง</Text> : null}
      </View> : null}
      {latestBooking && bookingStep === paymentStep ? <View style={styles.trackingBox}>
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
      </View> : null}
      {timeline.length > 0 && bookingStep === paymentStep ? (
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
              placeholderTextColor={colors.textMuted}
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
        </>
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

function formatClinicSlot(startsAt: string) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));
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
  homeReadyCard: {
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    padding: 14,
  },
  homeReadyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  homeReadyCopy: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  flowModeCard: {
    gap: 5,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    padding: 14,
  },
  flowModeLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  flowModeTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  flowModeCopy: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  bookingProgressCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    padding: 10,
  },
  progressTrack: {
    flexDirection: "row",
    gap: 4,
  },
  progressItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  progressDot: {
    overflow: "hidden",
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    backgroundColor: colors.surface,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "center",
  },
  progressDotDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    color: colors.surface,
  },
  progressDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.gold,
    color: colors.text,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  progressLabelActive: {
    color: colors.primaryDark,
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
    gap: 14,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
    padding: 16,
  },
  summaryCopy: {
    flex: 1,
    gap: 4,
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
  heroTrustCard: {
    width: 118,
    gap: 6,
    alignSelf: "flex-end",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 10,
  },
  heroTrustTitle: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900",
  },
  heroTrustMeta: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    lineHeight: 14,
  },
  awPanel: {
    minHeight: 142,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    padding: 14,
  },
  awMark: {
    width: 72,
    height: 94,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(109,76,47,0.2)",
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
  },
  awMarkText: {
    color: colors.gold,
    fontSize: 23,
    fontWeight: "900",
  },
  awCopy: {
    flex: 1,
    gap: 5,
  },
  awEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  awTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
  awBody: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
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
  clinicList: {
    gap: 8,
  },
  clinicCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clinicCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  clinicLogo: {
    overflow: "hidden",
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
    color: colors.gold,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 42,
    textAlign: "center",
  },
  clinicCopy: {
    flex: 1,
    gap: 2,
  },
  clinicName: {
    color: colors.text,
    fontWeight: "900",
  },
  clinicType: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  clinicMeta: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  clinicCta: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  selectedClinicCard: {
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
  },
  selectedClinicLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  selectedClinicName: {
    color: colors.text,
    fontWeight: "900",
  },
  selectedClinicMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  clinicBookingCard: {
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
  },
  clinicDetailCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    padding: 12,
  },
  clinicHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clinicDetailMark: {
    overflow: "hidden",
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
    color: colors.gold,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 46,
    textAlign: "center",
  },
  clinicDetailCopy: {
    flex: 1,
    gap: 3,
  },
  clinicDetailTitle: {
    color: colors.text,
    fontWeight: "900",
    lineHeight: 19,
  },
  clinicDetailMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  clinicPromoCard: {
    gap: 3,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 10,
  },
  clinicPromoLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  clinicPromoTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  clinicPromoBody: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  clinicPackageTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  clinicPackageCard: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 10,
  },
  clinicPackageCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  clinicPackageCopy: {
    flex: 1,
    gap: 2,
  },
  clinicPackageName: {
    color: colors.text,
    fontWeight: "900",
  },
  clinicPackageMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  clinicPackageCta: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
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
  bookingConfirmedCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
    padding: 12,
  },
  confirmedLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  confirmedCode: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
  },
  confirmedPill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: colors.gold,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  confirmedPillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  confirmedMeta: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 20,
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
  reviewConsentRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  reviewConsentRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  reviewCheckbox: {
    overflow: "hidden",
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 6,
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "center",
  },
  reviewCheckboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  reviewConsentText: {
    flex: 1,
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  reviewConsentTextActive: {
    color: colors.primaryDark,
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
    backgroundColor: colors.surfaceSoft,
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
    backgroundColor: colors.surfaceSoft,
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
    backgroundColor: colors.surfaceSoft,
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
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  methodChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  methodChipDisabled: {
    opacity: 0.55,
  },
  methodChipText: {
    color: colors.textSoft,
    fontWeight: "800",
  },
  methodChipTextActive: {
    color: colors.primaryDark,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  paymentCaption: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  paymentStatusBadge: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.gold,
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  paymentReadyCard: {
    gap: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 10,
  },
  paymentReadyLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  paymentReadyValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  paymentReadyMeta: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  qrPreviewCard: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 10,
  },
  qrMark: {
    overflow: "hidden",
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.text,
    color: colors.surface,
    fontWeight: "900",
    lineHeight: 42,
    textAlign: "center",
  },
  qrCopy: {
    flex: 1,
    gap: 2,
  },
  qrTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  qrMeta: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
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
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  timelineTitle: {
    color: colors.text,
    fontWeight: "800",
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
    borderTopColor: colors.border,
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
