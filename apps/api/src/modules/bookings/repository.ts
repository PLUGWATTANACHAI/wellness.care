import type { Booking, BookingStatus } from "@wellnest/types";
import type { CurrentUser } from "../../core/auth/current-user";
import { getDbPool, query } from "../../core/db/client";

interface DbClient {
  query<T = any>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount?: number | null }>;
}

export interface CreateBookingInput {
  serviceId: string;
  addressId: string;
  scheduledAt: string;
  partnerClinicId?: string;
}

export interface ProviderAvailabilityCheck {
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

export interface BookingListItem {
  id: string;
  code: string;
  customer: string;
  provider?: string;
  service: string;
  status: BookingStatus;
  scheduledAt: string;
  totalTHB: number;
  assignmentPolicy?: string;
  assignmentScore?: number;
  offerExpiresAt?: string;
  offerStatus?: "offered" | "accepted" | "rejected" | "expired";
}

export interface BookingTimelineItem {
  id: string;
  bookingId: string;
  status: BookingStatus;
  actor: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface BookingCommunicationEvent {
  id: string;
  bookingId: string;
  actor: string;
  actorRole: string;
  messageType: "customer_message" | "provider_message" | "admin_note" | "support_note" | "incident_note";
  visibility: "all_parties" | "customer_provider" | "admin_internal";
  body: string;
  createdAt: string;
}

export interface CreateBookingCommunicationInput {
  body: string;
  messageType?: BookingCommunicationEvent["messageType"];
  visibility?: BookingCommunicationEvent["visibility"];
}

export interface CreateBookingSupportRequestInput {
  body: string;
  reasonCode?: "support_request" | "unsafe_message" | "arrival_issue" | "payment_issue";
}

export interface BookingSupportCaseStatusItem {
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

const slotHoldMinutes = 15;
const providerOfferMinutes = 5;

export interface BookingSlotHoldStatus {
  bookingId: string;
  held: boolean;
  expiresAt?: string;
  secondsRemaining: number;
  providerId?: string;
}

const demoBookings: Booking[] = [
  {
    id: "book_240618",
    code: "#WN-240618",
    customerId: "usr_customer_001",
    providerId: "usr_provider_001",
    serviceId: "svc_massage_90",
    status: "payment_confirmed",
    scheduledAt: "2026-06-19T19:30:00+07:00",
    addressId: "addr_river_001",
    totalTHB: 1405,
    locationPolicy: "active_booking_only",
  },
];

export async function findBookingById(id: string): Promise<Booking | undefined> {
  if (!process.env.DATABASE_URL) {
    return demoBookings.find((booking) => booking.id === id);
  }

  const rows = await query<Booking>(
    `
      SELECT
        id,
        code,
        customer_id AS "customerId",
        provider_id AS "providerId",
        service_id AS "serviceId",
        status,
        scheduled_at AS "scheduledAt",
        address_id AS "addressId",
        total_thb AS "totalTHB",
        location_policy AS "locationPolicy"
      FROM bookings
      WHERE id = $1
    `,
    [id],
  );

  return rows[0];
}

export async function listAdminBookings(): Promise<BookingListItem[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        id: demoBookings[0].id,
        code: demoBookings[0].code,
        customer: "พี่ปลั๊ก",
        provider: "นิดา",
        service: "นวดคอ บ่า ไหล่ 90 นาที",
        status: demoBookings[0].status,
        scheduledAt: demoBookings[0].scheduledAt,
        totalTHB: demoBookings[0].totalTHB,
        assignmentPolicy: "balanced_nearest_rating_load",
        assignmentScore: 1,
        offerExpiresAt: new Date(Date.now() + providerOfferMinutes * 60 * 1000).toISOString(),
        offerStatus: "offered",
      },
    ];
  }

  return query<BookingListItem>(
    `
      SELECT
        b.id,
        b.code,
        customer.name AS customer,
        provider.name AS provider,
        s.name AS service,
        b.status,
        b.scheduled_at AS "scheduledAt",
        b.total_thb AS "totalTHB",
        bpa.policy AS "assignmentPolicy",
        bpa.assignment_score::FLOAT AS "assignmentScore",
        bpo.expires_at AS "offerExpiresAt",
        bpo.offer_status AS "offerStatus"
      FROM bookings b
      JOIN users customer ON customer.id = b.customer_id
      LEFT JOIN users provider ON provider.id = b.provider_id
      JOIN services s ON s.id = b.service_id
      LEFT JOIN booking_provider_assignments bpa ON bpa.booking_id = b.id
      LEFT JOIN LATERAL (
        SELECT offer_status, expires_at
        FROM booking_provider_offers
        WHERE booking_id = b.id
        ORDER BY created_at DESC
        LIMIT 1
      ) bpo ON TRUE
      ORDER BY b.created_at DESC
      LIMIT 50
    `,
  );
}

export async function listBookingTimeline(bookingId: string): Promise<BookingTimelineItem[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        id: "bse_dev_001",
        bookingId,
        status: "payment_confirmed",
        actor: "พี่ปลั๊ก",
        title: "Payment confirmed",
        body: "Booking payment was confirmed.",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const rows = await query<{
    id: string;
    bookingId: string;
    status: BookingStatus;
    actor: string;
    createdAt: string;
  }>(
    `
      SELECT
        e.id,
        e.booking_id AS "bookingId",
        e.status,
        actor.name AS actor,
        e.created_at AS "createdAt"
      FROM booking_status_events e
      JOIN users actor ON actor.id = e.actor_user_id
      WHERE e.booking_id = $1
      ORDER BY e.created_at ASC
    `,
    [bookingId],
  );

  return rows.map((row) => ({
    ...row,
    ...describeTimelineStatus(row.status),
  }));
}

export async function getBookingSlotHoldStatus(bookingId: string, user: CurrentUser): Promise<BookingSlotHoldStatus> {
  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error("BOOKING_NOT_FOUND");

  const canRead =
    user.role === "customer" && booking.customerId === user.id
      ? true
      : user.role === "provider" && booking.providerId === user.id
        ? true
        : ["support_agent", "safety_manager", "finance_admin", "super_admin"].includes(user.role);

  if (!canRead) {
    throw new Error("BOOKING_ACCESS_DENIED");
  }

  if (!process.env.DATABASE_URL) {
    return {
      bookingId,
      held: true,
      expiresAt: new Date(Date.now() + slotHoldMinutes * 60 * 1000).toISOString(),
      secondsRemaining: slotHoldMinutes * 60,
      providerId: "usr_provider_001",
    };
  }

  const rows = await query<{
    bookingId: string;
    providerId: string;
    expiresAt: string;
    secondsRemaining: number;
  }>(
    `
      SELECT
        booking_id AS "bookingId",
        provider_id AS "providerId",
        expires_at AS "expiresAt",
        GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (expires_at - now()))))::INTEGER AS "secondsRemaining"
      FROM booking_slot_holds
      WHERE booking_id = $1
        AND released_at IS NULL
        AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [bookingId],
  );

  const hold = rows[0];
  if (!hold) {
    return {
      bookingId,
      held: false,
      secondsRemaining: 0,
    };
  }

  return {
    bookingId,
    held: true,
    expiresAt: hold.expiresAt,
    secondsRemaining: hold.secondsRemaining,
    providerId: hold.providerId,
  };
}

export async function listBookingCommunicationEvents(
  bookingId: string,
  user: CurrentUser,
): Promise<BookingCommunicationEvent[]> {
  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error("BOOKING_NOT_FOUND");

  const canRead = canAccessBooking(booking, user);
  if (!canRead) throw new Error("BOOKING_ACCESS_DENIED");

  if (!process.env.DATABASE_URL) {
    return [
      {
        id: "comm_dev_001",
        bookingId,
        actor: user.name,
        actorRole: user.role,
        messageType: "support_note",
        visibility: "all_parties",
        body: "Demo booking communication event.",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const visibilityFilter =
    user.role === "customer"
      ? ["all_parties", "customer_provider"]
      : user.role === "provider"
        ? ["all_parties", "customer_provider"]
        : ["all_parties", "customer_provider", "admin_internal"];

  return query<BookingCommunicationEvent>(
    `
      SELECT
        e.id,
        e.booking_id AS "bookingId",
        actor.name AS actor,
        e.actor_role AS "actorRole",
        e.message_type AS "messageType",
        e.visibility,
        e.body,
        e.created_at AS "createdAt"
      FROM booking_communication_events e
      JOIN users actor ON actor.id = e.actor_user_id
      WHERE e.booking_id = $1
        AND e.visibility = ANY($2::text[])
      ORDER BY e.created_at ASC
    `,
    [bookingId, visibilityFilter],
  );
}

export async function createBookingCommunicationEvent(
  bookingId: string,
  user: CurrentUser,
  input: CreateBookingCommunicationInput,
): Promise<BookingCommunicationEvent> {
  const body = input.body?.trim();
  if (!body) throw new Error("COMMUNICATION_BODY_REQUIRED");
  if (body.length > 2000) throw new Error("COMMUNICATION_BODY_TOO_LONG");

  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (!canAccessBooking(booking, user)) throw new Error("BOOKING_ACCESS_DENIED");

  const isAdmin = isAdminRole(user.role);
  const messageType = normalizeCommunicationMessageType(user, input.messageType);
  const visibility = normalizeCommunicationVisibility(user, input.visibility);

  if (!isAdmin && visibility === "admin_internal") throw new Error("COMMUNICATION_VISIBILITY_DENIED");
  if (!isAdmin && ["admin_note", "support_note", "incident_note"].includes(messageType)) {
    throw new Error("COMMUNICATION_TYPE_DENIED");
  }

  if (!process.env.DATABASE_URL) {
    return {
      id: "comm_dev_created",
      bookingId,
      actor: user.name,
      actorRole: user.role,
      messageType,
      visibility,
      body,
      createdAt: new Date().toISOString(),
    };
  }

  const rows = await query<BookingCommunicationEvent>(
    `
      INSERT INTO booking_communication_events (
        id,
        booking_id,
        actor_user_id,
        actor_role,
        message_type,
        visibility,
        body
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        booking_id AS "bookingId",
        (SELECT name FROM users WHERE id = $3) AS actor,
        actor_role AS "actorRole",
        message_type AS "messageType",
        visibility,
        body,
        created_at AS "createdAt"
    `,
    [createId("comm"), bookingId, user.id, user.role, messageType, visibility, body],
  );

  await createCommunicationNotifications(booking, user, rows[0]);

  return rows[0];
}

export async function createBookingSupportRequest(
  bookingId: string,
  user: CurrentUser,
  input: CreateBookingSupportRequestInput,
): Promise<BookingCommunicationEvent> {
  const body = input.body?.trim();
  if (!body) throw new Error("SUPPORT_REQUEST_BODY_REQUIRED");
  if (body.length > 2000) throw new Error("COMMUNICATION_BODY_TOO_LONG");

  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (!canAccessBooking(booking, user)) throw new Error("BOOKING_ACCESS_DENIED");
  if (!["customer", "provider"].includes(user.role)) throw new Error("SUPPORT_REQUEST_ROLE_DENIED");

  const reasonCode = normalizeSupportReason(input.reasonCode);
  const messageType = reasonCode === "unsafe_message" ? "incident_note" : "support_note";
  const supportBody = `[${reasonCode}] ${body}`;

  if (!process.env.DATABASE_URL) {
    return {
      id: "comm_dev_support",
      bookingId,
      actor: user.name,
      actorRole: user.role,
      messageType,
      visibility: "admin_internal",
      body: supportBody,
      createdAt: new Date().toISOString(),
    };
  }

  const rows = await query<BookingCommunicationEvent>(
    `
      INSERT INTO booking_communication_events (
        id,
        booking_id,
        actor_user_id,
        actor_role,
        message_type,
        visibility,
        body
      )
      VALUES ($1, $2, $3, $4, $5, 'admin_internal', $6)
      RETURNING
        id,
        booking_id AS "bookingId",
        (SELECT name FROM users WHERE id = $3) AS actor,
        actor_role AS "actorRole",
        message_type AS "messageType",
        visibility,
        body,
        created_at AS "createdAt"
    `,
    [createId("comm"), bookingId, user.id, user.role, messageType, supportBody],
  );

  await query(
    `
      INSERT INTO booking_support_cases (
        id,
        booking_id,
        communication_event_id,
        reporter_user_id,
        reporter_role,
        reason_code
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [createId("case"), bookingId, rows[0].id, user.id, user.role, reasonCode],
  );

  await notifyAdminsForSupportRequest(booking, user, reasonCode, body);

  return rows[0];
}

export async function listBookingSupportCaseStatuses(
  bookingId: string,
  user: CurrentUser,
): Promise<BookingSupportCaseStatusItem[]> {
  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (!canAccessBooking(booking, user)) throw new Error("BOOKING_ACCESS_DENIED");

  if (!["customer", "provider"].includes(user.role)) throw new Error("SUPPORT_CASE_STATUS_DENIED");
  const reporterRole = user.role as "customer" | "provider";

  if (!process.env.DATABASE_URL) {
    return [
      {
        id: "case_dev_001",
        bookingId,
        reporterRole,
        reasonCode: "support_request",
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  return query<BookingSupportCaseStatusItem>(
    `
      SELECT
        id,
        booking_id AS "bookingId",
        reporter_role AS "reporterRole",
        reason_code AS "reasonCode",
        status,
        resolution_note AS "resolutionNote",
        resolved_at AS "resolvedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM booking_support_cases
      WHERE booking_id = $1
        AND reporter_user_id = $2
      ORDER BY created_at DESC
      LIMIT 10
    `,
    [bookingId, user.id],
  );
}

export async function listProviderJobs(provider: CurrentUser): Promise<BookingListItem[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        id: demoBookings[0].id,
        code: demoBookings[0].code,
        customer: "พี่ปลั๊ก",
        provider: provider.name,
        service: "นวดคอ บ่า ไหล่ 90 นาที",
        status: demoBookings[0].status,
        scheduledAt: demoBookings[0].scheduledAt,
        totalTHB: demoBookings[0].totalTHB,
      },
    ];
  }

  return query<BookingListItem>(
    `
      SELECT
        b.id,
        b.code,
        customer.name AS customer,
        provider.name AS provider,
        s.name AS service,
        b.status,
        b.scheduled_at AS "scheduledAt",
        b.total_thb AS "totalTHB",
        bpo.expires_at AS "offerExpiresAt",
        bpo.offer_status AS "offerStatus"
      FROM bookings b
      JOIN users customer ON customer.id = b.customer_id
      LEFT JOIN users provider ON provider.id = b.provider_id
      JOIN services s ON s.id = b.service_id
      LEFT JOIN LATERAL (
        SELECT offer_status, expires_at
        FROM booking_provider_offers
        WHERE booking_id = b.id
          AND provider_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      ) bpo ON TRUE
      WHERE b.provider_id = $1
        OR EXISTS (
          SELECT 1
          FROM booking_provider_offers offer
          WHERE offer.booking_id = b.id
            AND offer.provider_id = $1
            AND offer.offer_status = 'offered'
            AND offer.expires_at > now()
        )
      ORDER BY b.created_at DESC
      LIMIT 50
    `,
    [provider.id],
  );
}

export async function checkProviderAvailability(
  input: CreateBookingInput,
  customer: CurrentUser,
): Promise<ProviderAvailabilityCheck> {
  if (!process.env.DATABASE_URL) {
    return {
      serviceId: input.serviceId,
      addressId: input.addressId,
      scheduledAt: input.scheduledAt,
      available: true,
      availableProviderCount: 1,
      nearestProvider: {
        id: "usr_provider_001",
        name: "นิดา สุขสบาย",
        rating: 4.9,
        distanceMeters: 0,
        serviceRadiusMeters: 8000,
        activeJobCount: 0,
        assignmentScore: 1,
        assignmentPolicy: "balanced_nearest_rating_load",
      },
    };
  }

  const rows = await query<{
    serviceId: string;
    addressId: string;
    scheduledAt: string;
    providerId: string | null;
    providerName: string | null;
    rating: number | null;
    distanceMeters: number | null;
    serviceRadiusMeters: number | null;
    activeJobCount: number | null;
    assignmentScore: number | null;
    availableProviderCount: number;
    reason: ProviderAvailabilityCheck["reason"] | null;
  }>(
    `
      WITH requested AS (
        SELECT
          s.id AS service_id,
          s.duration_minutes,
          a.id AS address_id,
          a.lat::FLOAT AS address_lat,
          a.lng::FLOAT AS address_lng,
          $3::timestamptz AS scheduled_at,
          EXTRACT(ISODOW FROM ($3::timestamptz AT TIME ZONE 'Asia/Bangkok'))::INTEGER AS local_day_of_week,
          (($3::timestamptz AT TIME ZONE 'Asia/Bangkok')::time) AS local_time
        FROM services s
        JOIN addresses a ON a.id = $2 AND a.customer_id = $4
        WHERE s.id = $1
          AND s.active = TRUE
      ),
      online_candidates AS (
        SELECT
          u.id,
          u.name,
          pp.rating::FLOAT AS rating,
          pp.service_radius_meters,
          COALESCE(workload.active_job_count, 0)::INTEGER AS active_job_count,
          requested.service_id,
          (
            6371000 * 2 * asin(
              sqrt(
                power(sin(radians((requested.address_lat - pp.base_lat::FLOAT) / 2)), 2) +
                cos(radians(pp.base_lat::FLOAT)) *
                cos(radians(requested.address_lat)) *
                power(sin(radians((requested.address_lng - pp.base_lng::FLOAT) / 2)), 2)
              )
            )
          ) AS distance_meters,
          requested.duration_minutes,
          requested.scheduled_at,
          requested.local_day_of_week,
          requested.local_time
        FROM requested
        JOIN provider_profiles pp
          ON pp.online_status = 'online'
          AND pp.verified_at IS NOT NULL
          AND pp.base_lat IS NOT NULL
          AND pp.base_lng IS NOT NULL
        JOIN users u ON u.id = pp.user_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::INTEGER AS active_job_count
          FROM bookings b
          WHERE b.provider_id = pp.user_id
            AND b.status NOT IN ('completed', 'cancelled')
        ) workload ON TRUE
        WHERE requested.address_lat IS NOT NULL
          AND requested.address_lng IS NOT NULL
      ),
      skilled_candidates AS (
        SELECT c.*
        FROM online_candidates c
        JOIN provider_service_skills pss
          ON pss.provider_id = c.id
          AND pss.service_id = c.service_id
          AND pss.active = TRUE
      ),
      working_candidates AS (
        SELECT c.*
        FROM skilled_candidates c
        JOIN provider_working_hours pwh
          ON pwh.provider_id = c.id
          AND pwh.day_of_week = c.local_day_of_week
          AND pwh.active = TRUE
          AND c.local_time >= pwh.start_time
          AND c.local_time < pwh.end_time
      ),
      not_on_leave_candidates AS (
        SELECT *
        FROM working_candidates c
        WHERE NOT EXISTS (
          SELECT 1
          FROM provider_leave_windows plw
          WHERE plw.provider_id = c.id
            AND plw.active = TRUE
            AND tstzrange(plw.starts_at, plw.ends_at, '[)') && tstzrange(
              c.scheduled_at,
              c.scheduled_at + make_interval(mins => GREATEST(c.duration_minutes, 30)),
              '[)'
            )
        )
      ),
      available_candidates AS (
        SELECT *
        FROM not_on_leave_candidates c
        WHERE c.distance_meters <= c.service_radius_meters
          AND NOT EXISTS (
            SELECT 1
            FROM bookings b
            JOIN services booked_service ON booked_service.id = b.service_id
            WHERE b.provider_id = c.id
              AND b.status NOT IN ('completed', 'cancelled')
              AND tstzrange(
                b.scheduled_at,
                b.scheduled_at + make_interval(mins => GREATEST(booked_service.duration_minutes, 30)),
                '[)'
              ) && tstzrange(
                c.scheduled_at,
                c.scheduled_at + make_interval(mins => GREATEST(c.duration_minutes, 30)),
                '[)'
              )
          )
          AND NOT EXISTS (
            SELECT 1
            FROM booking_slot_holds h
            WHERE h.provider_id = c.id
              AND h.released_at IS NULL
              AND h.expires_at > now()
              AND tstzrange(
                h.scheduled_at,
                h.scheduled_at + make_interval(mins => GREATEST(h.duration_minutes, 30)),
                '[)'
              ) && tstzrange(
                c.scheduled_at,
                c.scheduled_at + make_interval(mins => GREATEST(c.duration_minutes, 30)),
                '[)'
              )
          )
      ),
      scored_candidates AS (
        SELECT
          c.*,
          ROUND(
            (
              (
                CASE
                  WHEN c.service_radius_meters > 0
                    THEN GREATEST(0, 1 - (c.distance_meters / c.service_radius_meters))
                  ELSE 0
                END
              ) * 0.45
              + (COALESCE(c.rating, 0) / 5) * 0.35
              + (1.0 / (1 + c.active_job_count)) * 0.20
            )::numeric,
            3
          )::FLOAT AS assignment_score
        FROM available_candidates c
      ),
      ranked_available AS (
        SELECT *
        FROM scored_candidates
        ORDER BY assignment_score DESC, distance_meters ASC, rating DESC NULLS LAST
        LIMIT 1
      ),
      available_count AS (
        SELECT COUNT(*)::INTEGER AS count
        FROM available_candidates
      ),
      diagnostics AS (
        SELECT
          CASE
            WHEN NOT EXISTS (SELECT 1 FROM requested) THEN NULL
            WHEN EXISTS (
              SELECT 1 FROM requested WHERE address_lat IS NULL OR address_lng IS NULL
            ) THEN 'missing_address_location'
            WHEN NOT EXISTS (SELECT 1 FROM online_candidates) THEN 'no_provider_online'
            WHEN NOT EXISTS (SELECT 1 FROM skilled_candidates) THEN 'provider_unskilled'
            WHEN NOT EXISTS (SELECT 1 FROM working_candidates) THEN 'outside_working_hours'
            WHEN NOT EXISTS (SELECT 1 FROM not_on_leave_candidates) THEN 'provider_on_leave'
            WHEN NOT EXISTS (
              SELECT 1 FROM not_on_leave_candidates WHERE distance_meters <= service_radius_meters
            ) THEN 'outside_service_radius'
            WHEN NOT EXISTS (SELECT 1 FROM available_candidates) THEN 'provider_busy'
            ELSE NULL
          END AS reason
      )
      SELECT
        $1 AS "serviceId",
        $2 AS "addressId",
        $3 AS "scheduledAt",
        p.id AS "providerId",
        p.name AS "providerName",
        p.rating,
        ROUND(p.distance_meters)::INTEGER AS "distanceMeters",
        p.service_radius_meters AS "serviceRadiusMeters",
        p.active_job_count AS "activeJobCount",
        p.assignment_score AS "assignmentScore",
        ac.count AS "availableProviderCount",
        d.reason
      FROM diagnostics d
      CROSS JOIN available_count ac
      LEFT JOIN ranked_available p ON TRUE
    `,
    [input.serviceId, input.addressId, input.scheduledAt, customer.id],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("SERVICE_OR_ADDRESS_NOT_FOUND");
  }

  return {
    serviceId: input.serviceId,
    addressId: input.addressId,
    scheduledAt: input.scheduledAt,
    available: Boolean(row.providerId),
    availableProviderCount: row.availableProviderCount || 0,
    nearestProvider: row.providerId
      ? {
          id: row.providerId,
          name: row.providerName || "Available provider",
          rating: row.rating ?? undefined,
          distanceMeters: row.distanceMeters || 0,
          serviceRadiusMeters: row.serviceRadiusMeters || 0,
          activeJobCount: row.activeJobCount || 0,
          assignmentScore: row.assignmentScore || 0,
          assignmentPolicy: "balanced_nearest_rating_load",
        }
      : undefined,
    reason: row.providerId ? undefined : row.reason || "provider_busy",
  };
}

export async function createBookingDraft(input: CreateBookingInput, customer: CurrentUser): Promise<Booking> {
  if (!process.env.DATABASE_URL) {
    return {
      ...demoBookings[0],
      id: "book_demo_draft",
      code: "#WN-DEMO",
      customerId: customer.id,
      serviceId: input.serviceId,
      addressId: input.addressId,
      scheduledAt: input.scheduledAt,
      status: "payment_pending",
    };
  }

  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");

  const client = await db.connect();
  const bookingId = createId("book");
  const eventId = createId("bse");
  const code = createBookingCode();

  try {
    await client.query("BEGIN");

    const serviceResult = await client.query<{ price_thb: number; duration_minutes: number }>(
      "SELECT price_thb, duration_minutes FROM services WHERE id = $1 AND active = TRUE",
      [input.serviceId],
    );

    const service = serviceResult.rows[0];
    if (!service) {
      throw new Error("SERVICE_NOT_FOUND");
    }

    const addressResult = await client.query<{ id: string }>(
      "SELECT id FROM addresses WHERE id = $1 AND customer_id = $2",
      [input.addressId, customer.id],
    );

    if (!addressResult.rows[0]) {
      throw new Error("ADDRESS_NOT_FOUND");
    }

    const availability = await checkProviderAvailability(input, customer);
    if (!availability.available || !availability.nearestProvider) {
      throw new Error("PROVIDER_UNAVAILABLE");
    }

    const bookingResult = await client.query<Booking>(
      `
        INSERT INTO bookings (
          id,
          code,
          customer_id,
          service_id,
          address_id,
          status,
          scheduled_at,
          total_thb,
          partner_clinic_id,
          booking_channel
        )
        VALUES ($1, $2, $3, $4, $5, 'payment_pending', $6, $7, $8, $9)
        RETURNING
          id,
          code,
          customer_id AS "customerId",
          provider_id AS "providerId",
          service_id AS "serviceId",
          status,
          scheduled_at AS "scheduledAt",
          address_id AS "addressId",
          total_thb AS "totalTHB",
          location_policy AS "locationPolicy"
      `,
      [
        bookingId,
        code,
        customer.id,
        input.serviceId,
        input.addressId,
        input.scheduledAt,
        service.price_thb,
        input.partnerClinicId ?? null,
        input.partnerClinicId ? "partner_clinic" : "home_service",
      ],
    );

    await client.query(
      `
        INSERT INTO booking_status_events (id, booking_id, status, actor_user_id)
        VALUES ($1, $2, 'payment_pending', $3)
      `,
      [eventId, bookingId, customer.id],
    );

    await insertNotification(client, {
      userId: customer.id,
      bookingId,
      title: "Booking created",
      body: "Your Wellnest booking draft was created.",
    });

    await client.query(
      `
        INSERT INTO booking_slot_holds (
          id,
          booking_id,
          provider_id,
          service_id,
          address_id,
          scheduled_at,
          duration_minutes,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, now() + make_interval(mins => $8))
      `,
      [
        createId("hold"),
        bookingId,
        availability.nearestProvider.id,
        input.serviceId,
        input.addressId,
        input.scheduledAt,
        Math.max(service.duration_minutes, 30),
        slotHoldMinutes,
      ],
    );

    await client.query(
      `
        INSERT INTO booking_provider_assignments (
          id,
          booking_id,
          provider_id,
          policy,
          assignment_score,
          distance_meters,
          service_radius_meters,
          rating,
          active_job_count,
          ranked_provider_count,
          decision_reason
        )
        VALUES ($1, $2, $3, 'balanced_nearest_rating_load', $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        createId("assign"),
        bookingId,
        availability.nearestProvider.id,
        availability.nearestProvider.assignmentScore,
        availability.nearestProvider.distanceMeters,
        availability.nearestProvider.serviceRadiusMeters,
        availability.nearestProvider.rating ?? null,
        availability.nearestProvider.activeJobCount,
        availability.availableProviderCount,
        "Selected by balanced score: distance 45%, rating 35%, active workload 20%",
      ],
    );

    await client.query("COMMIT");
    return bookingResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function acceptProviderJob(id: string, provider: CurrentUser) {
  return updateBookingStatus(id, "provider_accepted", provider, {
    providerId: provider.id,
    requireAssignable: true,
    requireActiveOffer: true,
    consentRecorded: true,
  });
}

export async function rejectProviderJob(id: string, provider: CurrentUser) {
  if (!process.env.DATABASE_URL) {
    return { bookingId: id, status: "provider_rejected" };
  }

  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const offerResult = await client.query<{ id: string }>(
      `
        UPDATE booking_provider_offers
        SET offer_status = 'rejected', responded_at = now()
        WHERE booking_id = $1
          AND provider_id = $2
          AND offer_status = 'offered'
          AND expires_at > now()
        RETURNING id
      `,
      [id, provider.id],
    );

    if (!offerResult.rows[0]) throw new Error("PROVIDER_OFFER_NOT_ACTIVE");

    await advanceProviderOffer(client, id, provider.id);
    await client.query("COMMIT");
    return { bookingId: id, status: "provider_rejected" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function processExpiredProviderOffers() {
  if (!process.env.DATABASE_URL) {
    return { expiredOfferCount: 0, advancedBookingCount: 0 };
  }

  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const expiredResult = await client.query<{ booking_id: string; provider_id: string }>(
      `
        UPDATE booking_provider_offers
        SET offer_status = 'expired'
        WHERE offer_status = 'offered'
          AND expires_at <= now()
        RETURNING booking_id, provider_id
      `,
    );

    let advancedBookingCount = 0;
    for (const offer of expiredResult.rows) {
      await advanceProviderOffer(client, offer.booking_id, offer.provider_id);
      advancedBookingCount += 1;
    }

    await client.query("COMMIT");
    return { expiredOfferCount: expiredResult.rowCount || 0, advancedBookingCount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createProviderOfferAfterPayment(
  client: DbClient,
  bookingId: string,
  actorUserId: string,
) {
  const holdResult = await client.query<{
    provider_id: string;
  }>(
    `
      SELECT provider_id
      FROM booking_slot_holds
      WHERE booking_id = $1
        AND released_at IS NULL
        AND expires_at > now()
      LIMIT 1
    `,
    [bookingId],
  );

  const heldProvider = holdResult.rows[0];
  if (!heldProvider) throw new Error("PAYMENT_SLOT_HOLD_EXPIRED");

  const assignmentResult = await client.query<{
    assignment_score: number;
  }>(
    `
      SELECT assignment_score::FLOAT AS assignment_score
      FROM booking_provider_assignments
      WHERE booking_id = $1
      LIMIT 1
    `,
    [bookingId],
  );

  await createProviderOffer(client, {
    bookingId,
    providerId: heldProvider.provider_id,
    actorUserId,
    rankPosition: 1,
    assignmentScore: assignmentResult.rows[0]?.assignment_score ?? 1,
  });
}

export async function updateProviderJobStatus(id: string, provider: CurrentUser, status: BookingStatus = "provider_on_the_way") {
  return updateBookingStatus(id, status, provider, { providerId: provider.id });
}

async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  actor: CurrentUser,
  options: { providerId?: string; requireAssignable?: boolean; requireActiveOffer?: boolean; consentRecorded?: boolean } = {},
) {
  if (!process.env.DATABASE_URL) {
    return {
      bookingId: id,
      status,
      consentRecorded: options.consentRecorded,
    };
  }

  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const bookingResult = await client.query<{ id: string; provider_id?: string | null }>(
      "SELECT id, provider_id FROM bookings WHERE id = $1 FOR UPDATE",
      [id],
    );
    const booking = bookingResult.rows[0];

    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND");
    }

    if (options.requireAssignable && booking.provider_id && booking.provider_id !== options.providerId) {
      throw new Error("BOOKING_ALREADY_ASSIGNED");
    }

    if (options.providerId && booking.provider_id && booking.provider_id !== options.providerId) {
      throw new Error("BOOKING_PROVIDER_MISMATCH");
    }

    if (options.requireActiveOffer && options.providerId) {
      const offerResult = await client.query<{ id: string }>(
        `
          UPDATE booking_provider_offers
          SET offer_status = 'accepted', responded_at = now()
          WHERE booking_id = $1
            AND provider_id = $2
            AND offer_status = 'offered'
            AND expires_at > now()
          RETURNING id
        `,
        [id, options.providerId],
      );

      if (!offerResult.rows[0]) throw new Error("PROVIDER_OFFER_NOT_ACTIVE");
    }

    await client.query(
      `
        UPDATE bookings
        SET
          status = $2,
          provider_id = COALESCE(provider_id, $3),
          updated_at = now()
        WHERE id = $1
      `,
      [id, status, options.providerId],
    );

    await client.query(
      `
        INSERT INTO booking_status_events (id, booking_id, status, actor_user_id)
        VALUES ($1, $2, $3, $4)
      `,
      [createId("bse"), id, status, actor.id],
    );

    const detail = describeTimelineStatus(status);
    const notifyUserIds = new Set<string>();
    if (options.providerId) notifyUserIds.add(options.providerId);

    const bookingOwnerResult = await client.query<{ customer_id: string; provider_id?: string | null }>(
      "SELECT customer_id, provider_id FROM bookings WHERE id = $1",
      [id],
    );
    const bookingOwner = bookingOwnerResult.rows[0];
    if (bookingOwner?.customer_id) notifyUserIds.add(bookingOwner.customer_id);
    if (bookingOwner?.provider_id) notifyUserIds.add(bookingOwner.provider_id);

    for (const userId of notifyUserIds) {
      await insertNotification(client, {
        userId,
        bookingId: id,
        title: detail.title,
        body: detail.body,
      });
    }

    await client.query("COMMIT");

    return {
      bookingId: id,
      status,
      consentRecorded: options.consentRecorded,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function advanceProviderOffer(
  client: DbClient,
  bookingId: string,
  actorUserId: string,
) {
  const candidateResult = await client.query<{
    provider_id: string;
    assignment_score: number;
    rank_position: number;
  }>(
    `
      WITH booking_context AS (
        SELECT
          b.id AS booking_id,
          b.service_id,
          b.address_id,
          b.scheduled_at,
          s.duration_minutes,
          a.lat::FLOAT AS address_lat,
          a.lng::FLOAT AS address_lng,
          EXTRACT(ISODOW FROM (b.scheduled_at AT TIME ZONE 'Asia/Bangkok'))::INTEGER AS local_day_of_week,
          ((b.scheduled_at AT TIME ZONE 'Asia/Bangkok')::time) AS local_time
        FROM bookings b
        JOIN services s ON s.id = b.service_id
        JOIN addresses a ON a.id = b.address_id
        WHERE b.id = $1
      ),
      online_candidates AS (
        SELECT
          u.id,
          pp.rating::FLOAT AS rating,
          pp.service_radius_meters,
          COALESCE(workload.active_job_count, 0)::INTEGER AS active_job_count,
          booking_context.duration_minutes,
          booking_context.scheduled_at,
          (
            6371000 * 2 * asin(
              sqrt(
                power(sin(radians((booking_context.address_lat - pp.base_lat::FLOAT) / 2)), 2) +
                cos(radians(pp.base_lat::FLOAT)) *
                cos(radians(booking_context.address_lat)) *
                power(sin(radians((booking_context.address_lng - pp.base_lng::FLOAT) / 2)), 2)
              )
            )
          ) AS distance_meters
        FROM booking_context
        JOIN provider_profiles pp
          ON pp.online_status = 'online'
          AND pp.verified_at IS NOT NULL
          AND pp.base_lat IS NOT NULL
          AND pp.base_lng IS NOT NULL
        JOIN users u ON u.id = pp.user_id
        JOIN provider_service_skills pss
          ON pss.provider_id = u.id
          AND pss.service_id = booking_context.service_id
          AND pss.active = TRUE
        JOIN provider_working_hours pwh
          ON pwh.provider_id = u.id
          AND pwh.day_of_week = booking_context.local_day_of_week
          AND pwh.active = TRUE
          AND booking_context.local_time >= pwh.start_time
          AND booking_context.local_time < pwh.end_time
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::INTEGER AS active_job_count
          FROM bookings b
          WHERE b.provider_id = pp.user_id
            AND b.status NOT IN ('completed', 'cancelled')
            AND b.id <> $1
        ) workload ON TRUE
        WHERE booking_context.address_lat IS NOT NULL
          AND booking_context.address_lng IS NOT NULL
      ),
      available_candidates AS (
        SELECT *
        FROM online_candidates c
        WHERE c.distance_meters <= c.service_radius_meters
          AND NOT EXISTS (
            SELECT 1
            FROM booking_provider_offers offer
            WHERE offer.booking_id = $1
              AND offer.provider_id = c.id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM provider_leave_windows plw
            WHERE plw.provider_id = c.id
              AND plw.active = TRUE
              AND tstzrange(plw.starts_at, plw.ends_at, '[)') && tstzrange(
                c.scheduled_at,
                c.scheduled_at + make_interval(mins => GREATEST(c.duration_minutes, 30)),
                '[)'
              )
          )
          AND NOT EXISTS (
            SELECT 1
            FROM bookings b
            JOIN services booked_service ON booked_service.id = b.service_id
            WHERE b.provider_id = c.id
              AND b.id <> $1
              AND b.status NOT IN ('completed', 'cancelled')
              AND tstzrange(
                b.scheduled_at,
                b.scheduled_at + make_interval(mins => GREATEST(booked_service.duration_minutes, 30)),
                '[)'
              ) && tstzrange(
                c.scheduled_at,
                c.scheduled_at + make_interval(mins => GREATEST(c.duration_minutes, 30)),
                '[)'
              )
          )
      ),
      scored_candidates AS (
        SELECT
          c.*,
          ROUND(
            (
              (
                CASE
                  WHEN c.service_radius_meters > 0
                    THEN GREATEST(0, 1 - (c.distance_meters / c.service_radius_meters))
                  ELSE 0
                END
              ) * 0.45
              + (COALESCE(c.rating, 0) / 5) * 0.35
              + (1.0 / (1 + c.active_job_count)) * 0.20
            )::numeric,
            3
          )::FLOAT AS assignment_score
        FROM available_candidates c
      ),
      next_rank AS (
        SELECT COALESCE(MAX(rank_position), 0) + 1 AS rank_position
        FROM booking_provider_offers
        WHERE booking_id = $1
      )
      SELECT
        c.id AS provider_id,
        c.assignment_score,
        next_rank.rank_position
      FROM scored_candidates c
      CROSS JOIN next_rank
      ORDER BY c.assignment_score DESC, c.distance_meters ASC, c.rating DESC NULLS LAST
      LIMIT 1
    `,
    [bookingId],
  );

  const candidate = candidateResult.rows[0];
  if (!candidate) {
    await client.query(
      `
        UPDATE bookings
        SET status = 'provider_rejected', provider_id = NULL, updated_at = now()
        WHERE id = $1
      `,
      [bookingId],
    );
    await client.query(
      `
        INSERT INTO booking_status_events (id, booking_id, status, actor_user_id)
        VALUES ($1, $2, 'provider_rejected', $3)
      `,
      [createId("bse"), bookingId, actorUserId],
    );
    return;
  }

  await createProviderOffer(client, {
    bookingId,
    providerId: candidate.provider_id,
    actorUserId,
    rankPosition: candidate.rank_position,
    assignmentScore: candidate.assignment_score,
  });
}

async function createProviderOffer(
  client: DbClient,
  input: {
    bookingId: string;
    providerId: string;
    actorUserId: string;
    rankPosition: number;
    assignmentScore: number;
  },
) {
  await client.query(
    `
      INSERT INTO booking_provider_offers (
        id,
        booking_id,
        provider_id,
        offer_status,
        rank_position,
        assignment_score,
        expires_at
      )
      VALUES ($1, $2, $3, 'offered', $4, $5, now() + make_interval(mins => $6))
    `,
    [
      createId("offer"),
      input.bookingId,
      input.providerId,
      input.rankPosition,
      input.assignmentScore,
      providerOfferMinutes,
    ],
  );

  await client.query(
    `
      UPDATE bookings
      SET status = 'provider_offered', provider_id = $2, updated_at = now()
      WHERE id = $1
    `,
    [input.bookingId, input.providerId],
  );

  await client.query(
    `
      INSERT INTO booking_status_events (id, booking_id, status, actor_user_id)
      VALUES ($1, $2, 'provider_offered', $3)
    `,
    [createId("bse"), input.bookingId, input.actorUserId],
  );

  await insertNotification(client, {
    userId: input.providerId,
    bookingId: input.bookingId,
    title: "New booking offer",
    body: `Please accept this booking within ${providerOfferMinutes} minutes.`,
  });
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function createBookingCode() {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `#WN-${date}-${suffix}`;
}

function describeTimelineStatus(status: BookingStatus) {
  const descriptions: Record<string, { title: string; body: string }> = {
    payment_pending: {
      title: "Booking created",
      body: "Booking is waiting for payment confirmation.",
    },
    payment_confirmed: {
      title: "Payment confirmed",
      body: "Payment was confirmed and the booking is ready for provider handling.",
    },
    provider_accepted: {
      title: "Provider accepted",
      body: "The provider accepted this booking.",
    },
    provider_preparing: {
      title: "Provider preparing",
      body: "The provider is preparing for the appointment.",
    },
    provider_on_the_way: {
      title: "Provider on the way",
      body: "The provider is on the way to the customer location.",
    },
    arrived_at_lobby: {
      title: "Provider arrived",
      body: "The provider arrived at the meeting point.",
    },
    service_started: {
      title: "Service started",
      body: "The wellness service has started.",
    },
    completed: {
      title: "Service completed",
      body: "The booking was completed.",
    },
  };

  return descriptions[status] ?? { title: "Booking updated", body: `Booking status changed to ${status}.` };
}

function canAccessBooking(booking: Booking, user: CurrentUser) {
  if (user.role === "customer") return booking.customerId === user.id;
  if (user.role === "provider") return booking.providerId === user.id;
  return isAdminRole(user.role);
}

function isAdminRole(role: CurrentUser["role"]) {
  return ["support_agent", "safety_manager", "finance_admin", "super_admin"].includes(role);
}

function normalizeCommunicationMessageType(
  user: CurrentUser,
  messageType?: BookingCommunicationEvent["messageType"],
): BookingCommunicationEvent["messageType"] {
  if (messageType) return messageType;
  if (user.role === "customer") return "customer_message";
  if (user.role === "provider") return "provider_message";
  return "support_note";
}

function normalizeCommunicationVisibility(
  user: CurrentUser,
  visibility?: BookingCommunicationEvent["visibility"],
): BookingCommunicationEvent["visibility"] {
  if (visibility) return visibility;
  if (user.role === "customer" || user.role === "provider") return "customer_provider";
  return "admin_internal";
}

function normalizeSupportReason(reasonCode?: CreateBookingSupportRequestInput["reasonCode"]) {
  if (reasonCode === "unsafe_message" || reasonCode === "arrival_issue" || reasonCode === "payment_issue") return reasonCode;
  return "support_request";
}

async function createCommunicationNotifications(booking: Booking, actor: CurrentUser, event: BookingCommunicationEvent) {
  if (event.visibility === "admin_internal") return;

  const targetUserIds = new Set<string>();

  if (actor.role === "customer" && booking.providerId) {
    targetUserIds.add(booking.providerId);
  } else if (actor.role === "provider") {
    targetUserIds.add(booking.customerId);
  } else if (event.visibility === "all_parties") {
    targetUserIds.add(booking.customerId);
    if (booking.providerId) targetUserIds.add(booking.providerId);
  }

  targetUserIds.delete(actor.id);
  if (targetUserIds.size === 0) return;

  const title = actor.role === "customer" ? "New customer message" : actor.role === "provider" ? "New provider message" : "New support message";
  const preview = event.body.length > 120 ? `${event.body.slice(0, 117)}...` : event.body;

  await Promise.all(
    [...targetUserIds].map((userId) =>
      query(
        `
          INSERT INTO notifications (
            id,
            user_id,
            booking_id,
            title,
            body
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [createId("noti"), userId, booking.id, title, preview],
      ),
    ),
  );
}

async function notifyAdminsForSupportRequest(
  booking: Booking,
  actor: CurrentUser,
  reasonCode: ReturnType<typeof normalizeSupportReason>,
  body: string,
) {
  const admins = await query<{ id: string }>(
    `
      SELECT id
      FROM users
      WHERE role IN ('support_agent', 'safety_manager', 'super_admin')
    `,
  );

  if (admins.length === 0) return;

  const title = reasonCode === "unsafe_message" ? "Safety report from booking chat" : "Support request from booking";
  const preview = body.length > 120 ? `${body.slice(0, 117)}...` : body;

  await Promise.all(
    admins
      .filter((admin) => admin.id !== actor.id)
      .map((admin) =>
        query(
          `
            INSERT INTO notifications (
              id,
              user_id,
              booking_id,
              title,
              body
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [createId("noti"), admin.id, booking.id, title, `${actor.role}: ${preview}`],
        ),
      ),
  );
}

async function insertNotification(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  input: { userId: string; bookingId: string; title: string; body: string },
) {
  await client.query(
    `
      INSERT INTO notifications (
        id,
        user_id,
        booking_id,
        title,
        body
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [createId("noti"), input.userId, input.bookingId, input.title, input.body],
  );
}

export function mapBookingError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "SERVICE_NOT_FOUND") {
    return { statusCode: 404, code: "SERVICE_NOT_FOUND", message: "Service not found" };
  }

  if (message === "ADDRESS_NOT_FOUND") {
    return { statusCode: 404, code: "ADDRESS_NOT_FOUND", message: "Address not found for customer" };
  }

  if (message === "SERVICE_OR_ADDRESS_NOT_FOUND") {
    return { statusCode: 404, code: "SERVICE_OR_ADDRESS_NOT_FOUND", message: "Service or address not found" };
  }

  if (message === "PROVIDER_UNAVAILABLE") {
    return { statusCode: 409, code: "PROVIDER_UNAVAILABLE", message: "No available provider for this time and address" };
  }

  if (message === "BOOKING_NOT_FOUND") {
    return { statusCode: 404, code: "BOOKING_NOT_FOUND", message: "Booking not found" };
  }

  if (message === "BOOKING_ACCESS_DENIED") {
    return { statusCode: 403, code: "BOOKING_ACCESS_DENIED", message: "Booking access denied" };
  }

  if (message === "COMMUNICATION_BODY_REQUIRED") {
    return { statusCode: 400, code: "COMMUNICATION_BODY_REQUIRED", message: "Communication body is required" };
  }

  if (message === "COMMUNICATION_BODY_TOO_LONG") {
    return { statusCode: 400, code: "COMMUNICATION_BODY_TOO_LONG", message: "Communication body is too long" };
  }

  if (message === "COMMUNICATION_VISIBILITY_DENIED") {
    return { statusCode: 403, code: "COMMUNICATION_VISIBILITY_DENIED", message: "Communication visibility is not allowed" };
  }

  if (message === "COMMUNICATION_TYPE_DENIED") {
    return { statusCode: 403, code: "COMMUNICATION_TYPE_DENIED", message: "Communication type is not allowed" };
  }

  if (message === "SUPPORT_REQUEST_BODY_REQUIRED") {
    return { statusCode: 400, code: "SUPPORT_REQUEST_BODY_REQUIRED", message: "Support request body is required" };
  }

  if (message === "SUPPORT_REQUEST_ROLE_DENIED") {
    return { statusCode: 403, code: "SUPPORT_REQUEST_ROLE_DENIED", message: "Only customer or provider can create a support request" };
  }

  if (message === "SUPPORT_CASE_STATUS_DENIED") {
    return { statusCode: 403, code: "SUPPORT_CASE_STATUS_DENIED", message: "Support case status access denied" };
  }

  if (message === "BOOKING_ALREADY_ASSIGNED") {
    return { statusCode: 409, code: "BOOKING_ALREADY_ASSIGNED", message: "Booking is already assigned" };
  }

  if (message === "BOOKING_PROVIDER_MISMATCH") {
    return { statusCode: 403, code: "BOOKING_PROVIDER_MISMATCH", message: "Booking belongs to another provider" };
  }

  if (message === "PROVIDER_OFFER_NOT_ACTIVE") {
    return { statusCode: 409, code: "PROVIDER_OFFER_NOT_ACTIVE", message: "Provider offer is no longer active" };
  }

  return {
    statusCode: 500,
    code: "BOOKING_OPERATION_FAILED",
    message: "Booking operation failed",
  };
}
