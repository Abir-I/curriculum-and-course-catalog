import { prisma } from "../core/prisma.js";
import { DEV_ACTOR_UUID } from "../core/auth.js";

const APPROVER_UUID = "00000000-0000-4000-8000-000000000082";

// Test helper: creates a program, a degree plan and one version,
// places the course while DRAFT, then publishes if requested.
export async function placeCourseInVersion({ courseId, status = "DRAFT" }) {
  const count = await prisma.degreePlan.count();

  const unit = await prisma.academicUnit.create({
    data: {
      unitType: "PROGRAM",
      code: `PRG-${Date.now()}-${Math.random()}`,
      nameEn: "Test",
      termPattern: "SEMESTER",
    },
  });

  const plan = await prisma.degreePlan.create({
    data: {
      planCode: String(1000 + count),
      programId: unit.id,
      nameEn: "Test",
    },
  });

  const cur = await prisma.curriculum.create({
    data: {
      programId: unit.id,
      degreePlanId: plan.id,
      versionNo: 1,
      cohortStartYear: 2026,
      cohortEndYear: 2029,
      preparedBy: DEV_ACTOR_UUID,
    },
  });

  // IMPORTANT: Add the course before publishing.
  const item = await prisma.curriculumItem.create({
    data: {
      curriculumId: cur.id,
      itemType: "COURSE",
      courseId,
    },
  });

  if (status !== "DRAFT") {
    await prisma.curriculum.update({
      where: { id: cur.id },
      data: { status: "UNDER_REVIEW" },
    });

    await prisma.curriculum.update({
      where: { id: cur.id },
      data: {
        status: "APPROVED",
        approvedBy: APPROVER_UUID,
      },
    });

    await prisma.curriculum.update({
      where: { id: cur.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  }

  return { itemId: item.id, versionId: cur.id };
}

// Returns the placed item with copiedCredits = theory + lab credit.
export async function getCurriculumItem(itemId) {
  const item = await prisma.curriculumItem.findUnique({
    where: { id: itemId },
  });

  if (!item) return null;

  return {
    ...item,
    copiedCredits:
      Number(item.copiedTheoryCredit ?? 0) +
      Number(item.copiedLabCredit ?? 0),
  };
}
