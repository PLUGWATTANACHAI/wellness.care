import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../core/auth/current-user";
import { listNotifications, markNotificationRead } from "./repository";

export function registerNotificationRoutes(app: FastifyInstance) {
  app.get("/notifications", async (request) => listNotifications(getCurrentUser(request)));

  app.post("/notifications/:id/read", async (request) => {
    const { id } = request.params as { id: string };
    return markNotificationRead(getCurrentUser(request), id);
  });
}
