import type { FastifyRequest } from "fastify";
import type { UserRole } from "@wellnest/types";
import { parseAccessToken } from "../../modules/auth/repository";

export interface CurrentUser {
  id: string;
  role: UserRole;
  name: string;
}

const devUsers: Record<string, CurrentUser> = {
  customer: { id: "usr_customer_001", role: "customer", name: "พี่ปลั๊ก ปภาวิน" },
  provider: { id: "usr_provider_001", role: "provider", name: "นิดา สุขสบาย" },
  admin: { id: "usr_admin_001", role: "safety_manager", name: "มินท์ Ops" },
};

export function getCurrentUser(request: FastifyRequest): CurrentUser {
  const authHeader = request.headers.authorization;
  const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const bearerToken = authValue?.startsWith("Bearer ") ? authValue.slice("Bearer ".length) : undefined;
  const tokenUser = bearerToken ? parseAccessToken(bearerToken) : undefined;
  if (tokenUser) return tokenUser;

  if (!isDemoAuthAllowed()) {
    throw new Error("AUTH_REQUIRED");
  }

  const roleHeader = request.headers["x-wellnest-role"];
  const roleKey = Array.isArray(roleHeader) ? roleHeader[0] : roleHeader;

  if (roleKey === "provider") return devUsers.provider;
  if (roleKey === "admin") return devUsers.admin;
  return devUsers.customer;
}

export function isDemoAuthAllowed() {
  if (process.env.WELLNEST_ENABLE_DEMO_AUTH === "true") return true;
  return process.env.APP_ENV !== "production" && process.env.NODE_ENV !== "production";
}
