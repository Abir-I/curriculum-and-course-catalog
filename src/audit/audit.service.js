import { prisma } from "../core/prisma.js";
import { actorUuid } from "../core/auth.js";

// Writes one audit row. Sprint 3 adds redaction of secret fields and queryAudit().
export async function record({ actor, action, entityType, entityId, details = {} }) {
  return prisma.auditLog.create({
    data: {
      actorId: actor ? actorUuid(actor) : null,
      action,
      entityType,
      entityId,
      requestId: `req-${Date.now()}-${Math.random()}`,
      details,
    },
  });
}
