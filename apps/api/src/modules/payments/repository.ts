import type { CurrentUser } from "../../core/auth/current-user";
import { getDbPool, query } from "../../core/db/client";
import { createId, createProviderOfferAfterPayment, findBookingById } from "../bookings/repository";
import { assertSandboxPaymentAllowed, createProviderPaymentIntent, verifyPaymentWebhook } from "./provider";

export interface PaymentIntentInput {
  bookingId: string;
  method?: "promptpay" | "card";
  cardToken?: string;
}

export interface PaymentIntentResult {
  id: string;
  bookingId: string;
  provider: string;
  providerReference: string;
  paymentMethod: "promptpay" | "card";
  amountTHB: number;
  status: "requires_confirmation" | "succeeded" | "failed";
  checkoutUrl?: string;
}

export interface PriceBreakdownResult {
  bookingId: string;
  subtotalTHB: number;
  coinsUsed: number;
  coinsDiscountTHB: number;
  pointsEarned: number;
  platformFeeTHB: number;
  totalTHB: number;
  currency: "THB";
}

export interface PaymentWebhookInput {
  headers: Record<string, string | undefined>;
  body: unknown;
  rawBody?: string;
}

export interface PaymentWebhookResult {
  received: true;
  idempotent: boolean;
  processed: boolean;
  paymentId?: string;
  status?: "succeeded" | "failed" | "pending";
}

export async function getPriceBreakdown(customer: CurrentUser, bookingId: string): Promise<PriceBreakdownResult> {
  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (booking.customerId !== customer.id) throw new Error("PAYMENT_BOOKING_DENIED");

  if (!process.env.DATABASE_URL) {
    return calculatePriceBreakdown({
      bookingId,
      subtotalTHB: booking.totalTHB,
      customerCoins: 2450,
      durationMinutes: 90,
    });
  }

  const rows = await query<{
    bookingId: string;
    subtotalTHB: number;
    customerCoins: number;
    durationMinutes: number;
  }>(
    `
      SELECT
        b.id AS "bookingId",
        b.total_thb AS "subtotalTHB",
        cp.coins AS "customerCoins",
        s.duration_minutes AS "durationMinutes"
      FROM bookings b
      JOIN customer_profiles cp ON cp.user_id = b.customer_id
      JOIN services s ON s.id = b.service_id
      WHERE b.id = $1
        AND b.customer_id = $2
    `,
    [bookingId, customer.id],
  );

  const row = rows[0];
  if (!row) throw new Error("BOOKING_NOT_FOUND");
  return calculatePriceBreakdown(row);
}

export async function createPaymentIntent(
  customer: CurrentUser,
  input: PaymentIntentInput,
): Promise<PaymentIntentResult> {
  const booking = await findBookingById(input.bookingId);
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (booking.customerId !== customer.id) throw new Error("PAYMENT_BOOKING_DENIED");
  if (!["payment_pending", "payment_confirmed"].includes(booking.status)) {
    throw new Error("PAYMENT_BOOKING_STATUS_INVALID");
  }

  if (!process.env.DATABASE_URL) {
    const breakdown = await getPriceBreakdown(customer, input.bookingId);
    return {
      id: "pay_dev_001",
      bookingId: input.bookingId,
      provider: "sandbox",
      providerReference: "sandbox_ref_dev_001",
      paymentMethod: normalizePaymentMethod(input.method),
      amountTHB: breakdown.totalTHB,
      status: "requires_confirmation",
    };
  }

  const breakdown = await getPriceBreakdown(customer, input.bookingId);
  const hold = await query<{ id: string }>(
    `
      SELECT id
      FROM booking_slot_holds
      WHERE booking_id = $1
        AND released_at IS NULL
        AND expires_at > now()
    `,
    [input.bookingId],
  );

  if (!hold[0]) {
    throw new Error("PAYMENT_SLOT_HOLD_EXPIRED");
  }

  const paymentId = createId("pay");
  const providerIntent = await createProviderPaymentIntent({
    paymentId,
    bookingId: input.bookingId,
    amountTHB: breakdown.totalTHB,
    currency: "THB",
    customerId: customer.id,
    method: normalizePaymentMethod(input.method),
    cardToken: input.cardToken,
  });

  const rows = await query<PaymentIntentResult>(
    `
      INSERT INTO payments (
        id,
        booking_id,
        provider,
        provider_reference,
        payment_method,
        amount_thb,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'requires_confirmation')
      RETURNING
        id,
        booking_id AS "bookingId",
        provider,
        provider_reference AS "providerReference",
        payment_method AS "paymentMethod",
        amount_thb AS "amountTHB",
        status
    `,
    [
      paymentId,
      input.bookingId,
      providerIntent.provider,
      providerIntent.providerReference,
      providerIntent.method,
      breakdown.totalTHB,
    ],
  );

  return {
    ...rows[0],
    checkoutUrl: providerIntent.checkoutUrl,
  };
}

export async function confirmSandboxPayment(
  customer: CurrentUser,
  paymentId: string,
): Promise<PaymentIntentResult> {
  assertSandboxPaymentAllowed();

  if (!process.env.DATABASE_URL) {
    return {
      id: paymentId,
      bookingId: "book_240618",
      provider: "sandbox",
      providerReference: "sandbox_ref_dev_001",
      paymentMethod: "promptpay",
      amountTHB: 1405,
      status: "succeeded",
    };
  }

  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const paymentResult = await client.query<{
      id: string;
      bookingId: string;
      provider: string;
      providerReference: string;
      paymentMethod: "promptpay" | "card";
      amountTHB: number;
      status: "requires_confirmation" | "succeeded" | "failed";
      customerId: string;
    }>(
      `
        SELECT
          p.id,
          p.booking_id AS "bookingId",
          p.provider,
          p.provider_reference AS "providerReference",
          p.payment_method AS "paymentMethod",
          p.amount_thb AS "amountTHB",
          p.status,
          b.customer_id AS "customerId"
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        WHERE p.id = $1
        FOR UPDATE
      `,
      [paymentId],
    );

    const payment = paymentResult.rows[0];
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.customerId !== customer.id) throw new Error("PAYMENT_BOOKING_DENIED");
    if (payment.provider !== "sandbox") throw new Error("PAYMENT_SANDBOX_PROVIDER_MISMATCH");

    const updatedPayment = await client.query<PaymentIntentResult>(
      `
        UPDATE payments
        SET status = 'succeeded', updated_at = now()
        WHERE id = $1
        RETURNING
          id,
          booking_id AS "bookingId",
          provider,
          provider_reference AS "providerReference",
          payment_method AS "paymentMethod",
          amount_thb AS "amountTHB",
          status
      `,
      [paymentId],
    );

    await client.query(
      `
        UPDATE bookings
        SET
          status = 'payment_confirmed',
          provider_id = COALESCE(provider_id, (
            SELECT provider_id
            FROM booking_slot_holds
            WHERE booking_id = $1
              AND released_at IS NULL
              AND expires_at > now()
            LIMIT 1
          )),
          updated_at = now()
        WHERE id = $1
      `,
      [payment.bookingId],
    );

    await client.query(
      `
        INSERT INTO booking_status_events (id, booking_id, status, actor_user_id)
        VALUES ($1, $2, 'payment_confirmed', $3)
      `,
      [createId("bse"), payment.bookingId, customer.id],
    );

    await createProviderOfferAfterPayment(client, payment.bookingId, customer.id);

    const holdResult = await client.query<{ id: string }>(
      `
        UPDATE booking_slot_holds
        SET released_at = now()
        WHERE booking_id = $1
          AND released_at IS NULL
          AND expires_at > now()
        RETURNING id
      `,
      [payment.bookingId],
    );

    if (!holdResult.rows[0]) {
      throw new Error("PAYMENT_SLOT_HOLD_EXPIRED");
    }

    await client.query(
      `
        INSERT INTO notifications (
          id,
          user_id,
          booking_id,
          title,
          body
        )
        VALUES ($1, $2, $3, 'Payment confirmed', 'Your Wellnest booking payment was confirmed.')
      `,
      [createId("noti"), customer.id, payment.bookingId],
    );

    await client.query("COMMIT");
    return updatedPayment.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function processPaymentWebhook(input: PaymentWebhookInput): Promise<PaymentWebhookResult> {
  const verified = verifyPaymentWebhook(input);

  if (!process.env.DATABASE_URL) {
    return {
      received: true,
      idempotent: false,
      processed: false,
      paymentId: verified.paymentId,
      status: verified.status,
    };
  }

  const db = getDbPool();
  if (!db) throw new Error("DATABASE_URL is not configured");

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const eventResult = await client.query<{ id: string }>(
      `
        INSERT INTO payment_webhook_events (
          id,
          provider,
          provider_event_id,
          event_type,
          payment_id,
          payment_status,
          amount_thb,
          payload_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (provider_event_id) DO NOTHING
        RETURNING id
      `,
      [
        createId("pwe"),
        verified.provider,
        verified.providerEventId,
        verified.rawEventType,
        verified.paymentId,
        verified.status,
        verified.amountTHB ?? null,
        verified.payload,
      ],
    );

    if (!eventResult.rows[0]) {
      await client.query("COMMIT");
      return {
        received: true,
        idempotent: true,
        processed: false,
        paymentId: verified.paymentId,
        status: verified.status,
      };
    }

    const paymentResult = await client.query<{
      id: string;
      bookingId: string;
      provider: string;
      providerReference: string;
      paymentMethod: "promptpay" | "card";
      amountTHB: number;
      status: "requires_confirmation" | "succeeded" | "failed";
      customerId: string;
    }>(
      `
        SELECT
          p.id,
          p.booking_id AS "bookingId",
          p.provider,
          p.provider_reference AS "providerReference",
          p.payment_method AS "paymentMethod",
          p.amount_thb AS "amountTHB",
          p.status,
          b.customer_id AS "customerId"
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        WHERE p.id = $1
        FOR UPDATE
      `,
      [verified.paymentId],
    );

    const payment = paymentResult.rows[0];
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.provider !== verified.provider) throw new Error("PAYMENT_WEBHOOK_PROVIDER_MISMATCH");
    if (verified.amountTHB !== undefined && verified.amountTHB !== Number(payment.amountTHB)) {
      throw new Error("PAYMENT_WEBHOOK_AMOUNT_MISMATCH");
    }

    if (verified.status === "pending") {
      await markWebhookEventProcessed(client, eventResult.rows[0].id);
      await client.query("COMMIT");

      return {
        received: true,
        idempotent: false,
        processed: false,
        paymentId: verified.paymentId,
        status: verified.status,
      };
    }

    if (verified.status === "failed") {
      await client.query(
        `
          UPDATE payments
          SET status = 'failed', updated_at = now()
          WHERE id = $1
            AND status <> 'succeeded'
        `,
        [verified.paymentId],
      );
      await markWebhookEventProcessed(client, eventResult.rows[0].id);
      await client.query("COMMIT");

      return {
        received: true,
        idempotent: payment.status === "failed",
        processed: payment.status !== "succeeded",
        paymentId: verified.paymentId,
        status: verified.status,
      };
    }

    if (payment.status === "succeeded") {
      await markWebhookEventProcessed(client, eventResult.rows[0].id);
      await client.query("COMMIT");

      return {
        received: true,
        idempotent: true,
        processed: false,
        paymentId: verified.paymentId,
        status: verified.status,
      };
    }

    const updatedPayment = await client.query<PaymentIntentResult>(
      `
        UPDATE payments
        SET status = 'succeeded', updated_at = now()
        WHERE id = $1
        RETURNING
          id,
          booking_id AS "bookingId",
          provider,
          provider_reference AS "providerReference",
          payment_method AS "paymentMethod",
          amount_thb AS "amountTHB",
          status
      `,
      [verified.paymentId],
    );

    await client.query(
      `
        UPDATE bookings
        SET
          status = 'payment_confirmed',
          provider_id = COALESCE(provider_id, (
            SELECT provider_id
            FROM booking_slot_holds
            WHERE booking_id = $1
              AND released_at IS NULL
              AND expires_at > now()
            LIMIT 1
          )),
          updated_at = now()
        WHERE id = $1
      `,
      [payment.bookingId],
    );

    await client.query(
      `
        INSERT INTO booking_status_events (id, booking_id, status, actor_user_id)
        VALUES ($1, $2, 'payment_confirmed', $3)
      `,
      [createId("bse"), payment.bookingId, payment.customerId],
    );

    await createProviderOfferAfterPayment(client, payment.bookingId, payment.customerId);

    const holdResult = await client.query<{ id: string }>(
      `
        UPDATE booking_slot_holds
        SET released_at = now()
        WHERE booking_id = $1
          AND released_at IS NULL
          AND expires_at > now()
        RETURNING id
      `,
      [payment.bookingId],
    );

    if (!holdResult.rows[0]) {
      throw new Error("PAYMENT_SLOT_HOLD_EXPIRED");
    }

    await client.query(
      `
        INSERT INTO notifications (
          id,
          user_id,
          booking_id,
          title,
          body
        )
        VALUES ($1, $2, $3, 'Payment confirmed', 'Your Wellnest booking payment was confirmed.')
      `,
      [createId("noti"), payment.customerId, payment.bookingId],
    );

    await markWebhookEventProcessed(client, eventResult.rows[0].id);
    await client.query("COMMIT");

    return {
      received: true,
      idempotent: false,
      processed: true,
      paymentId: updatedPayment.rows[0].id,
      status: "succeeded",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listPaymentsForAdmin() {
  if (!process.env.DATABASE_URL) {
    return [
      {
        id: "pay_dev_001",
        bookingCode: "#WN-240618",
        customer: "พี่ปลั๊ก ปภาวิน",
        amountTHB: 1405,
        status: "succeeded",
        provider: "sandbox",
        paymentMethod: "promptpay",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return query<{
    id: string;
    bookingCode: string;
    customer: string;
    amountTHB: number;
    status: string;
    provider: string;
    paymentMethod: string;
    createdAt: string;
  }>(
    `
      SELECT
        p.id,
        b.code AS "bookingCode",
        customer.name AS customer,
        p.amount_thb AS "amountTHB",
        p.status,
        p.provider,
        p.payment_method AS "paymentMethod",
        p.created_at AS "createdAt"
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      JOIN users customer ON customer.id = b.customer_id
      ORDER BY p.created_at DESC
      LIMIT 20
    `,
  );
}

export function mapPaymentError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "BOOKING_NOT_FOUND") {
    return { statusCode: 404, code: "BOOKING_NOT_FOUND", message: "Booking not found" };
  }

  if (message === "PAYMENT_NOT_FOUND") {
    return { statusCode: 404, code: "PAYMENT_NOT_FOUND", message: "Payment not found" };
  }

  if (message === "PAYMENT_BOOKING_DENIED") {
    return { statusCode: 403, code: "PAYMENT_BOOKING_DENIED", message: "Payment belongs to another customer" };
  }

  if (message === "PAYMENT_BOOKING_STATUS_INVALID") {
    return { statusCode: 409, code: "PAYMENT_BOOKING_STATUS_INVALID", message: "Booking is not ready for payment" };
  }

  if (message === "PAYMENT_SLOT_HOLD_EXPIRED") {
    return { statusCode: 409, code: "PAYMENT_SLOT_HOLD_EXPIRED", message: "Booking slot hold expired. Please re-check availability" };
  }

  if (message === "PAYMENT_PROVIDER_REQUIRED") {
    return { statusCode: 500, code: "PAYMENT_PROVIDER_REQUIRED", message: "Payment provider is required" };
  }

  if (message === "PAYMENT_PROVIDER_UNSUPPORTED") {
    return { statusCode: 500, code: "PAYMENT_PROVIDER_UNSUPPORTED", message: "Payment provider is unsupported" };
  }

  if (message === "PAYMENT_PROVIDER_CREATE_FAILED") {
    return { statusCode: 502, code: "PAYMENT_PROVIDER_CREATE_FAILED", message: "Payment provider create intent failed" };
  }

  if (message === "PAYMENT_CARD_TOKEN_REQUIRED") {
    return { statusCode: 400, code: "PAYMENT_CARD_TOKEN_REQUIRED", message: "Card token is required for card payment" };
  }

  if (message === "PAYMENT_SANDBOX_DISABLED") {
    return { statusCode: 403, code: "PAYMENT_SANDBOX_DISABLED", message: "Sandbox payment is disabled in this environment" };
  }

  if (message === "PAYMENT_SANDBOX_PROVIDER_MISMATCH") {
    return { statusCode: 409, code: "PAYMENT_SANDBOX_PROVIDER_MISMATCH", message: "Payment is not a sandbox payment" };
  }

  if (message === "PAYMENT_WEBHOOK_UNSUPPORTED") {
    return { statusCode: 409, code: "PAYMENT_WEBHOOK_UNSUPPORTED", message: "Payment webhook is not enabled for this provider" };
  }

  if (message === "PAYMENT_WEBHOOK_SECRET_REQUIRED") {
    return { statusCode: 500, code: "PAYMENT_WEBHOOK_SECRET_REQUIRED", message: "Payment webhook secret is required" };
  }

  if (message === "PAYMENT_WEBHOOK_RAW_BODY_REQUIRED") {
    return { statusCode: 500, code: "PAYMENT_WEBHOOK_RAW_BODY_REQUIRED", message: "Payment webhook raw body is required" };
  }

  if (message === "PAYMENT_WEBHOOK_SIGNATURE_REQUIRED") {
    return { statusCode: 401, code: "PAYMENT_WEBHOOK_SIGNATURE_REQUIRED", message: "Payment webhook signature is required" };
  }

  if (message === "PAYMENT_WEBHOOK_SIGNATURE_INVALID") {
    return { statusCode: 401, code: "PAYMENT_WEBHOOK_SIGNATURE_INVALID", message: "Payment webhook signature is invalid" };
  }

  if (message === "PAYMENT_WEBHOOK_INVALID") {
    return { statusCode: 400, code: "PAYMENT_WEBHOOK_INVALID", message: "Payment webhook payload is invalid" };
  }

  if (message === "PAYMENT_WEBHOOK_PROVIDER_MISMATCH") {
    return { statusCode: 409, code: "PAYMENT_WEBHOOK_PROVIDER_MISMATCH", message: "Payment webhook provider does not match payment intent" };
  }

  if (message === "PAYMENT_WEBHOOK_AMOUNT_MISMATCH") {
    return { statusCode: 409, code: "PAYMENT_WEBHOOK_AMOUNT_MISMATCH", message: "Payment webhook amount does not match payment intent" };
  }

  return { statusCode: 500, code: "PAYMENT_OPERATION_FAILED", message: "Payment operation failed" };
}

function normalizePaymentMethod(method: PaymentIntentInput["method"]): "promptpay" | "card" {
  if (method === "card") return "card";
  return "promptpay";
}

async function markWebhookEventProcessed(client: { query: (sql: string, params?: unknown[]) => Promise<unknown> }, eventId: string) {
  await client.query(
    `
      UPDATE payment_webhook_events
      SET processed_at = now()
      WHERE id = $1
    `,
    [eventId],
  );
}

function calculatePriceBreakdown(input: {
  bookingId: string;
  subtotalTHB: number;
  customerCoins: number;
  durationMinutes: number;
}): PriceBreakdownResult {
  const subtotalTHB = Number(input.subtotalTHB);
  const platformFeeTHB = input.durationMinutes > 0 ? 49 : 0;
  const maxCoinsDiscountTHB = Math.floor(subtotalTHB * 0.1);
  const coinsDiscountTHB = Math.min(Number(input.customerCoins), maxCoinsDiscountTHB);
  const pointsEarned = Math.floor((subtotalTHB - coinsDiscountTHB) / 20);
  const totalTHB = Math.max(subtotalTHB - coinsDiscountTHB + platformFeeTHB, 0);

  return {
    bookingId: input.bookingId,
    subtotalTHB,
    coinsUsed: coinsDiscountTHB,
    coinsDiscountTHB,
    pointsEarned,
    platformFeeTHB,
    totalTHB,
    currency: "THB",
  };
}
