import type { CurrentUser } from "../../core/auth/current-user";
import { getDbPool, query } from "../../core/db/client";
import { createId, findBookingById } from "../bookings/repository";
import { getLatestProviderLocation, type LatestProviderLocation } from "../location/repository";

export interface AdminLocationAccessInput {
  reasonCode: "safety" | "customer_support" | "provider_support" | "incident_review";
  reasonNote?: string;
}

export interface AdminLocationAccessResult {
  id: string;
  bookingId: string;
  accessLevel: "exact";
  reasonCode: string;
  expiresInMinutes: number;
  location: LatestProviderLocation;
}

export interface AdminAuditLogItem {
  id: string;
  action: string;
  entityId: string;
  actor: string;
  reasonCode: string;
  detail: string;
  createdAt: string;
}

export interface AdminProviderOperationsItem {
  id: string;
  name: string;
  onlineStatus: string;
  verified: boolean;
  serviceRadiusMeters: number;
  skills: string[];
  skillIds: string[];
  workingHours: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    active: boolean;
  }>;
  leaveWindows: AdminProviderLeaveWindow[];
}

export interface AdminServiceOption {
  id: string;
  name: string;
  category: string;
}

export interface AdminProviderOperationsResult {
  providers: AdminProviderOperationsItem[];
  services: AdminServiceOption[];
}

export interface ProviderSkillUpdateInput {
  serviceIds: string[];
}

export interface ProviderWorkingHoursUpdateInput {
  startTime: string;
  endTime: string;
  dayOfWeeks?: number[];
}

export interface AdminProviderLeaveWindow {
  id: string;
  providerId: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
  active: boolean;
  createdAt: string;
}

export interface ProviderLeaveWindowInput {
  startsAt: string;
  endsAt: string;
  reason?: string;
}

export interface AdminReassignmentCandidate {
  providerId: string;
  providerName: string;
  rating?: number;
  distanceMeters: number;
  serviceRadiusMeters: number;
  activeJobCount: number;
  assignmentScore: number;
  hasActiveOffer: boolean;
}

export interface AdminManualReassignmentInput {
  providerId: string;
  reasonNote: string;
}

export interface AdminProviderOfferHistoryItem {
  id: string;
  bookingId: string;
  providerId: string;
  providerName: string;
  offerStatus: "offered" | "accepted" | "rejected" | "expired";
  rankPosition: number;
  assignmentScore: number;
  expiresAt: string;
  respondedAt?: string;
  createdAt: string;
  manualActor?: string;
  manualReason?: string;
}

export interface AdminSupportCaseItem {
  id: string;
  bookingId: string;
  bookingCode: string;
  customer: string;
  provider?: string;
  reporter: string;
  reporterRole: "customer" | "provider";
  reasonCode: "support_request" | "unsafe_message" | "arrival_issue" | "payment_issue";
  status: "open" | "in_review" | "resolved";
  messageType: "support_note" | "incident_note";
  body: string;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSupportCaseUpdateInput {
  status: "open" | "in_review" | "resolved";
  resolutionNote?: string;
}

export async function recordAdminLocationAccess(
  bookingId: string,
  admin: CurrentUser,
  input: AdminLocationAccessInput,
): Promise<AdminLocationAccessResult> {
  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (!booking.providerId) throw new Error("LOCATION_TARGET_NOT_AVAILABLE");

  const location = await getLatestProviderLocation(bookingId);
  if (!location) throw new Error("PROVIDER_LOCATION_NOT_FOUND");

  if (!process.env.DATABASE_URL) {
    return {
      id: "admin_loc_access_dev_001",
      bookingId,
      accessLevel: "exact",
      reasonCode: input.reasonCode,
      expiresInMinutes: 15,
      location,
    };
  }

  const accessLogId = createId("adminloc");
  const auditLogId = createId("audit");

  await query(
    `
      INSERT INTO admin_location_access_logs (
        id,
        admin_user_id,
        booking_id,
        target_user_id,
        access_level,
        reason_code,
        reason_note,
        expires_at
      )
      VALUES ($1, $2, $3, $4, 'exact', $5, $6, now() + interval '15 minutes')
    `,
    [accessLogId, admin.id, bookingId, booking.providerId, input.reasonCode, input.reasonNote ?? null],
  );

  await query(
    `
      INSERT INTO audit_logs (
        id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        metadata_json
      )
      VALUES ($1, $2, 'admin.location_access_opened', 'booking', $3, $4::jsonb)
    `,
    [
      auditLogId,
      admin.id,
      bookingId,
      JSON.stringify({
        accessLogId,
        accessLevel: "exact",
        reasonCode: input.reasonCode,
        reasonNote: input.reasonNote ?? null,
      }),
    ],
  );

  return {
    id: accessLogId,
    bookingId,
    accessLevel: "exact",
    reasonCode: input.reasonCode,
    expiresInMinutes: 15,
    location,
  };
}

export async function listAdminSupportCases(): Promise<AdminSupportCaseItem[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        id: "case_dev_001",
        bookingId: "book_240618",
        bookingCode: "#WN-240618",
        customer: "พี่ปลั๊ก",
        provider: "นิดา",
        reporter: "พี่ปลั๊ก",
        reporterRole: "customer",
        reasonCode: "unsafe_message",
        status: "open",
        messageType: "incident_note",
        body: "[unsafe_message] Demo safety report for admin triage.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  return query<AdminSupportCaseItem>(
    `
      SELECT
        c.id,
        c.booking_id AS "bookingId",
        b.code AS "bookingCode",
        customer.name AS customer,
        provider.name AS provider,
        reporter.name AS reporter,
        c.reporter_role AS "reporterRole",
        c.reason_code AS "reasonCode",
        c.status,
        e.message_type AS "messageType",
        e.body,
        c.resolution_note AS "resolutionNote",
        resolver.name AS "resolvedBy",
        c.resolved_at AS "resolvedAt",
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt"
      FROM booking_support_cases c
      JOIN bookings b ON b.id = c.booking_id
      JOIN users customer ON customer.id = b.customer_id
      LEFT JOIN users provider ON provider.id = b.provider_id
      JOIN users reporter ON reporter.id = c.reporter_user_id
      JOIN booking_communication_events e ON e.id = c.communication_event_id
      LEFT JOIN users resolver ON resolver.id = c.resolved_by_user_id
      ORDER BY
        CASE c.status
          WHEN 'open' THEN 1
          WHEN 'in_review' THEN 2
          ELSE 3
        END,
        c.created_at DESC
      LIMIT 50
    `,
  );
}

export async function updateAdminSupportCaseStatus(
  caseId: string,
  admin: CurrentUser,
  input: AdminSupportCaseUpdateInput,
): Promise<AdminSupportCaseItem> {
  if (!["open", "in_review", "resolved"].includes(input.status)) throw new Error("SUPPORT_CASE_STATUS_INVALID");
  if (input.status === "resolved" && !input.resolutionNote?.trim()) throw new Error("SUPPORT_CASE_RESOLUTION_REQUIRED");

  if (!process.env.DATABASE_URL) {
    return {
      id: caseId,
      bookingId: "book_240618",
      bookingCode: "#WN-240618",
      customer: "พี่ปลั๊ก",
      provider: "นิดา",
      reporter: "พี่ปลั๊ก",
      reporterRole: "customer",
      reasonCode: "support_request",
      status: input.status,
      messageType: "support_note",
      body: "Demo support case",
      resolutionNote: input.resolutionNote,
      resolvedBy: input.status === "resolved" ? admin.name : undefined,
      resolvedAt: input.status === "resolved" ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const rows = await query<AdminSupportCaseItem>(
    `
      WITH updated AS (
        UPDATE booking_support_cases
        SET
          status = $2,
          resolution_note = CASE WHEN $2 = 'resolved' THEN $3 ELSE resolution_note END,
          resolved_by_user_id = CASE WHEN $2 = 'resolved' THEN $4 ELSE NULL END,
          resolved_at = CASE WHEN $2 = 'resolved' THEN now() ELSE NULL END,
          updated_at = now()
        WHERE id = $1
        RETURNING *
      )
      SELECT
        c.id,
        c.booking_id AS "bookingId",
        b.code AS "bookingCode",
        customer.name AS customer,
        provider.name AS provider,
        reporter.name AS reporter,
        c.reporter_role AS "reporterRole",
        c.reason_code AS "reasonCode",
        c.status,
        e.message_type AS "messageType",
        e.body,
        c.resolution_note AS "resolutionNote",
        resolver.name AS "resolvedBy",
        c.resolved_at AS "resolvedAt",
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt"
      FROM updated c
      JOIN bookings b ON b.id = c.booking_id
      JOIN users customer ON customer.id = b.customer_id
      LEFT JOIN users provider ON provider.id = b.provider_id
      JOIN users reporter ON reporter.id = c.reporter_user_id
      JOIN booking_communication_events e ON e.id = c.communication_event_id
      LEFT JOIN users resolver ON resolver.id = c.resolved_by_user_id
    `,
    [caseId, input.status, input.resolutionNote?.trim() ?? null, admin.id],
  );

  if (!rows[0]) throw new Error("SUPPORT_CASE_NOT_FOUND");
  return rows[0];
}

export async function listAdminAuditLogs(): Promise<AdminAuditLogItem[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        id: "audit_dev_001",
        action: "admin.location_access_opened",
        entityId: "book_240618",
        actor: "มินท์ Ops",
        reasonCode: "safety",
        detail: "Opened exact provider location",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return query<AdminAuditLogItem>(
    `
      SELECT
        a.id,
        a.action,
        a.entity_id AS "entityId",
        COALESCE(u.name, 'Unknown admin') AS actor,
        COALESCE(a.metadata_json->>'reasonCode', a.metadata_json->>'providerName', '-') AS "reasonCode",
        CASE
          WHEN a.action = 'admin.provider_skills_updated'
            THEN CONCAT('Skills: ', COALESCE(a.metadata_json->>'serviceIds', '[]'))
          WHEN a.action = 'admin.provider_hours_updated'
            THEN CONCAT('Hours: ', COALESCE(a.metadata_json->>'startTime', '-'), '-', COALESCE(a.metadata_json->>'endTime', '-'))
          WHEN a.action = 'admin.provider_leave_created'
            THEN CONCAT('Leave: ', COALESCE(a.metadata_json->>'startsAt', '-'), ' to ', COALESCE(a.metadata_json->>'endsAt', '-'))
          WHEN a.action = 'admin.provider_leave_deactivated'
            THEN CONCAT('Leave deactivated: ', COALESCE(a.metadata_json->>'leaveWindowId', '-'))
          WHEN a.action = 'admin.provider_reassigned'
            THEN CONCAT('Re-offered to ', COALESCE(a.metadata_json->>'providerName', '-'), ': ', COALESCE(a.metadata_json->>'reasonNote', '-'))
          ELSE COALESCE(a.metadata_json->>'reasonNote', 'Opened exact provider location')
        END AS detail,
        a.created_at AS "createdAt"
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_user_id
      WHERE a.action IN (
        'admin.location_access_opened',
        'admin.provider_skills_updated',
        'admin.provider_hours_updated',
        'admin.provider_leave_created',
        'admin.provider_leave_deactivated',
        'admin.provider_reassigned'
      )
      ORDER BY a.created_at DESC
      LIMIT 20
    `,
  );
}

export async function listAdminUsers() {
  if (!process.env.DATABASE_URL) {
    return [
      {
        id: "usr_customer_001",
        role: "customer",
        name: "พี่ปลั๊ก ปภาวิน",
        phone: "08X-XXX-XXXX",
        email: "plug@example.com",
      },
      {
        id: "usr_provider_001",
        role: "provider",
        name: "นิดา สุขสบาย",
        phone: "08X-XXX-1111",
        email: "nida@example.com",
      },
    ];
  }

  return query<{
    id: string;
    role: string;
    name: string;
    phone?: string;
    email?: string;
  }>(
    `
      SELECT
        id,
        role,
        name,
        phone,
        email
      FROM users
      WHERE role IN ('customer', 'provider')
      ORDER BY created_at DESC
      LIMIT 20
    `,
  );
}

export async function listAdminProviderOperations(): Promise<AdminProviderOperationsResult> {
  if (!process.env.DATABASE_URL) {
    return {
      providers: [
        {
          id: "usr_provider_001",
          name: "นิดา สุขสบาย",
          onlineStatus: "online",
          verified: true,
          serviceRadiusMeters: 8000,
          skills: ["นวดคอ บ่า ไหล่ 90 นาที", "สปาเท้า + ทำเล็บ 90 นาที"],
          skillIds: ["svc_massage_90", "svc_beauty_90"],
          workingHours: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
            dayOfWeek,
            startTime: "08:00",
            endTime: "22:00",
            active: true,
          })),
          leaveWindows: [],
        },
      ],
      services: [
        { id: "svc_massage_90", name: "นวดคอ บ่า ไหล่ 90 นาที", category: "Massage" },
        { id: "svc_beauty_90", name: "สปาเท้า + ทำเล็บ 90 นาที", category: "Beauty & Relax" },
        { id: "svc_product_sleep", name: "Aroma Sleep Set พร้อมจัดส่ง", category: "Wellness Products" },
      ],
    };
  }

  const [providers, services] = await Promise.all([
    query<AdminProviderOperationsItem>(
      `
        SELECT
          u.id,
          u.name,
          pp.online_status AS "onlineStatus",
          pp.verified_at IS NOT NULL AS verified,
          pp.service_radius_meters AS "serviceRadiusMeters",
          COALESCE(skill_names.items, ARRAY[]::text[]) AS skills,
          COALESCE(skill_ids.items, ARRAY[]::text[]) AS "skillIds",
          COALESCE(hours.items, '[]'::json) AS "workingHours",
          COALESCE(leave_windows.items, '[]'::json) AS "leaveWindows"
        FROM users u
        JOIN provider_profiles pp ON pp.user_id = u.id
        LEFT JOIN LATERAL (
          SELECT array_agg(s.name ORDER BY s.name) AS items
          FROM provider_service_skills pss
          JOIN services s ON s.id = pss.service_id
          WHERE pss.provider_id = u.id
            AND pss.active = TRUE
        ) skill_names ON TRUE
        LEFT JOIN LATERAL (
          SELECT array_agg(pss.service_id ORDER BY pss.service_id) AS items
          FROM provider_service_skills pss
          WHERE pss.provider_id = u.id
            AND pss.active = TRUE
        ) skill_ids ON TRUE
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'dayOfWeek', pwh.day_of_week,
              'startTime', to_char(pwh.start_time, 'HH24:MI'),
              'endTime', to_char(pwh.end_time, 'HH24:MI'),
              'active', pwh.active
            )
            ORDER BY pwh.day_of_week
          ) AS items
        FROM provider_working_hours pwh
        WHERE pwh.provider_id = u.id
          AND pwh.active = TRUE
      ) hours ON TRUE
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'id', plw.id,
              'providerId', plw.provider_id,
              'startsAt', plw.starts_at,
              'endsAt', plw.ends_at,
              'reason', plw.reason,
              'active', plw.active,
              'createdAt', plw.created_at
            )
            ORDER BY plw.starts_at ASC
          ) AS items
          FROM provider_leave_windows plw
          WHERE plw.provider_id = u.id
            AND plw.active = TRUE
            AND plw.ends_at > now()
        ) leave_windows ON TRUE
        WHERE u.role = 'provider'
        ORDER BY u.name
      `,
    ),
    query<AdminServiceOption>(
      `
        SELECT
          s.id,
          s.name,
          sc.name AS category
        FROM services s
        JOIN service_categories sc ON sc.id = s.category_id
        WHERE s.active = TRUE
        ORDER BY sc.name, s.name
      `,
    ),
  ]);

  return { providers, services };
}

export async function createProviderLeaveWindow(
  providerId: string,
  admin: CurrentUser,
  input: ProviderLeaveWindowInput,
) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    throw new Error("INVALID_LEAVE_WINDOW");
  }

  if (!process.env.DATABASE_URL) {
    return {
      id: "plw_dev_001",
      providerId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      reason: input.reason,
      active: true,
      createdAt: new Date().toISOString(),
    };
  }

  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const client = await db.connect();
  const leaveWindowId = createId("plw");

  try {
    await client.query("BEGIN");

    const providerResult = await client.query<{ name: string }>("SELECT name FROM users WHERE id = $1 AND role = 'provider'", [
      providerId,
    ]);
    if (!providerResult.rows[0]) throw new Error("PROVIDER_NOT_FOUND");

    const result = await client.query<AdminProviderLeaveWindow>(
      `
        INSERT INTO provider_leave_windows (
          id,
          provider_id,
          starts_at,
          ends_at,
          reason,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          provider_id AS "providerId",
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          reason,
          active,
          created_at AS "createdAt"
      `,
      [leaveWindowId, providerId, startsAt.toISOString(), endsAt.toISOString(), input.reason ?? null, admin.id],
    );

    await client.query(
      `
        INSERT INTO audit_logs (
          id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          metadata_json
        )
        VALUES ($1, $2, 'admin.provider_leave_created', 'provider', $3, $4::jsonb)
      `,
      [
        createId("audit"),
        admin.id,
        providerId,
        JSON.stringify({
          providerName: providerResult.rows[0].name,
          leaveWindowId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          reason: input.reason ?? null,
        }),
      ],
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deactivateProviderLeaveWindow(providerId: string, leaveWindowId: string, admin: CurrentUser) {
  if (!process.env.DATABASE_URL) {
    return { providerId, leaveWindowId, active: false };
  }

  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<{ id: string }>(
      `
        UPDATE provider_leave_windows
        SET active = FALSE
        WHERE id = $1
          AND provider_id = $2
          AND active = TRUE
        RETURNING id
      `,
      [leaveWindowId, providerId],
    );
    if (!result.rows[0]) throw new Error("LEAVE_WINDOW_NOT_FOUND");

    const providerResult = await client.query<{ name: string }>("SELECT name FROM users WHERE id = $1", [providerId]);

    await client.query(
      `
        INSERT INTO audit_logs (
          id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          metadata_json
        )
        VALUES ($1, $2, 'admin.provider_leave_deactivated', 'provider', $3, $4::jsonb)
      `,
      [
        createId("audit"),
        admin.id,
        providerId,
        JSON.stringify({
          providerName: providerResult.rows[0]?.name || providerId,
          leaveWindowId,
        }),
      ],
    );

    await client.query("COMMIT");
    return { providerId, leaveWindowId, active: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminReassignmentCandidates(bookingId: string): Promise<AdminReassignmentCandidate[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        providerId: "usr_provider_001",
        providerName: "นิดา สุขสบาย",
        rating: 4.9,
        distanceMeters: 0,
        serviceRadiusMeters: 8000,
        activeJobCount: 0,
        assignmentScore: 1,
        hasActiveOffer: false,
      },
    ];
  }

  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error("BOOKING_NOT_FOUND");

  return query<AdminReassignmentCandidate>(
    `
      WITH booking_context AS (
        SELECT
          b.id AS booking_id,
          b.service_id,
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
          u.name,
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
          ) AS distance_meters,
          EXISTS (
            SELECT 1
            FROM booking_provider_offers offer
            WHERE offer.booking_id = $1
              AND offer.provider_id = u.id
              AND offer.offer_status = 'offered'
              AND offer.expires_at > now()
          ) AS has_active_offer
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
      )
      SELECT
        c.id AS "providerId",
        c.name AS "providerName",
        c.rating,
        ROUND(c.distance_meters)::INTEGER AS "distanceMeters",
        c.service_radius_meters AS "serviceRadiusMeters",
        c.active_job_count AS "activeJobCount",
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
        )::FLOAT AS "assignmentScore",
        c.has_active_offer AS "hasActiveOffer"
      FROM available_candidates c
      ORDER BY "assignmentScore" DESC, c.distance_meters ASC, c.rating DESC NULLS LAST
    `,
    [bookingId],
  );
}

export async function manuallyReassignProvider(
  bookingId: string,
  admin: CurrentUser,
  input: AdminManualReassignmentInput,
) {
  if (!input.providerId || !input.reasonNote?.trim()) throw new Error("REASSIGNMENT_REASON_REQUIRED");

  if (!process.env.DATABASE_URL) {
    return {
      bookingId,
      providerId: input.providerId,
      status: "provider_offered",
      reasonNote: input.reasonNote,
    };
  }

  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const bookingResult = await client.query<{ id: string; status: string }>(
      "SELECT id, status FROM bookings WHERE id = $1 FOR UPDATE",
      [bookingId],
    );
    if (!bookingResult.rows[0]) throw new Error("BOOKING_NOT_FOUND");

    const candidates = await listAdminReassignmentCandidates(bookingId);
    const candidate = candidates.find((item) => item.providerId === input.providerId);
    if (!candidate) throw new Error("PROVIDER_NOT_ELIGIBLE");

    const rankResult = await client.query<{ rank_position: number }>(
      `
        SELECT COALESCE(MAX(rank_position), 0) + 1 AS rank_position
        FROM booking_provider_offers
        WHERE booking_id = $1
      `,
      [bookingId],
    );

    await client.query(
      `
        UPDATE booking_provider_offers
        SET offer_status = 'expired', responded_at = now()
        WHERE booking_id = $1
          AND offer_status = 'offered'
      `,
      [bookingId],
    );

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
        VALUES ($1, $2, $3, 'offered', $4, $5, now() + make_interval(mins => 5))
      `,
      [
        createId("offer"),
        bookingId,
        input.providerId,
        rankResult.rows[0]?.rank_position ?? 1,
        candidate.assignmentScore,
      ],
    );

    await client.query(
      `
        UPDATE bookings
        SET status = 'provider_offered', provider_id = $2, updated_at = now()
        WHERE id = $1
      `,
      [bookingId, input.providerId],
    );

    await client.query(
      `
        INSERT INTO booking_status_events (id, booking_id, status, actor_user_id)
        VALUES ($1, $2, 'provider_offered', $3)
      `,
      [createId("bse"), bookingId, admin.id],
    );

    await client.query(
      `
        INSERT INTO notifications (
          id,
          user_id,
          booking_id,
          title,
          body
        )
        VALUES ($1, $2, $3, 'Manual booking offer', 'An admin offered you this booking for review.')
      `,
      [createId("noti"), input.providerId, bookingId],
    );

    await client.query(
      `
        INSERT INTO audit_logs (
          id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          metadata_json
        )
        VALUES ($1, $2, 'admin.provider_reassigned', 'booking', $3, $4::jsonb)
      `,
      [
        createId("audit"),
        admin.id,
        bookingId,
        JSON.stringify({
          providerId: input.providerId,
          providerName: candidate.providerName,
          assignmentScore: candidate.assignmentScore,
          reasonNote: input.reasonNote.trim(),
        }),
      ],
    );

    await client.query("COMMIT");
    return {
      bookingId,
      providerId: input.providerId,
      providerName: candidate.providerName,
      status: "provider_offered",
      offerMinutes: 5,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminProviderOfferHistory(bookingId: string): Promise<AdminProviderOfferHistoryItem[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        id: "offer_dev_001",
        bookingId,
        providerId: "usr_provider_001",
        providerName: "นิดา สุขสบาย",
        offerStatus: "offered",
        rankPosition: 1,
        assignmentScore: 1,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error("BOOKING_NOT_FOUND");

  return query<AdminProviderOfferHistoryItem>(
    `
      SELECT
        offer.id,
        offer.booking_id AS "bookingId",
        offer.provider_id AS "providerId",
        provider.name AS "providerName",
        offer.offer_status AS "offerStatus",
        offer.rank_position AS "rankPosition",
        offer.assignment_score::FLOAT AS "assignmentScore",
        offer.expires_at AS "expiresAt",
        offer.responded_at AS "respondedAt",
        offer.created_at AS "createdAt",
        manual.actor AS "manualActor",
        manual.reason_note AS "manualReason"
      FROM booking_provider_offers offer
      JOIN users provider ON provider.id = offer.provider_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(admin_user.name, 'Unknown admin') AS actor,
          audit.metadata_json->>'reasonNote' AS reason_note
        FROM audit_logs audit
        LEFT JOIN users admin_user ON admin_user.id = audit.actor_user_id
        WHERE audit.action = 'admin.provider_reassigned'
          AND audit.entity_id = offer.booking_id
          AND audit.metadata_json->>'providerId' = offer.provider_id
          AND audit.created_at >= offer.created_at
          AND audit.created_at <= offer.created_at + interval '10 seconds'
          AND NOT EXISTS (
            SELECT 1
            FROM booking_provider_offers newer_offer
            WHERE newer_offer.booking_id = offer.booking_id
              AND newer_offer.provider_id = offer.provider_id
              AND newer_offer.created_at > offer.created_at
              AND newer_offer.created_at <= audit.created_at
          )
        ORDER BY audit.created_at DESC
        LIMIT 1
      ) manual ON TRUE
      WHERE offer.booking_id = $1
      ORDER BY offer.rank_position ASC, offer.created_at ASC
    `,
    [bookingId],
  );
}

export async function updateProviderSkills(providerId: string, admin: CurrentUser, input: ProviderSkillUpdateInput) {
  if (!process.env.DATABASE_URL) {
    return { providerId, serviceIds: input.serviceIds };
  }

  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await client.query("UPDATE provider_service_skills SET active = FALSE WHERE provider_id = $1", [providerId]);

    for (const serviceId of input.serviceIds) {
      await client.query(
        `
          INSERT INTO provider_service_skills (provider_id, service_id, active)
          VALUES ($1, $2, TRUE)
          ON CONFLICT (provider_id, service_id)
          DO UPDATE SET active = TRUE
        `,
        [providerId, serviceId],
      );
    }

    const providerResult = await client.query<{ name: string }>("SELECT name FROM users WHERE id = $1", [providerId]);
    const serviceResult = await client.query<{ id: string; name: string }>(
      "SELECT id, name FROM services WHERE id = ANY($1::text[]) ORDER BY name",
      [input.serviceIds],
    );

    await client.query(
      `
        INSERT INTO audit_logs (
          id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          metadata_json
        )
        VALUES ($1, $2, 'admin.provider_skills_updated', 'provider', $3, $4::jsonb)
      `,
      [
        createId("audit"),
        admin.id,
        providerId,
        JSON.stringify({
          providerName: providerResult.rows[0]?.name || providerId,
          serviceIds: input.serviceIds,
          serviceNames: serviceResult.rows.map((service) => service.name),
        }),
      ],
    );

    await client.query("COMMIT");
    return { providerId, serviceIds: input.serviceIds };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateProviderWorkingHours(
  providerId: string,
  admin: CurrentUser,
  input: ProviderWorkingHoursUpdateInput,
) {
  if (!process.env.DATABASE_URL) {
    return { providerId, ...input };
  }

  const days = input.dayOfWeeks?.length ? input.dayOfWeeks : [1, 2, 3, 4, 5, 6, 7];
  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await client.query("UPDATE provider_working_hours SET active = FALSE WHERE provider_id = $1", [providerId]);

    for (const dayOfWeek of days) {
      await client.query(
        `
          INSERT INTO provider_working_hours (
            id,
            provider_id,
            day_of_week,
            start_time,
            end_time,
            active
          )
          VALUES ($1, $2, $3, $4, $5, TRUE)
          ON CONFLICT (id)
          DO UPDATE SET
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            active = TRUE
        `,
        [`pwh_${providerId}_${dayOfWeek}`, providerId, dayOfWeek, input.startTime, input.endTime],
      );
    }

    const providerResult = await client.query<{ name: string }>("SELECT name FROM users WHERE id = $1", [providerId]);

    await client.query(
      `
        INSERT INTO audit_logs (
          id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          metadata_json
        )
        VALUES ($1, $2, 'admin.provider_hours_updated', 'provider', $3, $4::jsonb)
      `,
      [
        createId("audit"),
        admin.id,
        providerId,
        JSON.stringify({
          providerName: providerResult.rows[0]?.name || providerId,
          startTime: input.startTime,
          endTime: input.endTime,
          dayOfWeeks: days,
        }),
      ],
    );

    await client.query("COMMIT");
    return { providerId, startTime: input.startTime, endTime: input.endTime, dayOfWeeks: days };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function mapAdminError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "BOOKING_NOT_FOUND") {
    return { statusCode: 404, code: "BOOKING_NOT_FOUND", message: "Booking not found" };
  }

  if (message === "LOCATION_TARGET_NOT_AVAILABLE") {
    return { statusCode: 409, code: "LOCATION_TARGET_NOT_AVAILABLE", message: "Booking has no assigned provider" };
  }

  if (message === "PROVIDER_LOCATION_NOT_FOUND") {
    return { statusCode: 404, code: "PROVIDER_LOCATION_NOT_FOUND", message: "Provider location not found" };
  }

  if (message === "INVALID_LEAVE_WINDOW") {
    return { statusCode: 400, code: "INVALID_LEAVE_WINDOW", message: "Leave window start/end time is invalid" };
  }

  if (message === "PROVIDER_NOT_FOUND") {
    return { statusCode: 404, code: "PROVIDER_NOT_FOUND", message: "Provider not found" };
  }

  if (message === "LEAVE_WINDOW_NOT_FOUND") {
    return { statusCode: 404, code: "LEAVE_WINDOW_NOT_FOUND", message: "Leave window not found" };
  }

  if (message === "REASSIGNMENT_REASON_REQUIRED") {
    return { statusCode: 400, code: "REASSIGNMENT_REASON_REQUIRED", message: "Reassignment reason is required" };
  }

  if (message === "PROVIDER_NOT_ELIGIBLE") {
    return { statusCode: 409, code: "PROVIDER_NOT_ELIGIBLE", message: "Provider is not eligible for this booking" };
  }

  if (message === "SUPPORT_CASE_NOT_FOUND") {
    return { statusCode: 404, code: "SUPPORT_CASE_NOT_FOUND", message: "Support case not found" };
  }

  if (message === "SUPPORT_CASE_STATUS_INVALID") {
    return { statusCode: 400, code: "SUPPORT_CASE_STATUS_INVALID", message: "Support case status is invalid" };
  }

  if (message === "SUPPORT_CASE_RESOLUTION_REQUIRED") {
    return { statusCode: 400, code: "SUPPORT_CASE_RESOLUTION_REQUIRED", message: "Resolution note is required to resolve a case" };
  }

  return { statusCode: 500, code: "ADMIN_OPERATION_FAILED", message: "Admin operation failed" };
}
