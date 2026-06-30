import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@wellnest/types";
import { getCurrentUser } from "./current-user";

export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    let user;
    try {
      user = getCurrentUser(request);
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

    if (!allowedRoles.includes(user.role)) {
      return reply.code(403).send({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action",
          requestId: request.id,
        },
      });
    }
  };
}

export const requireAdmin = requireRole(["support_agent", "safety_manager", "finance_admin", "super_admin"]);
export const requireProvider = requireRole(["provider"]);
export const requireCustomer = requireRole(["customer"]);
