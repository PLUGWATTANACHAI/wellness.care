import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../core/auth/current-user";
import { badRequest } from "../../core/http/errors";
import {
  getMe,
  loginDemoUser,
  mapAuthError,
  requestOtpLogin,
  verifyOtpLogin,
  type LoginInput,
  type OtpRequestInput,
  type OtpVerifyInput,
} from "./repository";

export function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const body = request.body as Partial<LoginInput> | undefined;

    if (!body?.role || !["customer", "provider", "admin"].includes(body.role)) {
      return badRequest(reply, request, "LOGIN_ROLE_REQUIRED", "role must be customer, provider, or admin");
    }

    try {
      return await loginDemoUser({ role: body.role });
    } catch (error) {
      const mapped = mapAuthError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/auth/otp/request", async (request, reply) => {
    const body = request.body as Partial<OtpRequestInput> | undefined;

    if (!body?.phone || !body.role || !["customer", "provider"].includes(body.role)) {
      return badRequest(reply, request, "OTP_REQUEST_INPUT_REQUIRED", "phone and role are required");
    }

    try {
      return await requestOtpLogin({
        phone: body.phone,
        role: body.role,
      });
    } catch (error) {
      const mapped = mapAuthError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.post("/auth/otp/verify", async (request, reply) => {
    const body = request.body as Partial<OtpVerifyInput> | undefined;

    if (!body?.challengeId || !body.phone || !body.otp) {
      return badRequest(reply, request, "OTP_VERIFY_INPUT_REQUIRED", "challengeId, phone, and otp are required");
    }

    try {
      return await verifyOtpLogin({
        challengeId: body.challengeId,
        phone: body.phone,
        otp: body.otp,
      });
    } catch (error) {
      const mapped = mapAuthError(error);
      return reply.code(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          requestId: request.id,
        },
      });
    }
  });

  app.get("/me", async (request, reply) => {
    try {
      return await getMe(getCurrentUser(request));
    } catch (error) {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        return reply.code(401).send({
          error: {
            code: "AUTH_REQUIRED",
            message: "Authentication is required",
            requestId: request.id,
          },
        });
      }

      throw error;
    }
  });
}
