import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../core/auth/current-user";
import { requireProvider } from "../../core/auth/guards";
import { badRequest } from "../../core/http/errors";
import { checkProviderServiceRadius, searchAddressSuggestions } from "./repository";

export function registerMapRoutes(app: FastifyInstance) {
  app.get("/maps/address-suggestions", async (request, reply) => {
    const { q } = request.query as { q?: string };
    if (!q || q.trim().length < 2) {
      return badRequest(reply, request, "ADDRESS_QUERY_REQUIRED", "Address query must be at least 2 characters");
    }

    return searchAddressSuggestions(q);
  });

  app.get("/provider/jobs/:id/service-radius", { preHandler: requireProvider }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return await checkProviderServiceRadius(getCurrentUser(request), id);
    } catch {
      return badRequest(reply, request, "SERVICE_RADIUS_LOCATION_MISSING", "Provider base or booking address location is missing");
    }
  });
}
