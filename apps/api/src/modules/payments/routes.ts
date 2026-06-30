import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../core/auth/current-user";
import { requireAdmin, requireCustomer } from "../../core/auth/guards";
import { badRequest } from "../../core/http/errors";
import {
  confirmSandboxPayment,
  createPaymentIntent,
  getPriceBreakdown,
  listPaymentsForAdmin,
  mapPaymentError,
  processPaymentWebhook,
  type PaymentIntentInput,
} from "./repository";

export function registerPaymentRoutes(app: FastifyInstance) {
  app.get("/payments/breakdown", { preHandler: requireCustomer }, async (request, reply) => {
    const query = request.query as Partial<{ bookingId: string }>;

    if (!query.bookingId) {
      return badRequest(reply, request, "PAYMENT_BOOKING_REQUIRED", "bookingId is required");
    }

    try {
      return await getPriceBreakdown(getCurrentUser(request), query.bookingId);
    } catch (error) {
      const mapped = mapPaymentError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/payments/create-intent", { preHandler: requireCustomer }, async (request, reply) => {
    const body = request.body as Partial<PaymentIntentInput> | undefined;

    if (!body?.bookingId) {
      return badRequest(reply, request, "PAYMENT_BOOKING_REQUIRED", "bookingId is required");
    }

    try {
      return await createPaymentIntent(getCurrentUser(request), { bookingId: body.bookingId });
    } catch (error) {
      const mapped = mapPaymentError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/payments/:id/confirm-sandbox", { preHandler: requireCustomer }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return await confirmSandboxPayment(getCurrentUser(request), id);
    } catch (error) {
      const mapped = mapPaymentError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.get("/admin/payments", { preHandler: requireAdmin }, async () => listPaymentsForAdmin());

  app.post("/webhooks/payment", async (request, reply) => {
    try {
      return await processPaymentWebhook({
        headers: normalizeHeaders(request.headers),
        body: request.body,
        rawBody: (request as { rawBody?: string }).rawBody,
      });
    } catch (error) {
      const mapped = mapPaymentError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });
}

function normalizeHeaders(headers: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key.toLowerCase(),
      Array.isArray(value) ? value[0] : value,
    ]),
  );
}
