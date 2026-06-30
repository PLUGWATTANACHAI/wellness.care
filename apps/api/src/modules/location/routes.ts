import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../core/auth/current-user";
import { requireProvider } from "../../core/auth/guards";
import { badRequest, forbidden, notFound } from "../../core/http/errors";
import { findBookingById } from "../bookings/repository";
import { getLatestProviderLocation, recordProviderLocation } from "./repository";

const locationOpenStatuses = new Set([
  "provider_accepted",
  "provider_preparing",
  "provider_on_the_way",
  "arrived_at_lobby",
]);

export function registerLocationRoutes(app: FastifyInstance) {
  app.post("/provider/jobs/:id/location", { preHandler: requireProvider }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = getCurrentUser(request);
    const booking = await findBookingById(id);
    const body = request.body as Partial<{ lat: number; lng: number; accuracyMeters: number }> | undefined;

    if (!booking || booking.providerId !== user.id) {
      return forbidden(reply, request, "PROVIDER_LOCATION_DENIED");
    }

    if (!locationOpenStatuses.has(booking.status)) {
      return forbidden(reply, request, "LOCATION_SESSION_CLOSED");
    }

    if (!isValidCoordinate(body?.lat, -90, 90) || !isValidCoordinate(body?.lng, -180, 180)) {
      return badRequest(reply, request, "LOCATION_COORDINATES_INVALID", "Valid lat and lng are required");
    }

    return recordProviderLocation(id, user.id, {
      lat: body.lat,
      lng: body.lng,
      accuracyMeters: Number.isFinite(body.accuracyMeters) ? body.accuracyMeters : undefined,
    });
  });

  app.get("/bookings/:id/provider-location", async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = getCurrentUser(request);
    const booking = await findBookingById(id);

    if (!booking || booking.customerId !== user.id) {
      return forbidden(reply, request, "CUSTOMER_TRACKING_DENIED");
    }

    if (!booking.providerId || !locationOpenStatuses.has(booking.status)) {
      return forbidden(reply, request, "CUSTOMER_TRACKING_NOT_ACTIVE");
    }

    const latest = await getLatestProviderLocation(id);
    if (!latest) {
      return notFound(reply, request, "PROVIDER_LOCATION_NOT_FOUND", "Provider location not found");
    }

    return latest;
  });
}

function isValidCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
