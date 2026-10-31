// M2TC-093, M2TC-094 (US-09 versions) and M2TC-099 (US-07 prerequisite)
// Written first and red in Sprint 2. Green once degree-plan.service.js, createVersion()
// and setPrerequisite() exist (both functions live in curriculum.service.js, as in the guide).
import { describe, it, expect } from "vitest";
import { createDegreePlan } from "../src/curriculum/degree-plan.service.js";
import { createVersion, setPrerequisite } from "../src/curriculum/curriculum.service.js";
import { createCourse } from "../src/catalog/course.service.js";
import { seedProgram } from "./helpers/seed.js";
import { createVersionWithCourse } from "./helpers/curriculum-fixtures.js";

const MANAGER = { id: 13, roles: ["CURRICULUM_MANAGER"] };
const REGISTRAR = { id: 11, roles: ["REGISTRAR"] };

describe("US-09 Curriculum versions", () => {
  it("M2TC-093: the second version of a plan gets code 1001-v2", async () => {
    const programId = await seedProgram();
    const plan = await createDegreePlan({ planCode: "1001", programId, nameEn: "BSc CSE" }, MANAGER);
    const v1 = await createVersion(plan.id, { cohortStartYear: 2026, cohortEndYear: 2028 }, MANAGER);
    const v2 = await createVersion(plan.id, { cohortStartYear: 2029, cohortEndYear: 2031 }, MANAGER);
    expect(v1.versionCode).toBe("1001-v1");
    expect(v2.versionCode).toBe("1001-v2");
  });

  it("M2TC-094: a version with an overlapping cohort range is refused (COHORT_OVERLAP)", async () => {
    const programId = await seedProgram();
    const plan = await createDegreePlan({ planCode: "1002", programId, nameEn: "BSc CSE" }, MANAGER);
    await createVersion(plan.id, { cohortStartYear: 2026, cohortEndYear: 2028 }, MANAGER);
    await expect(
      createVersion(plan.id, { cohortStartYear: 2027, cohortEndYear: 2029 }, MANAGER)
    ).rejects.toMatchObject({ code: "COHORT_OVERLAP" });
  });
});

describe("US-07 Prerequisites", () => {
  // Name and file follow the guide (setPrerequisite in curriculum.service.js).
  // The argument shape (curriculumItemId, { courseId }, actor) is an assumption.
  it("M2TC-099: a course cannot be its own prerequisite", async () => {
    const course = await createCourse({ code: "CSE301", titleEn: "Networks", theoryCredit: 3 }, REGISTRAR);
    const placed = await createVersionWithCourse({ courseId: course.id, status: "DRAFT" });
    await expect(
      setPrerequisite(placed.itemId, { courseId: course.id }, MANAGER)
    ).rejects.toMatchObject({ code: "SELF_PREREQUISITE" });
  });
});
