import { prisma } from "../core/prisma.js";
import { coded, mapDbError } from "../core/errors.js";

export async function createCourse(input, actor) {
  if ("practicalMarks" in input || "theoryMarks" in input || "totalMarks" in input) {
    throw coded("MARKS_NOT_OWNED_BY_M2", 422);
  }

  if (
    Number(input.theoryCredit) < 0 ||
    Number(input.labCredit) < 0
  ) {
    throw coded("NEGATIVE_CREDIT", 422);
  }

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

    return {
      ...saved,
      totalMarks: 100,
    };
  } catch (err) {
    throw mapDbError(err);
  }
}
