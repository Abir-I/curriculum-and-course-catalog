import { prisma } from "../core/prisma.js";
import { actorUuid } from "../core/auth.js";

const SECRET_KEYS = ["password", "token", "secret"];

// Replaces the value of every secret field with "[REDACTED]".
function redact(details) {
  const out = {};
  for (const [key, value] of Object.entries(details ?? {})) {
    out[key] = SECRET_KEYS.includes(key.toLowerCase()) ? "[REDACTED]" : value;
  }
  return out;
}

// Writes one audit row. Secret fields never reach the database (M2TC-097).
export async function record({ actor, action, entityType, entityId, details = {} }) {
  return prisma.auditLog.create({
    data: {
      actorId: actor ? actorUuid(actor) : null,
      action,
      entityType,
      entityId,
      requestId: `req-${Date.now()}-${Math.random()}`,
      details: redact(details),
    },
  });
}

// Returns the audit rows of one entity, oldest first (M2TC-096).
export async function queryAudit({ entityType, entityId }, actor) {
  const rows = await prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { occurredAt: "asc" },
  });
  return rows.map((row) => ({ ...row, details: redact(row.details) }));
}