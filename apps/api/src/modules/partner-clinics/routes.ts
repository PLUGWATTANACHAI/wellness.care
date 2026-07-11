import type { FastifyInstance } from "fastify";
import {
  getPartnerClinic,
  listPartnerClinics,
  listPartnerClinicSlots,
} from "./repository";

export function registerPartnerClinicRoutes(app: FastifyInstance) {
  app.get("/partner-clinics", async () => listPartnerClinics());

  app.get("/partner-clinics/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const clinic = await getPartnerClinic(id);

    if (!clinic) {
      return reply.code(404).send({
        code: "PARTNER_CLINIC_NOT_FOUND",
        message: "Partner clinic not found",
      });
    }

    return clinic;
  });

  app.get("/partner-clinics/:id/slots", async (request) => {
    const { id } = request.params as { id: string };
    return listPartnerClinicSlots(id);
  });
}
