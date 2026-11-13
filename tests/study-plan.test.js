// Sprint 4 task S4-02 (FR-21). Needs the database. Red first: commit this file before src/study/*.
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/core/prisma.js";
import { buildStudyPlan } from "../src/study/study-plan.service.js";
import { resetDatabase } from "./helpers/db.js";

const UUID = "00000000-0000-4000-8000-000000000077";
const REG = { id: "11", roles: ["REGISTRAR"] };

async function seedVersion() {
  const prog = await prisma.academicUnit.create({ data: { unitType: "PROGRAM", code: "P-SP", nameEn: "SP", termPattern: "SEMESTER" } });
  const plan = await prisma.degreePlan.create({ data: { planCode: "3001", programId: prog.id, nameEn: "SP" } });
  const cur = await prisma.curriculum.create({ data: { programId: prog.id, degreePlanId: plan.id, versionNo: 1, cohortStartYear: 2026, cohortEndYear: 2029, preparedBy: UUID } });
  const s2 = await prisma.academicStage.create({ data: { programId: prog.id, seqNo: 2, nameEn: "Year 1 Sem 2" } });
  const s1 = await prisma.academicStage.create({ data: { programId: prog.id, seqNo: 1, nameEn: "Year 1 Sem 1" } });
  const c1 = await prisma.course.create({ data: { code: "SP101", titleEn: "A", theoryCredit: 3, labCredit: 0 } });
  const c2 = await prisma.course.create({ data: { code: "SP102", titleEn: "B", theoryCredit: 3, labCredit: 0 } });
  await prisma.curriculumItem.create({ data: { curriculumId: cur.id, itemType: "COURSE", courseId: c2.id, stageId: s2.id, sortOrder: 1 } });
  await prisma.curriculumItem.create({ data: { curriculumId: cur.id, itemType: "COURSE", courseId: c1.id, stageId: s1.id, sortOrder: 2 } });
  return cur.id;
}

describe("FR-21 study plan", () => {
  beforeEach(async () => { await resetDatabase(); });

  it("S4-02a: courses are grouped by stage in stage order", async () => {
    const curId = await seedVersion();
    const plan = await buildStudyPlan(curId, REG);
    expect(plan.map((s) => s.stageName)).toEqual(["Year 1 Sem 1", "Year 1 Sem 2"]);
    expect(plan[0].courses[0].code).toBe("SP101");
  });

  it("S4-02b: a student (no staff role) cannot read the study plan", async () => {
    const curId = await seedVersion();
    await expect(buildStudyPlan(curId, { id: "21", roles: ["STUDENT"] })).rejects.toMatchObject({ status: 403 });
  });
});
