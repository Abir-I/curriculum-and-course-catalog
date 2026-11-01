// M2TC-113 (FR-23, FR-26): a prerequisite loop is refused.
// The database trigger already refuses loops, so this test passes as soon as it is written.
// It is kept as a regression test, not as red-to-green TDD evidence.
import { describe, it, expect } from "vitest";
import { createCourse } from "../src/catalog/course.service.js";
import { createDegreePlan } from "../src/curriculum/degree-plan.service.js";
import {
  createVersion,
  addCourseToVersion,
  setPrerequisite,
} from "../src/curriculum/curriculum.service.js";
import { seedProgram } from "./helpers/seed.js";

const MANAGER = { id: 13, roles: ["CURRICULUM_MANAGER"] };
const REGISTRAR = { id: 11, roles: ["REGISTRAR"] };

describe("Prerequisite loops", () => {
  it("M2TC-113: if A needs B, then B needing A is refused (PREREQ_CYCLE)", async () => {
    const a = await createCourse({ code: "LOOP101", titleEn: "A", theoryCredit: 3 }, REGISTRAR);
    const b = await createCourse({ code: "LOOP102", titleEn: "B", theoryCredit: 3 }, REGISTRAR);
    const programId = await seedProgram();
    const plan = await createDegreePlan({ planCode: "6001", programId, nameEn: "Plan" }, MANAGER);
    const version = await createVersion(plan.id, { cohortStartYear: 2026, cohortEndYear: 2028 }, MANAGER);
    const itemA = await addCourseToVersion(version.id, a.id, MANAGER);
    const itemB = await addCourseToVersion(version.id, b.id, MANAGER);

    await setPrerequisite(itemA.id, b.id, MANAGER); // A needs B
    await expect(setPrerequisite(itemB.id, a.id, MANAGER)).rejects.toMatchObject({
      code: "PREREQ_CYCLE",
    });
  });
});
