import crypto from "node:crypto";
import { isDemoAuthAllowed } from "../../core/auth/current-user";
import { createId } from "../bookings/repository";

export interface CreateProviderPaymentInput {
  paymentId: string;
  bookingId: string;
  amountTHB: number;
  currency: "THB";
  customerId: string;
  method: "promptpay" | "card";
  cardToken?: string;
}

export interface ProviderPaymentIntent {
  provider: string;
  providerReference: string;
  checkoutUrl?: string;
  method: "promptpay" | "card";
}

export interface VerifyPaymentWebhookInput {
  headers: Record<string, string | undefined>;
  body: unknown;
  rawBody?: string;
}

export interface VerifiedPaymentWebhook {
  provider: "webhook" | "omise";
  providerEventId: string;
  paymentId: string;
  status: "succeeded" | "failed" | "pending";
  amountTHB?: number;
  rawEventType: string;
  payload: unknown;
}

export async function createProviderPaymentIntent(input: CreateProviderPaymentInput): Promise<ProviderPaymentIntent> {
  const provider = process.env.PAYMENT_PROVIDER;

  if (!provider || provider === "sandbox") {
    if (!isDemoAuthAllowed()) throw new Error("PAYMENT_PROVIDER_REQUIRED");

    return {
      provider: "sandbox",
      providerReference: createId("sandboxref"),
      method: input.method,
    };
  }

  if (provider === "webhook") {
    return createWebhookPaymentIntent(input);
  }

  if (provider === "omise") {
    return createOmisePaymentIntent(input);
  }

  throw new Error("PAYMENT_PROVIDER_UNSUPPORTED");
}

export function assertSandboxPaymentAllowed() {
  if (!isDemoAuthAllowed()) throw new Error("PAYMENT_SANDBOX_DISABLED");
}

export function verifyPaymentWebhook(input: VerifyPaymentWebhookInput): VerifiedPaymentWebhook {
  const provider = process.env.PAYMENT_PROVIDER;

  if (provider === "omise") return verifyOmisePaymentWebhook(input);

  if (provider !== "webhook") throw new Error("PAYMENT_WEBHOOK_UNSUPPORTED");

  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) throw new Error("PAYMENT_WEBHOOK_SECRET_REQUIRED");

  const signature = input.headers["x-wellnest-signature"] ?? input.headers["x-payment-signature"];
  if (!signature) throw new Error("PAYMENT_WEBHOOK_SIGNATURE_REQUIRED");

  const payloadToSign = stableStringify(input.body);
  const expectedSignature = crypto.createHmac("sha256", secret).update(payloadToSign).digest("hex");

  if (!timingSafeEqual(signature, expectedSignature)) {
    throw new Error("PAYMENT_WEBHOOK_SIGNATURE_INVALID");
  }

  const body = input.body as
    | {
        id?: unknown;
        type?: unknown;
        paymentId?: unknown;
        payment_id?: unknown;
        status?: unknown;
        amount?: unknown;
        amountTHB?: unknown;
      }
    | undefined;

  const providerEventId = typeof body?.id === "string" ? body.id : undefined;
  const rawEventType = typeof body?.type === "string" ? body.type : undefined;
  const paymentId =
    typeof body?.paymentId === "string"
      ? body.paymentId
      : typeof body?.payment_id === "string"
        ? body.payment_id
        : undefined;
  const status = normalizePaymentStatus(body?.status ?? rawEventType);
  const amountTHB = normalizeAmountTHB(body?.amountTHB ?? body?.amount);

  if (!providerEventId || !rawEventType || !paymentId || !status) {
    throw new Error("PAYMENT_WEBHOOK_INVALID");
  }

  return {
    provider: "webhook",
    providerEventId,
    paymentId,
    status,
    amountTHB,
    rawEventType,
    payload: input.body,
  };
}

async function createWebhookPaymentIntent(input: CreateProviderPaymentInput): Promise<ProviderPaymentIntent> {
  const url = process.env.PAYMENT_WEBHOOK_URL;
  const secret = process.env.PAYMENT_SECRET_KEY;

  if (!url || !secret) throw new Error("PAYMENT_PROVIDER_REQUIRED");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      paymentId: input.paymentId,
      bookingId: input.bookingId,
      amount: input.amountTHB,
      currency: input.currency,
      customerId: input.customerId,
    }),
  });

  if (!response.ok) throw new Error("PAYMENT_PROVIDER_CREATE_FAILED");

  const body = (await response.json().catch(() => undefined)) as
    | {
        id?: string;
        paymentId?: string;
        checkoutUrl?: string;
      }
    | undefined;

  return {
    provider: "webhook",
    providerReference: body?.id ?? body?.paymentId ?? createId("webhookpay"),
    checkoutUrl: body?.checkoutUrl,
    method: input.method,
  };
}

async function createOmisePaymentIntent(input: CreateProviderPaymentInput): Promise<ProviderPaymentIntent> {
  const secretKey = process.env.OMISE_SECRET_KEY ?? process.env.PAYMENT_SECRET_KEY;
  const apiBaseUrl = process.env.OMISE_API_BASE_URL ?? "https://api.omise.co";
  const paymentMethod = input.method || process.env.OMISE_PAYMENT_METHOD || "promptpay";

  if (!secretKey) throw new Error("PAYMENT_PROVIDER_REQUIRED");
  if (paymentMethod !== "promptpay" && paymentMethod !== "card") throw new Error("PAYMENT_PROVIDER_UNSUPPORTED");
  if (paymentMethod === "card" && !input.cardToken) throw new Error("PAYMENT_CARD_TOKEN_REQUIRED");

  const params = new URLSearchParams();
  params.set("amount", String(input.amountTHB * 100));
  params.set("currency", "thb");
  if (paymentMethod === "promptpay") {
    params.set("source[type]", "promptpay");
  } else if (input.cardToken) {
    params.set("card", input.cardToken);
  }
  params.set("metadata[payment_id]", input.paymentId);
  params.set("metadata[booking_id]", input.bookingId);
  params.set("metadata[customer_id]", input.customerId);
  params.set("metadata[payment_method]", paymentMethod);
  params.set("description", `Wellnest booking ${input.bookingId}`);

  const response = await fetch(`${apiBaseUrl}/charges`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) throw new Error("PAYMENT_PROVIDER_CREATE_FAILED");

  const body = (await response.json().catch(() => undefined)) as
    | {
        id?: string;
        authorize_uri?: string;
        source?: {
          scannable_code?: {
            image?: {
              download_uri?: string;
            };
          };
        };
      }
    | undefined;

  if (!body?.id) throw new Error("PAYMENT_PROVIDER_CREATE_FAILED");

  return {
    provider: "omise",
    providerReference: body.id,
    checkoutUrl: body.authorize_uri ?? body.source?.scannable_code?.image?.download_uri,
    method: paymentMethod,
  };
}

function verifyOmisePaymentWebhook(input: VerifyPaymentWebhookInput): VerifiedPaymentWebhook {
  const secret = process.env.OMISE_WEBHOOK_SECRET ?? process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) throw new Error("PAYMENT_WEBHOOK_SECRET_REQUIRED");
  if (!input.rawBody) throw new Error("PAYMENT_WEBHOOK_RAW_BODY_REQUIRED");

  const signatureHeader = input.headers["omise-signature"];
  const timestampHeader = input.headers["omise-signature-timestamp"];
  if (!signatureHeader || !timestampHeader) throw new Error("PAYMENT_WEBHOOK_SIGNATURE_REQUIRED");

  const signedPayload = `${timestampHeader}.${input.rawBody}`;
  const expectedSignature = crypto.createHmac("sha256", Buffer.from(secret, "base64")).update(signedPayload).digest("hex");
  const hasValidSignature = signatureHeader.split(",").some((signature) => timingSafeEqualHex(signature.trim(), expectedSignature));

  if (!hasValidSignature) throw new Error("PAYMENT_WEBHOOK_SIGNATURE_INVALID");

  const body = input.body as
    | {
        id?: unknown;
        key?: unknown;
        data?: {
          id?: unknown;
          amount?: unknown;
          status?: unknown;
          metadata?: {
            payment_id?: unknown;
            paymentId?: unknown;
          };
        };
      }
    | undefined;

  const providerEventId = typeof body?.id === "string" ? body.id : undefined;
  const rawEventType = typeof body?.key === "string" ? body.key : undefined;
  const paymentId =
    typeof body?.data?.metadata?.payment_id === "string"
      ? body.data.metadata.payment_id
      : typeof body?.data?.metadata?.paymentId === "string"
        ? body.data.metadata.paymentId
        : undefined;
  const status = normalizeOmisePaymentStatus(body?.data?.status ?? rawEventType);
  const amountTHB = normalizeOmiseAmountTHB(body?.data?.amount);

  if (!providerEventId || !rawEventType || !paymentId || !status) {
    throw new Error("PAYMENT_WEBHOOK_INVALID");
  }

  return {
    provider: "omise",
    providerEventId,
    paymentId,
    status,
    amountTHB,
    rawEventType,
    payload: input.body,
  };
}

function normalizePaymentStatus(value: unknown): "succeeded" | "failed" | undefined {
  if (value === "succeeded" || value === "payment.succeeded" || value === "charge.succeeded") return "succeeded";
  if (value === "failed" || value === "payment.failed" || value === "charge.failed") return "failed";
  return undefined;
}

function normalizeOmisePaymentStatus(value: unknown): "succeeded" | "failed" | "pending" | undefined {
  if (value === "successful" || value === "charge.complete") return "succeeded";
  if (value === "failed" || value === "expired" || value === "reversed") return "failed";
  if (value === "pending" || value === "charge.create" || value === "charge.update") return "pending";
  return undefined;
}

function normalizeAmountTHB(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return undefined;
}

function normalizeOmiseAmountTHB(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value / 100;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value) / 100;
  return undefined;
}

function timingSafeEqual(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function timingSafeEqualHex(received: string, expected: string) {
  if (!/^[a-f0-9]+$/i.test(received) || received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortJson((value as Record<string, unknown>)[key]);
      return result;
    }, {});
}
