import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../core/auth/current-user";
import { requireAdmin, requireCustomer, requireProvider } from "../../core/auth/guards";
import { badRequest, forbidden, notFound } from "../../core/http/errors";
import {
  acceptProviderJob,
  checkProviderAvailability,
  createBookingCommunicationEvent,
  createBookingDraft,
  createBookingSupportRequest,
  findBookingById,
  getBookingSlotHoldStatus,
  listBookingCommunicationEvents,
  listBookingSupportCaseStatuses,
  listBookingTimeline,
  listProviderJobs,
  mapBookingError,
  processExpiredProviderOffers,
  rejectProviderJob,
  updateProviderJobStatus,
} from "./repository";

const allowedProviderStatuses = new Set([
  "provider_preparing",
  "provider_on_the_way",
  "arrived_at_lobby",
  "service_started",
  "completed",
]);

export function registerBookingRoutes(app: FastifyInstance) {
  app.get("/bookings/availability", { preHandler: requireCustomer }, async (request, reply) => {
    const query = request.query as Partial<{
      serviceId: string;
      addressId: string;
      scheduledAt: string;
    }>;

    if (!query.serviceId || !query.addressId || !query.scheduledAt) {
      return badRequest(reply, request, "AVAILABILITY_INPUT_REQUIRED", "serviceId, addressId, and scheduledAt are required");
    }

    const scheduledAt = new Date(query.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return badRequest(reply, request, "AVAILABILITY_INVALID_SCHEDULE", "scheduledAt must be a valid date-time");
    }

    try {
      return await checkProviderAvailability(
        {
          serviceId: query.serviceId,
          addressId: query.addressId,
          scheduledAt: scheduledAt.toISOString(),
        },
        getCurrentUser(request),
      );
    } catch (error) {
      const mapped = mapBookingError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/bookings", { preHandler: requireCustomer }, async (request, reply) => {
    const body = request.body as Partial<{
      serviceId: string;
      addressId: string;
      scheduledAt: string;
    }>;

    if (!body.serviceId || !body.addressId || !body.scheduledAt) {
      return badRequest(reply, request, "BOOKING_INPUT_REQUIRED", "serviceId, addressId, and scheduledAt are required");
    }

    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return badRequest(reply, request, "BOOKING_INVALID_SCHEDULE", "scheduledAt must be a valid date-time");
    }

    try {
      return await createBookingDraft(
        {
          serviceId: body.serviceId,
          addressId: body.addressId,
          scheduledAt: scheduledAt.toISOString(),
        },
        getCurrentUser(request),
      );
    } catch (error) {
      const mapped = mapBookingError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.get("/bookings/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const booking = await findBookingById(id);
    if (!booking) {
      return notFound(reply, request, "BOOKING_NOT_FOUND", "Booking not found");
    }

    const user = getCurrentUser(request);
    const canRead =
      user.role === "customer" && booking.customerId === user.id
        ? true
        : user.role === "provider" && booking.providerId === user.id
          ? true
          : ["support_agent", "safety_manager", "finance_admin", "super_admin"].includes(user.role);

    if (!canRead) {
      return forbidden(reply, request, "BOOKING_ACCESS_DENIED");
    }

    return booking;
  });

  app.get("/bookings/:id/timeline", async (request, reply) => {
    const { id } = request.params as { id: string };
    const booking = await findBookingById(id);
    if (!booking) {
      return notFound(reply, request, "BOOKING_NOT_FOUND", "Booking not found");
    }

    const user = getCurrentUser(request);
    const canRead =
      user.role === "customer" && booking.customerId === user.id
        ? true
        : user.role === "provider" && booking.providerId === user.id
          ? true
          : ["support_agent", "safety_manager", "finance_admin", "super_admin"].includes(user.role);

    if (!canRead) {
      return forbidden(reply, request, "BOOKING_TIMELINE_ACCESS_DENIED");
    }

    return listBookingTimeline(id);
  });

  app.get("/bookings/:id/communications", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return await listBookingCommunicationEvents(id, getCurrentUser(request));
    } catch (error) {
      const mapped = mapBookingError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/bookings/:id/communications", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{
      body: string;
      messageType: "customer_message" | "provider_message" | "admin_note" | "support_note" | "incident_note";
      visibility: "all_parties" | "customer_provider" | "admin_internal";
    }> | undefined;

    if (!body?.body) {
      return badRequest(reply, request, "COMMUNICATION_BODY_REQUIRED", "Communication body is required");
    }

    try {
      return await createBookingCommunicationEvent(id, getCurrentUser(request), {
        body: body.body,
        messageType: body.messageType,
        visibility: body.visibility,
      });
    } catch (error) {
      const mapped = mapBookingError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/bookings/:id/support-requests", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{
      body: string;
      reasonCode: "support_request" | "unsafe_message" | "arrival_issue" | "payment_issue";
    }> | undefined;

    if (!body?.body) {
      return badRequest(reply, request, "SUPPORT_REQUEST_BODY_REQUIRED", "Support request body is required");
    }

    try {
      return await createBookingSupportRequest(id, getCurrentUser(request), {
        body: body.body,
        reasonCode: body.reasonCode,
      });
    } catch (error) {
      const mapped = mapBookingError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.get("/bookings/:id/support-cases", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return await listBookingSupportCaseStatuses(id, getCurrentUser(request));
    } catch (error) {
      const mapped = mapBookingError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.get("/bookings/:id/slot-hold", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return await getBookingSlotHoldStatus(id, getCurrentUser(request));
    } catch (error) {
      const mapped = mapBookingError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/provider/jobs/:id/accept", { preHandler: requireProvider }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await acceptProviderJob(id, getCurrentUser(request));
    } catch (error) {
      const mapped = mapBookingError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/provider/jobs/:id/reject", { preHandler: requireProvider }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await rejectProviderJob(id, getCurrentUser(request));
    } catch (error) {
      const mapped = mapBookingError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.get("/provider/jobs", { preHandler: requireProvider }, async (request) => listProviderJobs(getCurrentUser(request)));

  app.post("/admin/provider-offers/process-expired", { preHandler: requireAdmin }, async (request, reply) => {
    try {
      return await processExpiredProviderOffers();
    } catch (error) {
      const mapped = mapBookingError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/provider/jobs/:id/status", { preHandler: requireProvider }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{ status: string }>;
    const status = body.status || "provider_on_the_way";

    if (!allowedProviderStatuses.has(status)) {
      return badRequest(reply, request, "BOOKING_STATUS_INVALID", "Provider status is not allowed");
    }

    try {
      return await updateProviderJobStatus(id, getCurrentUser(request), status as never);
    } catch (error) {
      const mapped = mapBookingError(error);
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
