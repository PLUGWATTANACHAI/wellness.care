import type { CurrentUser } from "../../core/auth/current-user";
import { query } from "../../core/db/client";

export interface CustomerProfileUpdateInput {
  name?: string;
  phone?: string;
  email?: string;
}

export interface CustomerAddressUpdateInput {
  condoName?: string;
  meetingPoint?: string;
  note?: string;
  googlePlaceId?: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
  addressSource?: "manual" | "google_places" | "google_places_demo";
}

export interface ProviderProfileUpdateInput {
  name?: string;
  phone?: string;
  email?: string;
  onlineStatus?: "online" | "offline" | "busy";
}

export async function getCustomerProfile(user: CurrentUser) {
  if (!process.env.DATABASE_URL) {
    return {
      id: user.id,
      name: user.name,
      phone: "08X-XXX-XXXX",
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
      },
    };
  }

  const rows = await query(
    `
      SELECT
        u.id,
        u.name,
        u.phone,
        u.email,
        u.phone_verified AS "phoneVerified",
        cp.tier,
        cp.coins,
        cp.points,
        json_build_object(
          'id', a.id,
          'condoName', a.condo_name,
          'meetingPoint', a.meeting_point,
          'note', a.note,
          'googlePlaceId', a.google_place_id,
          'formattedAddress', a.formatted_address,
          'lat', a.lat,
          'lng', a.lng,
          'addressSource', a.address_source
        ) AS address
      FROM users u
      JOIN customer_profiles cp ON cp.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT
          id,
          condo_name,
          meeting_point,
          note,
          google_place_id,
          formatted_address,
          lat,
          lng,
          address_source
        FROM addresses
        WHERE customer_id = u.id
        ORDER BY created_at DESC
        LIMIT 1
      ) a ON TRUE
      WHERE u.id = $1
    `,
    [user.id],
  );

  return rows[0];
}

export async function updateCustomerProfile(user: CurrentUser, input: CustomerProfileUpdateInput) {
  if (!input.name && !input.phone && !input.email) return getCustomerProfile(user);

  if (!process.env.DATABASE_URL) {
    return getCustomerProfile({ ...user, name: input.name || user.name });
  }

  await query(
    `
      UPDATE users
      SET
        name = COALESCE($2, name),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        updated_at = now()
      WHERE id = $1
    `,
    [user.id, normalizeText(input.name), normalizeText(input.phone), normalizeText(input.email)],
  );

  return getCustomerProfile(user);
}

export async function updateCustomerAddress(user: CurrentUser, input: CustomerAddressUpdateInput) {
  if (
    !input.condoName &&
    !input.meetingPoint &&
    input.note === undefined &&
    !input.googlePlaceId &&
    !input.formattedAddress &&
    input.lat === undefined &&
    input.lng === undefined
  ) {
    return getCustomerProfile(user);
  }

  if (!process.env.DATABASE_URL) {
    return getCustomerProfile(user);
  }

  await query(
    `
      UPDATE addresses
      SET
        condo_name = COALESCE($2, condo_name),
        meeting_point = COALESCE($3, meeting_point),
        note = COALESCE($4, note),
        google_place_id = COALESCE($5, google_place_id),
        formatted_address = COALESCE($6, formatted_address),
        lat = COALESCE($7, lat),
        lng = COALESCE($8, lng),
        address_source = COALESCE($9, address_source),
        place_id_refreshed_at = CASE WHEN $5 IS NULL THEN place_id_refreshed_at ELSE now() END
      WHERE id = (
        SELECT id
        FROM addresses
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      )
    `,
    [
      user.id,
      normalizeText(input.condoName),
      normalizeText(input.meetingPoint),
      input.note ?? null,
      normalizeText(input.googlePlaceId),
      normalizeText(input.formattedAddress),
      typeof input.lat === "number" ? input.lat : null,
      typeof input.lng === "number" ? input.lng : null,
      input.addressSource ?? (input.googlePlaceId ? "google_places" : null),
    ],
  );

  return getCustomerProfile(user);
}

export async function getProviderProfile(user: CurrentUser) {
  if (!process.env.DATABASE_URL) {
    return {
      id: user.id,
      name: user.name,
      phone: "08X-XXX-1111",
      email: "nida@example.com",
      phoneVerified: true,
      rating: 4.9,
      completedJobs: 428,
      onlineStatus: "online",
      serviceRadiusMeters: 8000,
      baseLat: 13.7214,
      baseLng: 100.5131,
      skills: ["นวดคอ บ่า ไหล่ 90 นาที", "สปาเท้า + ทำเล็บ 90 นาที"],
      workingHours: ["Daily 08:00-22:00"],
      verified: true,
    };
  }

  const rows = await query(
    `
      SELECT
        u.id,
        u.name,
        u.phone,
        u.email,
        u.phone_verified AS "phoneVerified",
        pp.rating::FLOAT AS rating,
        pp.completed_jobs AS "completedJobs",
        pp.online_status AS "onlineStatus",
        pp.service_radius_meters AS "serviceRadiusMeters",
        pp.base_lat::FLOAT AS "baseLat",
        pp.base_lng::FLOAT AS "baseLng",
        COALESCE(skills.items, '[]'::json) AS skills,
        COALESCE(hours.items, '[]'::json) AS "workingHours",
        pp.verified_at IS NOT NULL AS verified
      FROM users u
      JOIN provider_profiles pp ON pp.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT json_agg(s.name ORDER BY s.name) AS items
        FROM provider_service_skills pss
        JOIN services s ON s.id = pss.service_id
        WHERE pss.provider_id = u.id
          AND pss.active = TRUE
      ) skills ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(
          CONCAT(
            CASE pwh.day_of_week
              WHEN 1 THEN 'Mon'
              WHEN 2 THEN 'Tue'
              WHEN 3 THEN 'Wed'
              WHEN 4 THEN 'Thu'
              WHEN 5 THEN 'Fri'
              WHEN 6 THEN 'Sat'
              ELSE 'Sun'
            END,
            ' ',
            to_char(pwh.start_time, 'HH24:MI'),
            '-',
            to_char(pwh.end_time, 'HH24:MI')
          )
          ORDER BY pwh.day_of_week, pwh.start_time
        ) AS items
        FROM provider_working_hours pwh
        WHERE pwh.provider_id = u.id
          AND pwh.active = TRUE
      ) hours ON TRUE
      WHERE u.id = $1
    `,
    [user.id],
  );

  return rows[0];
}

export async function updateProviderProfile(user: CurrentUser, input: ProviderProfileUpdateInput) {
  if (!process.env.DATABASE_URL) {
    return getProviderProfile({ ...user, name: input.name || user.name });
  }

  if (input.name || input.phone || input.email) {
    await query(
      `
        UPDATE users
        SET
          name = COALESCE($2, name),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          updated_at = now()
        WHERE id = $1
      `,
      [user.id, normalizeText(input.name), normalizeText(input.phone), normalizeText(input.email)],
    );
  }

  if (input.onlineStatus) {
    await query(
      `
        UPDATE provider_profiles
        SET online_status = $2
        WHERE user_id = $1
      `,
      [user.id, input.onlineStatus],
    );
  }

  return getProviderProfile(user);
}

function normalizeText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
