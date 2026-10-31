import { prisma } from "../core/prisma.js";
import { coded, mapDbError } from "../core/errors.js";

// A degree plan has a stable four-digit code (for example 1001).
// Its curriculum versions are numbered 1001-v1, 1001-v2 and so on (the database sets that code).
export async function createDegreePlan({ planCode, programId, nameEn, nameBn = null }, actor) {
  if (!/^[0-9]{4}$/.test(String(planCode))) throw coded("PLAN_CODE_INVALID", 422);
  try {
    return await prisma.degreePlan.create({
      data: { planCode: String(planCode), programId, nameEn, nameBn },
    });
  } catch (err) {
    throw mapDbError(err);
  }
}
