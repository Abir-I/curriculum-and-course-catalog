
import { prisma } from "../core/prisma.js";
import { coded, mapDbError } from "../core/errors.js";

const TERM_PATTERNS = ["SEMESTER", "TRIMESTER", "ANNUAL"];

export async function createUnit(input, actor) {
  if (input.selfId && input.parentId === input.selfId) {
    throw coded("UNIT_LOOP", 422);
  }

  if (input.unitType === "STREAM" && !input.parentId) {
    throw coded("PARENT_REQUIRED", 422);
  }

  if (input.unitType === "PROGRAM" && !input.termPattern) {
    throw coded("TERM_PATTERN_REQUIRED", 422);
  }

  if (input.unitType !== "PROGRAM" && input.termPattern) {
    throw coded("TERM_PATTERN_NOT_ALLOWED", 422);
  }

  if (
    input.termPattern &&
    !TERM_PATTERNS.includes(input.termPattern)
  ) {
    throw coded("TERM_PATTERN_INVALID", 422);
  }

  try {
    return await prisma.academicUnit.create({
      data: {
        unitType: input.unitType,
        code: input.code,
        nameEn: input.nameEn,
        nameBn: input.nameBn ?? null,
        parentId: input.parentId ?? null,
        termPattern: input.termPattern ?? null,
      },
    });
  } catch (err) {
    throw mapDbError(err);
  }
}
