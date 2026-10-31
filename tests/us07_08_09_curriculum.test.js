// M2TC-090 to M2TC-094, M2TC-099
// US-07 prerequisites, US-08 groups, US-09 versions.
// 093 and 094 are green. 090, 091, 092 and 099 are red until Sprint 3 adds
// addCourseToVersion, setPrerequisite, listRequirements and createGroup
// (function names and argument order follow Sprint3_Detailed_Guide.md).
import { describe, it, expect } from "vitest";
import { createDegreePlan } from "../src/curriculum/degree-plan.service.js";
import {
  createVersion,
  addCourseToVersion,
  setPrerequisite,
  listRequirements,
  createGroup,
} from "../src/curriculum/curriculum.service.js";
import { createCourse } from "../src/catalog/course.service.js";
import { seedProgram } from "./helpers/seed.js";
import { prisma } from "../src/core/prisma.js";

const MANAGER = { id: 13, roles: ["CURRICULUM_MANAGER"] };
const REGISTRAR = { id: 11, roles: ["REGISTRAR"] };

// One new program, one degree plan and one draft version.
async function makeVersion(planCode) {
  const programId = await seedProgram();
  const plan = await createDegreePlan({ planCode, programId, nameEn: "Plan" }, MANAGER);
  return createVersion(plan.id, { cohortStartYear: 2026, cohortEndYear: 2028 }, MANAGER);
}

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
  it("M2TC-090: the same course in two programs keeps separate prerequisites", async () => {
    const course = await createCourse({ code: "CSE301", titleEn: "Networks", theoryCredit: 3 }, REGISTRAR);
    const prereq = await createCourse({ code: "CSE101", titleEn: "Intro", theoryCredit: 3 }, REGISTRAR);
    const cse = await makeVersion("2001");
    const bba = await makeVersion("2002");
    const itemCse = await addCourseToVersion(cse.id, course.id, MANAGER);
    const itemBba = await addCourseToVersion(bba.id, course.id, MANAGER);
    await setPrerequisite(itemCse.id, prereq.id, MANAGER);
    expect(await listRequirements(itemCse.id)).toHaveLength(1);
    expect(await listRequirements(itemBba.id)).toHaveLength(0);
  });

  it("M2TC-099: a course cannot be its own prerequisite", async () => {
    const course = await createCourse({ code: "CSE302", titleEn: "Compilers", theoryCredit: 3 }, REGISTRAR);
    const version = await makeVersion("2003");
    const item = await addCourseToVersion(version.id, course.id, MANAGER);
    await expect(
      setPrerequisite(item.id, course.id, MANAGER)
    ).rejects.toMatchObject({ code: "SELF_PREREQUISITE" });
  });
});

describe("US-08 Groups", () => {
  it("M2TC-091: a group is saved with its type, and an unknown type is refused", async () => {
    const version = await makeVersion("3001");
    const group = await createGroup(version.id, { groupType: "CHOOSE_N", minCourses: 2 }, MANAGER);
    expect(group.itemType).toBe("GROUP");
    expect(group.groupType).toBe("CHOOSE_N");
    await expect(
      createGroup(version.id, { groupType: "RANDOM" }, MANAGER)
    ).rejects.toMatchObject({ code: "INVALID_GROUP_TYPE", status: 422 });
  });

  it("M2TC-092: a course can be placed inside a group", async () => {
    const course = await createCourse({ code: "CSE401", titleEn: "AI", theoryCredit: 3 }, REGISTRAR);
    const version = await makeVersion("3002");
    const group = await createGroup(version.id, { groupType: "ELECTIVE", minCredits: 3 }, MANAGER);
    const item = await addCourseToVersion(version.id, course.id, MANAGER, { parentGroupId: group.id });
    const saved = await prisma.curriculumItem.findUnique({ where: { id: item.id } });
    expect(saved.parentItemId).toBe(group.id);
  });
});
