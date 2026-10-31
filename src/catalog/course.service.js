import { prisma } from "../core/prisma.js";
import { coded, mapDbError } from "../core/errors.js";
import { requireRole } from "../core/auth.js";

export async function createCourse(input, actor) {
  if ("practicalMarks" in input || "theoryMarks" in input || "totalMarks" in input) {
    throw coded("MARKS_NOT_OWNED_BY_M2", 422);
  }

  if (typeof input.code !== "string" || !input.code.trim()) {
    throw coded("CODE_REQUIRED", 422);
  }

  if (typeof input.titleEn === "string" && input.titleEn.length > 200) {
    throw coded("TITLE_TOO_LONG", 422);
  }

  const theory = Number(input.theoryCredit ?? 0);
  const lab = Number(input.labCredit ?? 0);
  if (theory < 0 || lab < 0) throw coded("NEGATIVE_CREDIT", 422);
  if (theory + lab <= 0) throw coded("CREDIT_REQUIRED", 422);
  if (theory > 99.99 || lab > 99.99) throw coded("CREDIT_TOO_LARGE", 422);   // column is NUMERIC(4,2)

  try {
    const saved = await prisma.course.create({
      data: {
        code: input.code,
        titleEn: input.titleEn,
        titleBn: input.titleBn ?? null,
        theoryCredit: input.theoryCredit,
        labCredit: input.labCredit ?? 0,
      },
    });

    return saved;   // marks are Module 4's; Module 2 does not return a total
  } catch (err) {
    throw mapDbError(err);
  }
}
export async function updateCourse(courseId, input, actor) {
  requireRole(actor, "REGISTRAR");

  if (
    "practicalMarks" in input ||
    "theoryMarks" in input ||
    "totalMarks" in input
  ) {
    throw coded("MARKS_NOT_OWNED_BY_M2", 422);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.course.findUnique({
        where: { id: courseId },
      });

      if (!existing) {
        throw coded("COURSE_NOT_FOUND", 404);
      }

      const theory = Number(input.theoryCredit ?? existing.theoryCredit);
      const lab = Number(input.labCredit ?? existing.labCredit);

      if (theory < 0 || lab < 0) {
        throw coded("NEGATIVE_CREDIT", 422);
      }

      if (theory + lab <= 0) {
        throw coded("CREDIT_REQUIRED", 422);
      }

      if (theory > 99.99 || lab > 99.99) {
        throw coded("CREDIT_TOO_LARGE", 422);
      }

      const data = {};

      for (const field of ["code", "titleEn", "titleBn", "status"]) {
        if (field in input) {
          data[field] = input[field];
        }
      }

      if ("theoryCredit" in input) {
        data.theoryCredit = theory;
      }

      if ("labCredit" in input) {
        data.labCredit = lab;
      }

      const saved = await tx.course.update({
        where: { id: courseId },
        data,
      });

      const draftItems = await tx.curriculumItem.findMany({
        where: {
          courseId,
          itemType: "COURSE",
          curriculum: {
            is: { status: "DRAFT" },
          },
        },
        select: { id: true },
      });

      if (draftItems.length > 0) {
        await tx.curriculumItem.updateMany({
          where: {
            id: { in: draftItems.map((item) => item.id) },
          },
          data: {
            copiedTheoryCredit: theory,
            copiedLabCredit: lab,
          },
        });
      }

      return saved;
    });
  } catch (err) {
    throw mapDbError(err);
  }
}


// A deactivated course stays in the catalog but cannot be offered (FR-10).
export async function deactivateCourse(id, actor) {
  return prisma.course.update({ where: { id }, data: { status: "INACTIVE" } });
}
