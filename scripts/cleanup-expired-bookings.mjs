import pg from "pg";
import { createPgPoolConfig } from "./db-config.mjs";
import { loadDotEnv } from "./env.mjs";

loadDotEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured. Copy .env.example to .env and set a real PostgreSQL URL.");
  process.exit(1);
}

const pool = new pg.Pool(createPgPoolConfig());

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const client = await pool.connect();

try {
  await client.query("BEGIN");

  const expiredHoldResult = await client.query(`
    UPDATE booking_slot_holds
    SET released_at = now()
    WHERE released_at IS NULL
      AND expires_at <= now()
    RETURNING booking_id
  `);

  const expiredBookingIds = expiredHoldResult.rows.map((row) => row.booking_id);
  let cancelledCount = 0;

  for (const bookingId of expiredBookingIds) {
    const bookingResult = await client.query(
      `
        UPDATE bookings b
        SET status = 'cancelled', updated_at = now()
        WHERE b.id = $1
          AND b.status = 'payment_pending'
          AND NOT EXISTS (
            SELECT 1
            FROM payments p
            WHERE p.booking_id = b.id
              AND p.status = 'succeeded'
          )
        RETURNING b.id, b.customer_id
      `,
      [bookingId],
    );

    const cancelledBooking = bookingResult.rows[0];
    if (!cancelledBooking) continue;

    cancelledCount += 1;

    await client.query(
      `
        INSERT INTO booking_status_events (id, booking_id, status, actor_user_id)
        VALUES ($1, $2, 'cancelled', $3)
      `,
      [createId("bse"), cancelledBooking.id, cancelledBooking.customer_id],
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
        VALUES ($1, $2, $3, 'Booking expired', 'Your booking was cancelled because payment was not completed in time.')
      `,
      [createId("noti"), cancelledBooking.customer_id, cancelledBooking.id],
    );
  }

  await client.query("COMMIT");
  console.log(`Expired holds released: ${expiredHoldResult.rowCount}`);
  console.log(`Payment-pending bookings cancelled: ${cancelledCount}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
