import { prisma } from "../core/prisma.js";
import { mapDbError } from "../core/errors.js";

export async function createTerm({ termType, sessionLabel, nameEn, nameBn = null }, actor) {
  try {
    return await prisma.academicTerm.create({
      data: { termType, sessionLabel, nameEn, nameBn },
    });
  } catch (err) {
    throw mapDbError(err);
  }
}
