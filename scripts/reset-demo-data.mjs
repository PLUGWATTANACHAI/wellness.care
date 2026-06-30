import pg from "pg";
import { createPgPoolConfig } from "./db-config.mjs";
import { loadDotEnv } from "./env.mjs";

loadDotEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured. Copy .env.example to .env and set a real PostgreSQL URL.");
  process.exit(1);
}

const pool = new pg.Pool(createPgPoolConfig());

const seedBookingId = "book_240618";

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM booking_support_cases WHERE booking_id <> $1", [seedBookingId]);
    await client.query("DELETE FROM booking_communication_events WHERE booking_id <> $1", [seedBookingId]);
    await client.query("DELETE FROM notifications WHERE booking_id IS NULL OR booking_id <> $1", [seedBookingId]);
    await client.query("DELETE FROM booking_provider_offers WHERE booking_id <> $1", [seedBookingId]);
    await client.query("DELETE FROM booking_provider_assignments WHERE booking_id <> $1", [seedBookingId]);
    await client.query("DELETE FROM booking_slot_holds WHERE booking_id <> $1", [seedBookingId]);
    await client.query("DELETE FROM payments WHERE booking_id <> $1", [seedBookingId]);
    await client.query("DELETE FROM location_events WHERE booking_id <> $1", [seedBookingId]);
    await client.query("DELETE FROM location_sessions WHERE booking_id <> $1", [seedBookingId]);
    await client.query("DELETE FROM admin_location_access_logs WHERE booking_id <> $1", [seedBookingId]);
    await client.query("DELETE FROM booking_status_events WHERE booking_id <> $1", [seedBookingId]);
    await client.query("DELETE FROM bookings WHERE id <> $1", [seedBookingId]);

    await client.query("COMMIT");
    console.log("Demo data reset complete. Seed booking and master data were kept.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
