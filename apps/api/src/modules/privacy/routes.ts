import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../core/auth/current-user";
import { badRequest } from "../../core/http/errors";
import { recordConsent, type ConsentInput } from "./repository";

export function registerPrivacyRoutes(app: FastifyInstance) {
  app.get("/privacy/documents/current", async () => ({
    privacyNoticeVersion: "v1.0",
    providerLocationNoticeVersion: "provider_location_v1.0",
  }));

  app.post("/privacy/consents", async (request, reply) => {
    const body = request.body as Partial<ConsentInput>;

    if (!body.consentType || !body.documentVersion || !body.sourceScreen) {
      return badRequest(
        reply,
        request,
        "CONSENT_INPUT_REQUIRED",
        "consentType, documentVersion, and sourceScreen are required",
      );
    }

    return recordConsent(getCurrentUser(request), {
      consentType: body.consentType,
      documentVersion: body.documentVersion,
      sourceScreen: body.sourceScreen,
    });
  });
}
