import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../core/auth/current-user";
import { requireCustomer, requireProvider } from "../../core/auth/guards";
import {
  getCustomerProfile,
  getProviderProfile,
  updateCustomerAddress,
  updateCustomerProfile,
  updateProviderProfile,
  type CustomerAddressUpdateInput,
  type CustomerProfileUpdateInput,
  type ProviderProfileUpdateInput,
} from "./repository";

export function registerProfileRoutes(app: FastifyInstance) {
  app.get("/profile/customer", { preHandler: requireCustomer }, async (request) => {
    return getCustomerProfile(getCurrentUser(request));
  });

  app.patch("/profile/customer", { preHandler: requireCustomer }, async (request) => {
    return updateCustomerProfile(getCurrentUser(request), request.body as CustomerProfileUpdateInput);
  });

  app.patch("/profile/customer/address", { preHandler: requireCustomer }, async (request) => {
    return updateCustomerAddress(getCurrentUser(request), request.body as CustomerAddressUpdateInput);
  });

  app.get("/profile/provider", { preHandler: requireProvider }, async (request) => {
    return getProviderProfile(getCurrentUser(request));
  });

  app.patch("/profile/provider", { preHandler: requireProvider }, async (request) => {
    return updateProviderProfile(getCurrentUser(request), request.body as ProviderProfileUpdateInput);
  });
}
