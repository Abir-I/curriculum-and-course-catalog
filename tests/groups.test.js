// M2TC-112 (FR-19): a version cannot go to review while a "choose N" group cannot be completed.
// Written first and red until submitForReview() exists in curriculum.service.js (Sprint 3).
import { describe, it, expect } from "vitest";
import { prisma } from "../src/core/prisma.js";
import { createCourse } from "../src/catalog/course.service.js";
import { createDegreePlan } from "../src/curriculum/degree-plan.service.js";
import {
  createVersion,
  createGroup,
  addCourseToVersion,
  submitForReview,
} from "../src/curriculum/curriculum.service.js";
import { seedProgram } from "./helpers/seed.js";

const MANAGER = { id: 13, roles: ["CURRICULUM_MANAGER"] };
const REGISTRAR = { id: 11, roles: ["REGISTRAR"] };

// A draft version with one CHOOSE_N group that needs two courses.
async function versionWithGroup(planCode) {
  const programId = await seedProgram();
  const plan = await createDegreePlan({ planCode, programId, nameEn: "Plan" }, MANAGER);
  const version = await createVersion(plan.id, { cohortStartYear: 2026, cohortEndYear: 2028 }, MANAGER);
  const group = await createGroup(version.id, { groupType: "CHOOSE_N", minCourses: 2 }, MANAGER);
  return { version, group };
}

async function placeInGroup(version, group, code) {
  const course = await createCourse({ code, titleEn: code, theoryCredit: 3 }, REGISTRAR);
  return addCourseToVersion(version.id, course.id, MANAGER, { parentGroupId: group.id });
}

describe("Group completion before review", () => {
  it("M2TC-112a: a group that needs 2 courses but holds 1 blocks the review (422)", async () => {
    const { version, group } = await versionWithGroup("5001");
    await placeInGroup(version, group, "ELE101");
    await expect(submitForReview(version.id, MANAGER)).rejects.toMatchObject({
      code: "GROUP_NOT_COMPLETABLE",
      status: 422,
    });
    const saved = await prisma.curriculum.findUnique({ where: { id: version.id } });
    expect(saved.status).toBe("DRAFT");
  });

  it("M2TC-112b: a group that holds enough courses lets the version go to review", async () => {
    const { version, group } = await versionWithGroup("5002");
    await placeInGroup(version, group, "ELE201");
    await placeInGroup(version, group, "ELE202");
    await submitForReview(version.id, MANAGER);
    const saved = await prisma.curriculum.findUnique({ where: { id: version.id } });
    expect(saved.status).toBe("UNDER_REVIEW");
  });
});
