import { prisma } from "../core/prisma.js";
import { requireRole } from "../core/auth.js";

// FR-21: the study plan of one curriculum version, grouped by stage in stage order.
// Read-only: it never changes curriculum data. Staff roles only.
export async function buildStudyPlan(curriculumId, actor) {
  requireRole(actor, "REGISTRAR");
  const items = await prisma.curriculumItem.findMany({
    where: { curriculumId, itemType: "COURSE" },
    include: { course: true, stage: true },
    orderBy: [{ sortOrder: "asc" }],
  });
  const byStage = new Map();
  for (const it of items) {
    const key = it.stageId ?? "unassigned";
    if (!byStage.has(key)) {
      byStage.set(key, {
        stageId: it.stageId,
        stageName: it.stage?.nameEn ?? "Unassigned",
        seqNo: it.stage?.seqNo ?? Number.MAX_SAFE_INTEGER,
        courses: [],
      });
    }
    byStage.get(key).courses.push({
      code: it.course?.code,
      titleEn: it.course?.titleEn,
      theoryCredit: it.copiedTheoryCredit?.toString() ?? null,
      labCredit: it.copiedLabCredit?.toString() ?? null,
    });
  }
  return [...byStage.values()].sort((a, b) => a.seqNo - b.seqNo);
}
