import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../core/auth/current-user";
import { requireAdmin } from "../../core/auth/guards";
import { badRequest } from "../../core/http/errors";
import { listAdminBookings } from "../bookings/repository";
import {
  createProviderLeaveWindow,
  deactivateProviderLeaveWindow,
  listAdminAuditLogs,
  listAdminProviderOperations,
  listAdminProviderOfferHistory,
  listAdminReassignmentCandidates,
  listAdminSupportCases,
  listAdminUsers,
  mapAdminError,
  manuallyReassignProvider,
  recordAdminLocationAccess,
  updateAdminSupportCaseStatus,
  updateProviderSkills,
  updateProviderWorkingHours,
  type AdminManualReassignmentInput,
  type AdminLocationAccessInput,
  type ProviderLeaveWindowInput,
  type ProviderSkillUpdateInput,
  type ProviderWorkingHoursUpdateInput,
  type AdminSupportCaseUpdateInput,
} from "./repository";

const allowedReasonCodes = new Set(["safety", "customer_support", "provider_support", "incident_review"]);

export function registerAdminRoutes(app: FastifyInstance) {
  app.get("/admin/bookings", { preHandler: requireAdmin }, async () => listAdminBookings());

  app.post("/admin/bookings/:id/location-access", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<AdminLocationAccessInput> | undefined;

    if (!body?.reasonCode || !allowedReasonCodes.has(body.reasonCode)) {
      return badRequest(reply, request, "LOCATION_ACCESS_REASON_REQUIRED", "Reason is required for exact location access");
    }

    try {
      return await recordAdminLocationAccess(id, getCurrentUser(request), {
        reasonCode: body.reasonCode,
        reasonNote: body.reasonNote,
      });
    } catch (error) {
      const mapped = mapAdminError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.get("/admin/audit-logs", { preHandler: requireAdmin }, async () => listAdminAuditLogs());

  app.get("/admin/users", { preHandler: requireAdmin }, async () => listAdminUsers());

  app.get("/admin/provider-operations", { preHandler: requireAdmin }, async () => listAdminProviderOperations());

  app.get("/admin/support-cases", { preHandler: requireAdmin }, async () => listAdminSupportCases());

  app.patch("/admin/support-cases/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<AdminSupportCaseUpdateInput> | undefined;

    if (!body?.status) {
      return badRequest(reply, request, "SUPPORT_CASE_STATUS_REQUIRED", "Support case status is required");
    }

    try {
      return await updateAdminSupportCaseStatus(id, getCurrentUser(request), {
        status: body.status,
        resolutionNote: body.resolutionNote,
      });
    } catch (error) {
      const mapped = mapAdminError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.get("/admin/bookings/:id/reassignment-candidates", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return await listAdminReassignmentCandidates(id);
    } catch (error) {
      const mapped = mapAdminError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.get("/admin/bookings/:id/provider-offers", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return await listAdminProviderOfferHistory(id);
    } catch (error) {
      const mapped = mapAdminError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/admin/bookings/:id/reassign-provider", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<AdminManualReassignmentInput> | undefined;

    if (!body?.providerId || !body.reasonNote) {
      return badRequest(reply, request, "REASSIGNMENT_INPUT_REQUIRED", "providerId and reasonNote are required");
    }

    try {
      return await manuallyReassignProvider(id, getCurrentUser(request), {
        providerId: body.providerId,
        reasonNote: body.reasonNote,
      });
    } catch (error) {
      const mapped = mapAdminError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.patch("/admin/providers/:id/service-skills", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<ProviderSkillUpdateInput> | undefined;

    if (!body?.serviceIds || !Array.isArray(body.serviceIds)) {
      return badRequest(reply, request, "PROVIDER_SKILLS_REQUIRED", "serviceIds must be an array");
    }

    try {
      return await updateProviderSkills(id, getCurrentUser(request), { serviceIds: body.serviceIds });
    } catch (error) {
      const mapped = mapAdminError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.patch("/admin/providers/:id/working-hours", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<ProviderWorkingHoursUpdateInput> | undefined;

    if (!body?.startTime || !body.endTime) {
      return badRequest(reply, request, "PROVIDER_WORKING_HOURS_REQUIRED", "startTime and endTime are required");
    }

    try {
      return await updateProviderWorkingHours(id, getCurrentUser(request), {
        startTime: body.startTime,
        endTime: body.endTime,
        dayOfWeeks: body.dayOfWeeks,
      });
    } catch (error) {
      const mapped = mapAdminError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/admin/providers/:id/leave-windows", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<ProviderLeaveWindowInput> | undefined;

    if (!body?.startsAt || !body.endsAt) {
      return badRequest(reply, request, "PROVIDER_LEAVE_WINDOW_REQUIRED", "startsAt and endsAt are required");
    }

    try {
      return await createProviderLeaveWindow(id, getCurrentUser(request), {
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        reason: body.reason,
      });
    } catch (error) {
      const mapped = mapAdminError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.delete("/admin/providers/:id/leave-windows/:leaveWindowId", { preHandler: requireAdmin }, async (request, reply) => {
    const { id, leaveWindowId } = request.params as { id: string; leaveWindowId: string };

    try {
      return await deactivateProviderLeaveWindow(id, leaveWindowId, getCurrentUser(request));
    } catch (error) {
      const mapped = mapAdminError(error);
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
