export type UserRole =
  | "customer"
  | "provider"
  | "support_agent"
  | "safety_manager"
  | "finance_admin"
  | "super_admin";

export type BookingStatus =
  | "draft"
  | "payment_pending"
  | "payment_confirmed"
  | "provider_offered"
  | "provider_accepted"
  | "provider_rejected"
  | "provider_preparing"
  | "provider_on_the_way"
  | "arrived_at_lobby"
  | "service_started"
  | "completed"
  | "cancelled";

export type LocationVisibility =
  | "provider_only"
  | "customer_active_booking_only"
  | "customer_stale_state"
  | "customer_hidden"
  | "admin_exact_with_reason";

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone?: string;
  email?: string;
  phoneVerified: boolean;
}

export interface ServiceItem {
  id: string;
  category: "Massage" | "Beauty & Relax" | "Wellness Products" | "Other";
  name: string;
  durationMinutes: number;
  priceTHB: number;
  active: boolean;
}

export interface Booking {
  id: string;
  code: string;
  customerId: string;
  providerId?: string;
  serviceId: string;
  status: BookingStatus;
  scheduledAt: string;
  addressId: string;
  totalTHB: number;
  locationPolicy: "active_booking_only";
}

export interface BookingStatusEvent {
  id: string;
  bookingId: string;
  status: BookingStatus;
  actorUserId: string;
  createdAt: string;
}

export interface LocationEvent {
  id: string;
  bookingId: string;
  providerId: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  visibility: LocationVisibility;
  retentionHours: number;
  createdAt: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType:
    | "privacy_notice"
    | "location_sharing"
    | "provider_agreement"
    | "admin_access_policy"
    | "marketing";
  documentVersion: string;
  sourceScreen: string;
  acceptedAt: string;
  revokedAt?: string;
}

export interface AdminLocationAccessLog {
  id: string;
  adminUserId: string;
  bookingId: string;
  targetUserId: string;
  accessLevel: "area" | "exact" | "history";
  reasonCode:
    | "active_job"
    | "support_request"
    | "safety"
    | "dispute"
    | "fraud"
    | "manual_review";
  expiresAt: string;
  createdAt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

