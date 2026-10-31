import { prisma } from "../core/prisma.js";
import { coded, mapDbError } from "../core/errors.js";

export async function listOpen(termId) {
  return prisma.courseOffering.findMany({ where: { termId, status: "OPEN" } });
}

// A deactivated course cannot be offered (FR-10).
export async function createOffering({ courseId, termId, status = "DRAFT" }, actor) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== "ACTIVE") throw coded("COURSE_INACTIVE", 422);
  try {
    return await prisma.courseOffering.create({ data: { courseId, termId, status } });
  } catch (err) {
    throw mapDbError(err);
  }
}
