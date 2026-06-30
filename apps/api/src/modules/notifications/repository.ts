import type { CurrentUser } from "../../core/auth/current-user";
import { query } from "../../core/db/client";

export interface NotificationInput {
  userId: string;
  bookingId?: string;
  title: string;
  body: string;
}

export interface NotificationItem {
  id: string;
  bookingId?: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export async function createNotification(input: NotificationInput) {
  if (!process.env.DATABASE_URL) return undefined;

  await query(
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
    [createNotificationId(), input.userId, input.bookingId ?? null, input.title, input.body],
  );
}

export async function listNotifications(user: CurrentUser): Promise<NotificationItem[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        id: "noti_dev_001",
        bookingId: "book_240618",
        title: "Payment confirmed",
        body: "Your Wellnest booking is confirmed.",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return query<NotificationItem>(
    `
      SELECT
        id,
        booking_id AS "bookingId",
        title,
        body,
        read_at AS "readAt",
        created_at AS "createdAt"
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 30
    `,
    [user.id],
  );
}

export async function markNotificationRead(user: CurrentUser, id: string) {
  if (!process.env.DATABASE_URL) {
    return { id, read: true };
  }

  const rows = await query<{ id: string; readAt: string }>(
    `
      UPDATE notifications
      SET read_at = now()
      WHERE id = $1
        AND user_id = $2
      RETURNING id, read_at AS "readAt"
    `,
    [id, user.id],
  );

  return rows[0];
}

function createNotificationId() {
  return `noti_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
