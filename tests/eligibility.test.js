// M2TC-100 to M2TC-103 (FR-28, FR-32): can this student take this course?
// The answer comes with one reason per prerequisite and nothing about the student is stored.
// Written first and red until eligibility.service.js and grading.client.js exist (Sprint 3).
import { describe, it, expect } from "vitest";
import { prisma } from "../src/core/prisma.js";
import { DEV_ACTOR_UUID } from "../src/core/auth.js";
import { createCourse } from "../src/catalog/course.service.js";
import { createDegreePlan } from "../src/curriculum/degree-plan.service.js";
import {
  createVersion,
  addCourseToVersion,
  setPrerequisite,
} from "../src/curriculum/curriculum.service.js";
import { setGradingClient } from "../src/clients/grading.client.js";
import { check } from "../src/eligibility/eligibility.service.js";
import { seedProgram } from "./helpers/seed.js";
import { resetDatabase } from "./helpers/db.js";
import { fakeGrading } from "./helpers/fakes.js";

const MANAGER = { id: 13, roles: ["CURRICULUM_MANAGER"] };
const REGISTRAR = { id: 11, roles: ["REGISTRAR"] };

// CSE201 requires CSE101. Returns the course ids the check needs.
async function courseWithPrerequisite(minGrade) {
  const prereq = await createCourse({ code: "CSE101", titleEn: "Intro", theoryCredit: 3 }, REGISTRAR);
  const course = await createCourse({ code: "CSE201", titleEn: "Data Structures", theoryCredit: 3 }, REGISTRAR);
  const programId = await seedProgram();
  const plan = await createDegreePlan({ planCode: "4001", programId, nameEn: "Plan" }, MANAGER);
  const version = await createVersion(plan.id, { cohortStartYear: 2026, cohortEndYear: 2028 }, MANAGER);
  const item = await addCourseToVersion(version.id, course.id, MANAGER);
  await setPrerequisite(item.id, prereq.id, MANAGER, minGrade ? { minGrade } : {});
  return { courseId: course.id };
}

describe("Eligibility check", () => {
  it("M2TC-100: a student who passed the prerequisite is ELIGIBLE, with the reason", async () => {
    const { courseId } = await courseWithPrerequisite();
    setGradingClient(fakeGrading({ passed: [{ code: "CSE101" }] }));
    const answer = await check({ studentId: "S-100", courseId });
    expect(answer.result).toBe("ELIGIBLE");
    expect(answer.reasons).toContain("CSE101: passed");
  });

  it("M2TC-101: a student who has not passed the prerequisite is NOT_ELIGIBLE, with the reason", async () => {
    const { courseId } = await courseWithPrerequisite();
    setGradingClient(fakeGrading({ passed: [] }));
    const answer = await check({ studentId: "S-101", courseId });
    expect(answer.result).toBe("NOT_ELIGIBLE");
    expect(answer.reasons).toContain("CSE101: missing");
  });

  it("M2TC-102: when Grading is down the answer is UNKNOWN and nothing is stored", async () => {
    const { courseId } = await courseWithPrerequisite();
    setGradingClient(fakeGrading({ fail: true }));
    const answer = await check({ studentId: "S-102", courseId });
    expect(answer.result).toBe("UNKNOWN");
    expect(answer.stored).toBe(false);
  });

  it("M2TC-103: a prerequisite still in progress gives ELIGIBLE_IN_PROGRESS when the policy allows it", async () => {
    const { courseId } = await courseWithPrerequisite();
    await prisma.academicPolicy.create({
      data: {
        policyKey: "IN_PROGRESS_ALLOWED",
        scopeUnitId: null,
        value: { allowed: true },
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        createdBy: DEV_ACTOR_UUID,
      },
    });
    setGradingClient(fakeGrading({ inProgress: [{ code: "CSE101" }] }));
    const answer = await check({ studentId: "S-103", courseId });
    expect(answer.result).toBe("ELIGIBLE_IN_PROGRESS");
  });

  it("M2TC-177: a passed prerequisite below the minimum grade is NOT_ELIGIBLE; an unknown grade gives UNKNOWN (FR-24)", async () => {
    const low = await courseWithPrerequisite("C");
    setGradingClient(fakeGrading({ passed: [{ code: "CSE101", grade: "D" }] }));
    const below = await check({ studentId: "S-177a", courseId: low.courseId });
    expect(below.result).toBe("NOT_ELIGIBLE");
    expect(below.reasons.join(" ")).toMatch(/below the minimum C/);

    await resetDatabase();
    const ok = await courseWithPrerequisite("C");
    setGradingClient(fakeGrading({ passed: [{ code: "CSE101", grade: "B" }] }));
    const enough = await check({ studentId: "S-177b", courseId: ok.courseId });
    expect(enough.result).toBe("ELIGIBLE");

    await resetDatabase();
    const odd = await courseWithPrerequisite("C");
    setGradingClient(fakeGrading({ passed: [{ code: "CSE101", grade: "??" }] }));
    const unknown = await check({ studentId: "S-177c", courseId: odd.courseId });
    expect(unknown.result).toBe("UNKNOWN");
  });
});
