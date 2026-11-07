// Regression tests for Team 1 defects M2D006 (AND permissive) and M2D007 (OR treated as AND).
// Tests M2TC-183 and M2TC-184. Fixtures build the trees directly in the database.
import { describe, it, expect } from "vitest";
import { prisma } from "../src/core/prisma.js";
import { check } from "../src/eligibility/eligibility.service.js";
import { setGradingClient } from "../src/clients/grading.client.js";
import { fakeGrading } from "./helpers/fakes.js";

const UUID = "00000000-0000-4000-8000-000000000099";
let n = 0;

// Builds a course whose prerequisite tree is nested arrays:
// node = { type: "AND" | "OR", children: [...] }, or a course code string for a leaf.
async function courseWithTree(tree) {
  n += 1;
  const prog = await prisma.academicUnit.create({ data: { unitType: "PROGRAM", code: `P-T${n}`, nameEn: "T", termPattern: "SEMESTER" } });
  const plan = await prisma.degreePlan.create({ data: { planCode: String(2000 + n), programId: prog.id, nameEn: "T" } });
  const cur = await prisma.curriculum.create({ data: { programId: prog.id, degreePlanId: plan.id, versionNo: 1, cohortStartYear: 2026, cohortEndYear: 2029, preparedBy: UUID } });
  const target = await prisma.course.create({ data: { code: `TGT${n}`, titleEn: "Target", theoryCredit: 3, labCredit: 0 } });
  const item = await prisma.curriculumItem.create({ data: { curriculumId: cur.id, itemType: "COURSE", courseId: target.id } });
  const leafCourse = async (code) => (await prisma.course.create({ data: { code: `${code}-${n}`, titleEn: code, theoryCredit: 3, labCredit: 0 } })).id;
  const build = async (node, parentId) => {
    if (typeof node === "string") {
      await prisma.prerequisiteRule.create({ data: { curriculumItemId: item.id, ruleKind: "PREREQUISITE", nodeType: "COURSE", courseId: await leafCourse(node), parentNodeId: parentId } });
      return;
    }
    const created = await prisma.prerequisiteRule.create({ data: { curriculumItemId: item.id, ruleKind: "PREREQUISITE", nodeType: node.type, parentNodeId: parentId } });
    for (const child of node.children) await build(child, created.id);
  };
  await build(tree, null);
  await prisma.academicPolicy.create({ data: { policyKey: "IN_PROGRESS_ALLOWED", value: { allowed: true }, effectiveFrom: new Date("2026-01-01"), createdBy: UUID } });
  return target.id;
}

describe("M2D006: AND tree must stay rejected (Team 1, Critical)", () => {
  it("M2TC-183: AND(QA100 missing, QA101 in progress) is NOT_ELIGIBLE, even when in-progress is allowed", async () => {
    const courseId = await courseWithTree({ type: "AND", children: ["QA100", "QA101"] });
    setGradingClient(fakeGrading({ passed: [], inProgress: [{ code: "QA101-" + n }] }));
    const r = await check({ studentId: "S-183", courseId });
    expect(r.result).toBe("NOT_ELIGIBLE");
  });
});

describe("M2D007: OR alternatives are not all required (Team 1, High)", () => {
  it("M2TC-184: OR(QA100, QA101) with QA100 passed is ELIGIBLE", async () => {
    const courseId = await courseWithTree({ type: "OR", children: ["QA100", "QA101"] });
    setGradingClient(fakeGrading({ passed: [{ code: "QA100-" + n, grade: "B" }] }));
    const r = await check({ studentId: "S-184", courseId });
    expect(r.result).toBe("ELIGIBLE");
  });
  it("M2TC-184b: OR(QA100, QA101) with neither passed is NOT_ELIGIBLE", async () => {
    const courseId = await courseWithTree({ type: "OR", children: ["QA100", "QA101"] });
    setGradingClient(fakeGrading({ passed: [] }));
    const r = await check({ studentId: "S-184b", courseId });
    expect(r.result).toBe("NOT_ELIGIBLE");
  });
});
