// State transition testing, security testing and error guessing (Sprint 2 and 3 extra tests).
import { describe, it, expect } from "vitest";
import { prisma } from "../../src/core/prisma.js";
import { createCourse } from "../../src/catalog/course.service.js";
import { searchCourses } from "../../src/catalog/course-search.service.js";
import { setInstitutionType } from "../../src/policy/policy.service.js";
import { placeCourseInVersion } from "../../src/curriculum/curriculum.service.js";

const REG = { id: 11, roles: ["REGISTRAR"] };
const ADMIN = { id: 10, roles: ["INSTITUTION_ADMIN"] };

// State transition: curriculum lifecycle DRAFT -> UNDER_REVIEW -> APPROVED -> PUBLISHED -> ARCHIVED.
describe("State transitions: curriculum lifecycle", () => {
  it("M2TC-131: DRAFT to UNDER_REVIEW is allowed", async () => {
    const c = await createCourse({ code: "ST1", titleEn: "x", theoryCredit: 3 }, REG);
    const { versionId } = await placeCourseInVersion({ courseId: c.id, status: "DRAFT" });
    await expect(prisma.curriculum.update({ where: { id: versionId }, data: { status: "UNDER_REVIEW" } }))
      .resolves.toBeDefined();
  });
  it("M2TC-132: DRAFT straight to PUBLISHED is refused (INVALID_TRANSITION) - a skipped state", async () => {
    const c = await createCourse({ code: "ST2", titleEn: "x", theoryCredit: 3 }, REG);
    const { versionId } = await placeCourseInVersion({ courseId: c.id, status: "DRAFT" });
    await expect(prisma.curriculum.update({ where: { id: versionId }, data: { status: "PUBLISHED", publishedAt: new Date() } }))
      .rejects.toThrow(/INVALID_TRANSITION/);
  });
  it("M2TC-133: a PUBLISHED version cannot go back to DRAFT (PUBLISHED_IMMUTABLE)", async () => {
    const c = await createCourse({ code: "ST3", titleEn: "x", theoryCredit: 3 }, REG);
    const { versionId } = await placeCourseInVersion({ courseId: c.id, status: "PUBLISHED" });
    await expect(prisma.curriculum.update({ where: { id: versionId }, data: { status: "DRAFT" } }))
      .rejects.toThrow(/PUBLISHED_IMMUTABLE/);
  });
});

// Security testing: input that tries to change the database, and access without a login.
describe("Security", () => {
  it("M2TC-134: SQL injection text in the search is treated as plain text; the table survives", async () => {
    const r = await searchCourses({ query: "x'; DROP TABLE courses; --" }, REG);
    expect(Array.isArray(r.items)).toBe(true);
    const still = await prisma.course.count();
    expect(still).toBeGreaterThanOrEqual(0);
  });
  it("M2TC-135: a request with no login is refused with 401 (UNAUTHENTICATED), not 403", async () => {
    await expect(setInstitutionType({ type: "SCHOOL", effectiveFrom: "2026-01-01" }, undefined))
      .rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
  });
});

// Error guessing: inputs experienced testers try because they often break code.
describe("Error guessing", () => {
  it("M2TC-136: a title of 10,001 characters is refused (TITLE_TOO_LONG, limit 200)", async () => {
    await expect(createCourse({ code: "EG1", titleEn: "a".repeat(10001), theoryCredit: 3 }, REG))
      .rejects.toMatchObject({ code: "TITLE_TOO_LONG" });
  });
  it("M2TC-137: an empty course code is refused (CODE_REQUIRED)", async () => {
    await expect(createCourse({ code: "", titleEn: "x", theoryCredit: 3 }, REG))
      .rejects.toMatchObject({ code: "CODE_REQUIRED" });
  });
});
