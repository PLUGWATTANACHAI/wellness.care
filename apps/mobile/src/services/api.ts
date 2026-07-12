import * as SecureStore from "expo-secure-store";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://wellnest-api-staging.onrender.com";
const API_TIMEOUT_MS = 15000;
const SESSION_STORAGE_PREFIX = "wellnest.session.";

export type DemoLoginRole = "customer" | "provider" | "admin";

const accessTokens: Partial<Record<DemoLoginRole, string>> = {};

const fallbackServices: ServiceItemDto[] = [
  { id: "svc_massage_90", category: "Massage", name: "นวดคอ บ่า ไหล่ 90 นาที", durationMinutes: 90, priceTHB: 1290, active: true },
  { id: "svc_beauty_90", category: "Beauty & Relax", name: "สปาเท้า + ทำเล็บ 90 นาที", durationMinutes: 90, priceTHB: 1590, active: true },
  { id: "svc_product_sleep", category: "Wellness Products", name: "Aroma Sleep Set พร้อมจัดส่ง", durationMinutes: 0, priceTHB: 690, active: true },
];

const fallbackCustomerProfile: CustomerProfileDto = {
  id: "usr_customer_001",
  name: "พี่ปลั๊ก ปภาวิน",
  phone: "0812345678",
  email: "plug@example.com",
  phoneVerified: true,
  tier: "Gold",
  coins: 2450,
  points: 860,
  address: {
    id: "addr_river_001",
    condoName: "The River Residence, Bangkok",
    meetingPoint: "Lobby A",
    note: "รอที่โซฟาหน้า concierge",
    googlePlaceId: "demo_google_place_river_bangkok",
    formattedAddress: "The River Residence, Charoen Nakhon Road, Bangkok",
    lat: 13.7214,
    lng: 100.5131,
    addressSource: "google_places_demo",
  },
};

const fallbackPartnerClinics: PartnerClinicDto[] = [
  {
    id: "clinic-sathorn",
    name: "Sathorn Wellness Clinic",
    category: "Aroma recovery",
    area: "Sathorn · 1.8 km",
    address: "Empire Tower, Sathorn, Bangkok",
    lat: 13.7207,
    lng: 100.5294,
    headline: "Recovery หลังเลิกงานใกล้คอนโดและออฟฟิศ",
    description: "Partner clinic สำหรับแพ็กเกจฟื้นฟู นวดผ่อนคลาย และ office stretch",
    promotionTitle: "After-work recovery",
    promotionBody: "รับส่วนลดเปิดตัวสำหรับรอบ 18:00-21:00 ในวันธรรมดา",
    services: [
      { serviceId: "svc_massage_90", name: "Neck & Shoulder Recovery", priceTHB: 1290, durationMinutes: 90 },
      { serviceId: "svc_aroma_120", name: "Aroma Recovery Session", priceTHB: 1890, durationMinutes: 120 },
    ],
  },
  {
    id: "clinic-langsuan",
    name: "Langsuan Recovery Studio",
    category: "Therapy room",
    area: "Langsuan · 2.4 km",
    address: "Langsuan Village, Chidlom, Bangkok",
    lat: 13.7429,
    lng: 100.5424,
    headline: "Studio care สำหรับแพ็กเกจฟื้นฟู",
    description: "คลินิกพาร์ทเนอร์สำหรับ recovery bundle และ wellness kit consultation",
    promotionTitle: "Studio care bundle",
    promotionBody: "จอง service bundle พร้อม wellness kit ได้ในรอบเดียว",
    services: [
      { serviceId: "svc_stretch_60", name: "Recovery Studio Session", priceTHB: 990, durationMinutes: 60 },
      { serviceId: "svc_product_sleep", name: "Wellness Kit Consultation", priceTHB: 690, durationMinutes: 0 },
    ],
  },
];

const fallbackClinicSlots: PartnerClinicSlotDto[] = [
  {
    id: "slot_sathorn_evening",
    clinicId: "clinic-sathorn",
    serviceId: "svc_massage_90",
    startsAt: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    capacity: 4,
    availableCount: 2,
  },
  {
    id: "slot_langsuan_late",
    clinicId: "clinic-langsuan",
    serviceId: "svc_stretch_60",
    startsAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    capacity: 3,
    availableCount: 1,
  },
];

interface StoredLoginResult {
  savedAt: number;
  result: LoginResultDto;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface ServiceItemDto {
  id: string;
  category: string;
  name: string;
  durationMinutes: number;
  priceTHB: number;
  active: boolean;
}

export interface PartnerClinicServiceDto {
  serviceId: string;
  name: string;
  priceTHB: number;
  durationMinutes: number;
}

export interface PartnerClinicDto {
  id: string;
  name: string;
  category: string;
  area: string;
  address: string;
  lat?: number;
  lng?: number;
  headline: string;
  description: string;
  promotionTitle: string;
  promotionBody: string;
  services: PartnerClinicServiceDto[];
}

export interface PartnerClinicSlotDto {
  id: string;
  clinicId: string;
  serviceId: string;
  startsAt: string;
  capacity: number;
  availableCount: number;
}

export interface BookingListItemDto {
  id: string;
  code: string;
  customer: string;
  provider?: string;
  service: string;
  status: string;
  scheduledAt: string;
  totalTHB: number;
  offerExpiresAt?: string;
  offerStatus?: "offered" | "accepted" | "rejected" | "expired";
}

export interface BookingDto {
  id: string;
  code: string;
  customerId: string;
  providerId?: string;
  serviceId: string;
  status: string;
  scheduledAt: string;
  addressId: string;
  totalTHB: number;
  locationPolicy: string;
}

export interface ProviderLocationDto {
  bookingId: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  stale: boolean;
  lastUpdatedSecondsAgo: number;
  visibility: "customer_active_booking_only";
}

export interface ProviderLocationAcceptedDto {
  bookingId: string;
  accepted: boolean;
  visibility: "customer_active_booking_only";
  retentionHours: number;
}

export interface PaymentIntentDto {
  id: string;
  bookingId: string;
  provider: string;
  providerReference: string;
  paymentMethod: "promptpay" | "card";
  amountTHB: number;
  status: "requires_confirmation" | "succeeded" | "failed";
  checkoutUrl?: string;
}

export interface PriceBreakdownDto {
  bookingId: string;
  subtotalTHB: number;
  coinsUsed: number;
  coinsDiscountTHB: number;
  pointsEarned: number;
  platformFeeTHB: number;
  totalTHB: number;
  currency: "THB";
}

export interface LoginResultDto {
  accessToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  user: {
    id: string;
    role: string;
    name: string;
    phoneVerified: boolean;
  };
}

export interface OtpRequestDto {
  challengeId: string;
  expiresInSeconds: number;
  deliveryChannel: "sms" | "tester_code";
  devOtp?: string;
}

export interface CustomerProfileDto {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  phoneVerified: boolean;
  tier: string;
  coins: number;
  points: number;
  address?: {
    id: string;
    condoName: string;
    meetingPoint: string;
    note?: string;
    googlePlaceId?: string;
    formattedAddress?: string;
    lat?: number;
    lng?: number;
    addressSource?: "manual" | "google_places" | "google_places_demo";
  };
}

export interface ProviderProfileDto {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  phoneVerified: boolean;
  rating: number;
  completedJobs: number;
  onlineStatus: "online" | "offline" | "busy";
  serviceRadiusMeters: number;
  baseLat?: number;
  baseLng?: number;
  skills?: string[];
  workingHours?: string[];
  verified: boolean;
}

export interface AddressSuggestionDto {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  source: "google_places" | "demo";
}

export interface ServiceRadiusCheckDto {
  bookingId: string;
  providerId: string;
  distanceMeters: number;
  serviceRadiusMeters: number;
  withinRadius: boolean;
}

export interface ProviderAvailabilityDto {
  serviceId: string;
  addressId: string;
  scheduledAt: string;
  available: boolean;
  availableProviderCount: number;
  nearestProvider?: {
    id: string;
    name: string;
    rating?: number;
    distanceMeters: number;
    serviceRadiusMeters: number;
    activeJobCount: number;
    assignmentScore: number;
    assignmentPolicy: "balanced_nearest_rating_load";
  };
  reason?:
    | "no_provider_online"
    | "provider_unskilled"
    | "outside_working_hours"
    | "provider_on_leave"
    | "outside_service_radius"
    | "provider_busy"
    | "missing_address_location";
}

export interface BookingSlotHoldDto {
  bookingId: string;
  held: boolean;
  expiresAt?: string;
  secondsRemaining: number;
  providerId?: string;
}

export interface NotificationDto {
  id: string;
  bookingId?: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export interface BookingTimelineDto {
  id: string;
  bookingId: string;
  status: string;
  actor: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface BookingCommunicationDto {
  id: string;
  bookingId: string;
  actor: string;
  actorRole: string;
  messageType: "customer_message" | "provider_message" | "admin_note" | "support_note" | "incident_note";
  visibility: "all_parties" | "customer_provider" | "admin_internal";
  body: string;
  createdAt: string;
}

export interface BookingSupportCaseDto {
  id: string;
  bookingId: string;
  reporterRole: "customer" | "provider";
  reasonCode: "support_request" | "unsafe_message" | "arrival_issue" | "payment_issue";
  status: "open" | "in_review" | "resolved";
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConsentType =
  | "privacy_notice"
  | "location_sharing"
  | "provider_agreement"
  | "admin_access_policy"
  | "marketing";

export async function loginDemoRole(role: DemoLoginRole) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    throw new Error("Failed to login");
  }

  const result = (await response.json()) as LoginResultDto;
  await storeLoginResult(result);
  return result;
}

export async function loginPilotRole(role: DemoLoginRole, provider: "demo" | "apple" | "facebook" | "gmail" = "demo") {
  try {
    return await loginDemoRole(role);
  } catch {
    const result: LoginResultDto = {
      accessToken: `pilot_${provider}_${role}_${Date.now()}`,
      tokenType: "Bearer",
      expiresInSeconds: 60 * 60 * 8,
      user: {
        id: role === "provider" ? "usr_provider_001" : "usr_customer_001",
        role,
        name: role === "provider" ? "นิดา สุขสบาย" : "พี่ปลั๊ก ปภาวิน",
        phoneVerified: true,
      },
    };
    await storeLoginResult(result);
    return result;
  }
}

export async function requestOtpLogin(input: { phone: string; role: "customer" | "provider" }) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/auth/otp/request`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to request OTP");
  }

  return response.json() as Promise<OtpRequestDto>;
}

export async function verifyOtpLogin(input: { challengeId: string; phone: string; otp: string }) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/auth/otp/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to verify OTP");
  }

  const result = (await response.json()) as LoginResultDto;
  await storeLoginResult(result);
  return result;
}

export function hasRoleSession(role: DemoLoginRole) {
  return Boolean(accessTokens[role]);
}

export async function loadStoredLogin(role: "customer" | "provider") {
  const storedSession = await SecureStore.getItemAsync(sessionStorageKey(role));
  if (!storedSession) return undefined;

  try {
    const parsed = JSON.parse(storedSession) as StoredLoginResult;
    const expiresAt = parsed.savedAt + parsed.result.expiresInSeconds * 1000;
    if (!parsed.result?.accessToken || Date.now() > expiresAt - 60_000) {
      await SecureStore.deleteItemAsync(sessionStorageKey(role));
      return undefined;
    }

    accessTokens[role] = parsed.result.accessToken;
    return parsed.result;
  } catch {
    await SecureStore.deleteItemAsync(sessionStorageKey(role));
    return undefined;
  }
}

export async function clearStoredLogin(role: "customer" | "provider") {
  delete accessTokens[role];
  await SecureStore.deleteItemAsync(sessionStorageKey(role));
}

async function storeLoginResult(result: LoginResultDto) {
  const role = getLoginResultRole(result);
  accessTokens[role] = result.accessToken;
  await SecureStore.setItemAsync(
    sessionStorageKey(role),
    JSON.stringify({
      savedAt: Date.now(),
      result,
    } satisfies StoredLoginResult),
  );
}

function getLoginResultRole(result: LoginResultDto): DemoLoginRole {
  if (result.user.role === "provider") return "provider";
  if (result.user.role === "admin") return "admin";
  return "customer";
}

function sessionStorageKey(role: DemoLoginRole) {
  return `${SESSION_STORAGE_PREFIX}${role}`;
}

function authHeaders(role: DemoLoginRole, extraHeaders: Record<string, string> = {}) {
  return {
    ...extraHeaders,
    "x-wellnest-role": role,
    ...(accessTokens[role] ? { authorization: `Bearer ${accessTokens[role]}` } : {}),
  };
}

export async function getServices() {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/services`);
    if (!response.ok) {
      throw new Error("Failed to load services");
    }
    return response.json() as Promise<ServiceItemDto[]>;
  } catch {
    return fallbackServices;
  }
}

export async function getPartnerClinics() {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/partner-clinics`);
    if (!response.ok) {
      throw new Error("Failed to load partner clinics");
    }
    return response.json() as Promise<PartnerClinicDto[]>;
  } catch {
    return fallbackPartnerClinics;
  }
}

export async function getPartnerClinicSlots(clinicId: string) {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/partner-clinics/${encodeURIComponent(clinicId)}/slots`, {
      headers: authHeaders("customer"),
    });

    if (!response.ok) {
      throw new Error("Failed to load partner clinic slots");
    }

    return response.json() as Promise<PartnerClinicSlotDto[]>;
  } catch {
    return fallbackClinicSlots.filter((slot) => slot.clinicId === clinicId);
  }
}

export async function createBooking(input: { serviceId: string; addressId: string; scheduledAt: string; partnerClinicId?: string }) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/bookings`, {
    method: "POST",
    headers: authHeaders("customer", {
      "content-type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create booking");
  }

  return response.json() as Promise<BookingDto>;
}

export async function checkProviderAvailability(input: { serviceId: string; addressId: string; scheduledAt: string }) {
  const params = new URLSearchParams(input);
  const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/availability?${params.toString()}`, {
    headers: authHeaders("customer"),
  });

  if (!response.ok) {
    throw new Error("Failed to check provider availability");
  }

  return response.json() as Promise<ProviderAvailabilityDto>;
}

export async function createDemoBooking(serviceId: string) {
  return createBooking({
    serviceId,
    addressId: "addr_river_001",
    scheduledAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
  });
}

export async function getProviderJobs() {
  const response = await fetchWithTimeout(`${API_BASE_URL}/provider/jobs`, {
    headers: {
      ...authHeaders("provider"),
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load provider jobs");
  }

  return response.json() as Promise<BookingListItemDto[]>;
}

export async function acceptProviderJob(bookingId: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/provider/jobs/${bookingId}/accept`, {
    method: "POST",
    headers: authHeaders("provider"),
  });

  if (!response.ok) {
    throw new Error("Failed to accept provider job");
  }

  return response.json() as Promise<{ bookingId: string; status: string; consentRecorded: boolean }>;
}

export async function rejectProviderJob(bookingId: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/provider/jobs/${bookingId}/reject`, {
    method: "POST",
    headers: authHeaders("provider"),
  });

  if (!response.ok) {
    throw new Error("Failed to reject provider job");
  }

  return response.json() as Promise<{ bookingId: string; status: string }>;
}

export async function updateProviderJobStatus(bookingId: string, status: "provider_on_the_way" | "arrived_at_lobby") {
  const response = await fetchWithTimeout(`${API_BASE_URL}/provider/jobs/${bookingId}/status`, {
    method: "POST",
    headers: authHeaders("provider", {
      "content-type": "application/json",
    }),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error("Failed to update provider job");
  }

  return response.json() as Promise<{ bookingId: string; status: string }>;
}

export async function recordConsent(
  consentType: ConsentType,
  documentVersion: string,
  sourceScreen: string,
  role: "customer" | "provider" | "admin" = "customer",
) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/privacy/consents`, {
    method: "POST",
    headers: authHeaders(role, {
      "content-type": "application/json",
    }),
    body: JSON.stringify({ consentType, documentVersion, sourceScreen }),
  });

  if (!response.ok) {
    throw new Error("Failed to record consent");
  }

  return response.json() as Promise<{
    id: string;
    userId: string;
    consentType: ConsentType;
    documentVersion: string;
    acceptedAt: string;
  }>;
}

export async function sendProviderLocation(
  bookingId: string,
  input: { lat: number; lng: number; accuracyMeters?: number },
) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/provider/jobs/${bookingId}/location`, {
    method: "POST",
    headers: authHeaders("provider", {
      "content-type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to send provider location");
  }

  return response.json() as Promise<ProviderLocationAcceptedDto>;
}

export async function getProviderLocation(bookingId: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/${bookingId}/provider-location`, {
    headers: authHeaders("customer"),
  });

  if (!response.ok) {
    throw new Error("Failed to load provider location");
  }

  return response.json() as Promise<ProviderLocationDto>;
}

export async function createPaymentIntent(input: {
  bookingId: string;
  method: "promptpay" | "card";
  cardToken?: string;
}) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/payments/create-intent`, {
    method: "POST",
    headers: authHeaders("customer", {
      "content-type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create payment intent");
  }

  return response.json() as Promise<PaymentIntentDto>;
}

export async function getPriceBreakdown(bookingId: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/payments/breakdown?bookingId=${encodeURIComponent(bookingId)}`, {
    headers: authHeaders("customer"),
  });

  if (!response.ok) {
    throw new Error("Failed to load price breakdown");
  }

  return response.json() as Promise<PriceBreakdownDto>;
}

export async function confirmSandboxPayment(paymentId: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/payments/${paymentId}/confirm-sandbox`, {
    method: "POST",
    headers: authHeaders("customer"),
  });

  if (!response.ok) {
    throw new Error("Failed to confirm payment");
  }

  return response.json() as Promise<PaymentIntentDto>;
}

export async function getCustomerProfile() {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/profile/customer`, {
      headers: authHeaders("customer"),
    });

    if (!response.ok) {
      throw new Error("Failed to load customer profile");
    }

    return response.json() as Promise<CustomerProfileDto>;
  } catch {
    return fallbackCustomerProfile;
  }
}

export async function updateCustomerProfile(input: { name?: string; phone?: string; email?: string }) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/profile/customer`, {
    method: "PATCH",
    headers: authHeaders("customer", {
      "content-type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to update customer profile");
  }

  return response.json() as Promise<CustomerProfileDto>;
}

export async function updateCustomerAddress(input: {
  condoName?: string;
  meetingPoint?: string;
  note?: string;
  googlePlaceId?: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
  addressSource?: "manual" | "google_places" | "google_places_demo";
}) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/profile/customer/address`, {
    method: "PATCH",
    headers: authHeaders("customer", {
      "content-type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to update customer address");
  }

  return response.json() as Promise<CustomerProfileDto>;
}

export async function searchAddressSuggestions(query: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/maps/address-suggestions?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error("Failed to search address suggestions");
  }

  return response.json() as Promise<AddressSuggestionDto[]>;
}

export async function checkProviderServiceRadius(bookingId: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/provider/jobs/${bookingId}/service-radius`, {
    headers: authHeaders("provider"),
  });

  if (!response.ok) {
    throw new Error("Failed to check provider service radius");
  }

  return response.json() as Promise<ServiceRadiusCheckDto>;
}

export async function getProviderProfile() {
  const response = await fetchWithTimeout(`${API_BASE_URL}/profile/provider`, {
    headers: authHeaders("provider"),
  });

  if (!response.ok) {
    throw new Error("Failed to load provider profile");
  }

  return response.json() as Promise<ProviderProfileDto>;
}

export async function updateProviderProfile(input: { onlineStatus?: "online" | "offline" | "busy" }) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/profile/provider`, {
    method: "PATCH",
    headers: authHeaders("provider", {
      "content-type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to update provider profile");
  }

  return response.json() as Promise<ProviderProfileDto>;
}

export async function getNotifications(role: "customer" | "provider" = "customer") {
  const response = await fetchWithTimeout(`${API_BASE_URL}/notifications`, {
    headers: authHeaders(role),
  });

  if (!response.ok) {
    throw new Error("Failed to load notifications");
  }

  return response.json() as Promise<NotificationDto[]>;
}

export async function markNotificationRead(notificationId: string, role: "customer" | "provider" = "customer") {
  const response = await fetchWithTimeout(`${API_BASE_URL}/notifications/${notificationId}/read`, {
    method: "POST",
    headers: authHeaders(role),
  });

  if (!response.ok) {
    throw new Error("Failed to mark notification read");
  }

  return response.json() as Promise<{ id: string; readAt?: string; read?: boolean }>;
}

export async function getBookingTimeline(bookingId: string, role: "customer" | "provider" = "customer") {
  const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/${bookingId}/timeline`, {
    headers: authHeaders(role),
  });

  if (!response.ok) {
    throw new Error("Failed to load booking timeline");
  }

  return response.json() as Promise<BookingTimelineDto[]>;
}

export async function getBookingCommunications(bookingId: string, role: "customer" | "provider" = "customer") {
  const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/${bookingId}/communications`, {
    headers: authHeaders(role),
  });

  if (!response.ok) {
    throw new Error("Failed to load booking communications");
  }

  return response.json() as Promise<BookingCommunicationDto[]>;
}

export async function createBookingCommunication(
  bookingId: string,
  input: {
    body: string;
    messageType?: BookingCommunicationDto["messageType"];
    visibility?: BookingCommunicationDto["visibility"];
  },
  role: "customer" | "provider" = "customer",
) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/${bookingId}/communications`, {
    method: "POST",
    headers: authHeaders(role, {
      "content-type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create booking communication");
  }

  return response.json() as Promise<BookingCommunicationDto>;
}

export async function createBookingSupportRequest(
  bookingId: string,
  input: {
    body: string;
    reasonCode?: "support_request" | "unsafe_message" | "arrival_issue" | "payment_issue";
  },
  role: "customer" | "provider" = "customer",
) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/${bookingId}/support-requests`, {
    method: "POST",
    headers: authHeaders(role, {
      "content-type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create booking support request");
  }

  return response.json() as Promise<BookingCommunicationDto>;
}

export async function getBookingSupportCases(bookingId: string, role: "customer" | "provider" = "customer") {
  const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/${bookingId}/support-cases`, {
    headers: authHeaders(role),
  });

  if (!response.ok) {
    throw new Error("Failed to load booking support cases");
  }

  return response.json() as Promise<BookingSupportCaseDto[]>;
}

export async function getBookingSlotHold(bookingId: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/${bookingId}/slot-hold`, {
    headers: authHeaders("customer"),
  });

  if (!response.ok) {
    throw new Error("Failed to load booking slot hold");
  }

  return response.json() as Promise<BookingSlotHoldDto>;
}
