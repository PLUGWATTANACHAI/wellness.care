const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type DemoLoginRole = "customer" | "provider" | "admin";

const accessTokens: Partial<Record<DemoLoginRole, string>> = {};

export interface ServiceItemDto {
  id: string;
  category: string;
  name: string;
  durationMinutes: number;
  priceTHB: number;
  active: boolean;
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
  provider: "sandbox";
  providerReference: string;
  amountTHB: number;
  status: "requires_confirmation" | "succeeded";
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
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
  accessTokens[role] = result.accessToken;
  return result;
}

function authHeaders(role: DemoLoginRole, extraHeaders: Record<string, string> = {}) {
  return {
    ...extraHeaders,
    "x-wellnest-role": role,
    ...(accessTokens[role] ? { authorization: `Bearer ${accessTokens[role]}` } : {}),
  };
}

export async function getServices() {
  const response = await fetch(`${API_BASE_URL}/services`);
  if (!response.ok) {
    throw new Error("Failed to load services");
  }
  return response.json() as Promise<ServiceItemDto[]>;
}

export async function createBooking(input: { serviceId: string; addressId: string; scheduledAt: string }) {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
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
  const response = await fetch(`${API_BASE_URL}/bookings/availability?${params.toString()}`, {
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
  const response = await fetch(`${API_BASE_URL}/provider/jobs`, {
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
  const response = await fetch(`${API_BASE_URL}/provider/jobs/${bookingId}/accept`, {
    method: "POST",
    headers: authHeaders("provider"),
  });

  if (!response.ok) {
    throw new Error("Failed to accept provider job");
  }

  return response.json() as Promise<{ bookingId: string; status: string; consentRecorded: boolean }>;
}

export async function rejectProviderJob(bookingId: string) {
  const response = await fetch(`${API_BASE_URL}/provider/jobs/${bookingId}/reject`, {
    method: "POST",
    headers: authHeaders("provider"),
  });

  if (!response.ok) {
    throw new Error("Failed to reject provider job");
  }

  return response.json() as Promise<{ bookingId: string; status: string }>;
}

export async function updateProviderJobStatus(bookingId: string, status: "provider_on_the_way" | "arrived_at_lobby") {
  const response = await fetch(`${API_BASE_URL}/provider/jobs/${bookingId}/status`, {
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
  const response = await fetch(`${API_BASE_URL}/privacy/consents`, {
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

export async function sendProviderLocation(bookingId: string) {
  const response = await fetch(`${API_BASE_URL}/provider/jobs/${bookingId}/location`, {
    method: "POST",
    headers: authHeaders("provider", {
      "content-type": "application/json",
    }),
    body: JSON.stringify({
      lat: 13.72145,
      lng: 100.51318,
      accuracyMeters: 16,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send provider location");
  }

  return response.json() as Promise<ProviderLocationAcceptedDto>;
}

export async function getProviderLocation(bookingId: string) {
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/provider-location`, {
    headers: authHeaders("customer"),
  });

  if (!response.ok) {
    throw new Error("Failed to load provider location");
  }

  return response.json() as Promise<ProviderLocationDto>;
}

export async function createPaymentIntent(bookingId: string) {
  const response = await fetch(`${API_BASE_URL}/payments/create-intent`, {
    method: "POST",
    headers: authHeaders("customer", {
      "content-type": "application/json",
    }),
    body: JSON.stringify({ bookingId }),
  });

  if (!response.ok) {
    throw new Error("Failed to create payment intent");
  }

  return response.json() as Promise<PaymentIntentDto>;
}

export async function getPriceBreakdown(bookingId: string) {
  const response = await fetch(`${API_BASE_URL}/payments/breakdown?bookingId=${encodeURIComponent(bookingId)}`, {
    headers: authHeaders("customer"),
  });

  if (!response.ok) {
    throw new Error("Failed to load price breakdown");
  }

  return response.json() as Promise<PriceBreakdownDto>;
}

export async function confirmSandboxPayment(paymentId: string) {
  const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/confirm-sandbox`, {
    method: "POST",
    headers: authHeaders("customer"),
  });

  if (!response.ok) {
    throw new Error("Failed to confirm payment");
  }

  return response.json() as Promise<PaymentIntentDto>;
}

export async function getCustomerProfile() {
  const response = await fetch(`${API_BASE_URL}/profile/customer`, {
    headers: authHeaders("customer"),
  });

  if (!response.ok) {
    throw new Error("Failed to load customer profile");
  }

  return response.json() as Promise<CustomerProfileDto>;
}

export async function updateCustomerProfile(input: { name?: string; phone?: string; email?: string }) {
  const response = await fetch(`${API_BASE_URL}/profile/customer`, {
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
  const response = await fetch(`${API_BASE_URL}/profile/customer/address`, {
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
  const response = await fetch(`${API_BASE_URL}/maps/address-suggestions?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error("Failed to search address suggestions");
  }

  return response.json() as Promise<AddressSuggestionDto[]>;
}

export async function checkProviderServiceRadius(bookingId: string) {
  const response = await fetch(`${API_BASE_URL}/provider/jobs/${bookingId}/service-radius`, {
    headers: authHeaders("provider"),
  });

  if (!response.ok) {
    throw new Error("Failed to check provider service radius");
  }

  return response.json() as Promise<ServiceRadiusCheckDto>;
}

export async function getProviderProfile() {
  const response = await fetch(`${API_BASE_URL}/profile/provider`, {
    headers: authHeaders("provider"),
  });

  if (!response.ok) {
    throw new Error("Failed to load provider profile");
  }

  return response.json() as Promise<ProviderProfileDto>;
}

export async function updateProviderProfile(input: { onlineStatus?: "online" | "offline" | "busy" }) {
  const response = await fetch(`${API_BASE_URL}/profile/provider`, {
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
  const response = await fetch(`${API_BASE_URL}/notifications`, {
    headers: authHeaders(role),
  });

  if (!response.ok) {
    throw new Error("Failed to load notifications");
  }

  return response.json() as Promise<NotificationDto[]>;
}

export async function markNotificationRead(notificationId: string, role: "customer" | "provider" = "customer") {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
    method: "POST",
    headers: authHeaders(role),
  });

  if (!response.ok) {
    throw new Error("Failed to mark notification read");
  }

  return response.json() as Promise<{ id: string; readAt?: string; read?: boolean }>;
}

export async function getBookingTimeline(bookingId: string, role: "customer" | "provider" = "customer") {
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/timeline`, {
    headers: authHeaders(role),
  });

  if (!response.ok) {
    throw new Error("Failed to load booking timeline");
  }

  return response.json() as Promise<BookingTimelineDto[]>;
}

export async function getBookingCommunications(bookingId: string, role: "customer" | "provider" = "customer") {
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/communications`, {
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
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/communications`, {
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
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/support-requests`, {
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
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/support-cases`, {
    headers: authHeaders(role),
  });

  if (!response.ok) {
    throw new Error("Failed to load booking support cases");
  }

  return response.json() as Promise<BookingSupportCaseDto[]>;
}

export async function getBookingSlotHold(bookingId: string) {
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/slot-hold`, {
    headers: authHeaders("customer"),
  });

  if (!response.ok) {
    throw new Error("Failed to load booking slot hold");
  }

  return response.json() as Promise<BookingSlotHoldDto>;
}
