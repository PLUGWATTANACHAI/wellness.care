import { getDbPool, query } from "../../core/db/client";
import { createId } from "../bookings/repository";

export interface LocationInput {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}

export interface LatestProviderLocation {
  bookingId: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  stale: boolean;
  lastUpdatedSecondsAgo: number;
  visibility: "customer_active_booking_only";
}

export async function recordProviderLocation(bookingId: string, providerId: string, input: LocationInput) {
  if (!process.env.DATABASE_URL) {
    return {
      bookingId,
      accepted: true,
      visibility: "customer_active_booking_only",
      retentionHours: 72,
    };
  }

  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");

  const client = await db.connect();
  const sessionId = createId("locsess");
  const eventId = createId("locevt");
  const retentionHours = Number(process.env.LOCATION_RETENTION_HOURS || 72);

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO location_sessions (id, booking_id, provider_id, status)
        VALUES ($1, $2, $3, 'active')
        ON CONFLICT DO NOTHING
      `,
      [sessionId, bookingId, providerId],
    );

    await client.query(
      `
        INSERT INTO location_events (
          id,
          booking_id,
          provider_id,
          lat,
          lng,
          accuracy_meters,
          visibility,
          retention_hours
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'customer_active_booking_only', $7)
      `,
      [eventId, bookingId, providerId, input.lat, input.lng, input.accuracyMeters ?? null, retentionHours],
    );

    await client.query("COMMIT");

    return {
      bookingId,
      accepted: true,
      visibility: "customer_active_booking_only",
      retentionHours,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getLatestProviderLocation(bookingId: string): Promise<LatestProviderLocation | undefined> {
  if (!process.env.DATABASE_URL) {
    return {
      bookingId,
      lat: 13.7214,
      lng: 100.5131,
      accuracyMeters: 18,
      stale: false,
      lastUpdatedSecondsAgo: 12,
      visibility: "customer_active_booking_only",
    };
  }

  const rows = await query<{
    bookingId: string;
    lat: string;
    lng: string;
    accuracyMeters?: number | null;
    secondsAgo: string;
  }>(
    `
      SELECT
        booking_id AS "bookingId",
        lat,
        lng,
        accuracy_meters AS "accuracyMeters",
        EXTRACT(EPOCH FROM (now() - created_at))::TEXT AS "secondsAgo"
      FROM location_events
      WHERE booking_id = $1
        AND visibility = 'customer_active_booking_only'
        AND created_at >= now() - (retention_hours || ' hours')::interval
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [bookingId],
  );

  const latest = rows[0];
  if (!latest) return undefined;

  const secondsAgo = Number(latest.secondsAgo);

  return {
    bookingId: latest.bookingId,
    lat: Number(latest.lat),
    lng: Number(latest.lng),
    accuracyMeters: latest.accuracyMeters ?? undefined,
    stale: secondsAgo > 60,
    lastUpdatedSecondsAgo: Math.round(secondsAgo),
    visibility: "customer_active_booking_only",
  };
}
