import { prisma } from "../core/prisma.js";
import { coded, mapDbError } from "../core/errors.js";
import { requireRole, actorUuid } from "../core/auth.js";

const INSTITUTION_TYPES = ["SCHOOL", "COLLEGE", "UNIVERSITY"];

export async function setInstitutionType(input, actor) {
  requireRole(actor, "INSTITUTION_ADMIN");

  if (!INSTITUTION_TYPES.includes(input?.type)) {
    throw coded("INVALID_INSTITUTION_TYPE", 422);
  }

  if (!input?.effectiveFrom) {
    throw coded("EFFECTIVE_FROM_REQUIRED", 422);
  }

  const date = new Date(`${input.effectiveFrom}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== input.effectiveFrom
  ) {
    throw coded("INVALID_EFFECTIVE_FROM", 422);
  }

  try {
    const saved = await prisma.academicPolicy.create({
      data: {
        policyKey: "INSTITUTION_TYPE",
        value: { type: input.type },
        effectiveFrom: date,
        scopeUnitId: null,
        createdBy: actorUuid(actor),
      },
    });

    return {
      ...saved,
      effectiveFrom: saved.effectiveFrom.toISOString().slice(0, 10),
      effectiveTo: saved.effectiveTo
        ? saved.effectiveTo.toISOString().slice(0, 10)
        : null,
    };
  } catch (err) {
    throw mapDbError(err);
  }
}

// Returns the value of the most specific policy valid on the date:
// a row for this unit beats an institution row (scope NULL). No row gives null.
export async function resolvePolicy(key, unitId, date) {
  const d = new Date(date);
  const rows = await prisma.academicPolicy.findMany({
    where: {
      policyKey: key,
      effectiveFrom: { lte: d },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: d } }],
    },
  });
  const scoped = rows.find((r) => unitId && r.scopeUnitId === unitId);
  const institution = rows.find((r) => r.scopeUnitId === null);
  return (scoped ?? institution)?.value ?? null;
}
