import type { FastifyReply, FastifyRequest } from "fastify";

export function notFound(reply: FastifyReply, request: FastifyRequest, code: string, message: string) {
  return reply.code(404).send({
    error: {
      code,
      message,
      requestId: request.id,
    },
  });
}

export function badRequest(reply: FastifyReply, request: FastifyRequest, code: string, message: string) {
  return reply.code(400).send({
    error: {
      code,
      message,
      requestId: request.id,
    },
  });
}

export function forbidden(reply: FastifyReply, request: FastifyRequest, code = "FORBIDDEN") {
  return reply.code(403).send({
    error: {
      code,
      message: "You do not have permission to access this resource",
      requestId: request.id,
    },
  });
}

