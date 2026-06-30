import type { FastifyInstance } from "fastify";
import { listServices } from "./repository";

export function registerServiceRoutes(app: FastifyInstance) {
  app.get("/services", async () => listServices());
}

