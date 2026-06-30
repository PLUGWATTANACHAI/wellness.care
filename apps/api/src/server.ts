import Fastify from "fastify";
import cors from "@fastify/cors";
import { loadDotEnv } from "./core/env";
import { registerAuthRoutes } from "./modules/auth/routes";
import { registerBookingRoutes } from "./modules/bookings/routes";
import { registerServiceRoutes } from "./modules/services/routes";
import { registerLocationRoutes } from "./modules/location/routes";
import { registerPaymentRoutes } from "./modules/payments/routes";
import { registerPrivacyRoutes } from "./modules/privacy/routes";
import { registerAdminRoutes } from "./modules/admin/routes";
import { registerProfileRoutes } from "./modules/profiles/routes";
import { registerNotificationRoutes } from "./modules/notifications/routes";
import { registerMapRoutes } from "./modules/maps/routes";
import { getDatabaseHealth } from "./core/db/client";

loadDotEnv();

const app = Fastify({
  logger: true,
  genReqId: () => `req_${Date.now()}_${Math.random().toString(16).slice(2)}`,
});

app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
  (request as { rawBody?: string }).rawBody = body as string;

  try {
    done(null, body ? JSON.parse(body as string) : {});
  } catch (error) {
    done(error as Error, undefined);
  }
});

await app.register(cors, { origin: true });

app.get("/health", async () => ({
  status: "ok",
  service: "wellnest-api",
  database: await getDatabaseHealth(),
}));

registerAuthRoutes(app);
registerServiceRoutes(app);
registerBookingRoutes(app);
registerLocationRoutes(app);
registerPaymentRoutes(app);
registerPrivacyRoutes(app);
registerAdminRoutes(app);
registerProfileRoutes(app);
registerNotificationRoutes(app);
registerMapRoutes(app);

const port = Number(process.env.PORT || 4000);
await app.listen({ port, host: "0.0.0.0" });
