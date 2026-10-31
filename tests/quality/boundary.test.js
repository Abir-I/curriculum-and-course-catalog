// Boundary value analysis (Sprint 2 extra tests). Tests values at, just inside and just outside each limit.
// Run only these with: npx vitest run tests/quality/boundary.test.js
import { describe, it, expect } from "vitest";
import { createCourse } from "../../src/catalog/course.service.js";
import { searchCourses } from "../../src/catalog/course-search.service.js";
import { setInstitutionType } from "../../src/policy/policy.service.js";

const REG = { id: 11, roles: ["REGISTRAR"] };
const ADMIN = { id: 10, roles: ["INSTITUTION_ADMIN"] };

describe("Boundary: course credits (NUMERIC(4,2), must be above zero in total)", () => {
  it("M2TC-121: theory 0 and lab 0 is refused (CREDIT_REQUIRED) - lower boundary of the sum", async () => {
    await expect(createCourse({ code: "B1", titleEn: "x", theoryCredit: 0, labCredit: 0 }, REG))
      .rejects.toMatchObject({ code: "CREDIT_REQUIRED" });
  });
  it("M2TC-122: theory 0.01 is accepted - just above the lower boundary", async () => {
    const c = await createCourse({ code: "B2", titleEn: "x", theoryCredit: 0.01, labCredit: 0 }, REG);
    expect(Number(c.theoryCredit)).toBeCloseTo(0.01);
  });
  it("M2TC-123: theory -0.01 is refused (NEGATIVE_CREDIT) - just below the lower boundary", async () => {
    await expect(createCourse({ code: "B3", titleEn: "x", theoryCredit: -0.01, labCredit: 0 }, REG))
      .rejects.toMatchObject({ code: "NEGATIVE_CREDIT" });
  });
  it("M2TC-124: theory 99.99 is accepted - upper boundary of NUMERIC(4,2)", async () => {
    const c = await createCourse({ code: "B4", titleEn: "x", theoryCredit: 99.99, labCredit: 0 }, REG);
    expect(Number(c.theoryCredit)).toBeCloseTo(99.99);
  });
  it("M2TC-125: theory 100 is refused (CREDIT_TOO_LARGE) - just above the upper boundary", async () => {
    await expect(createCourse({ code: "B5", titleEn: "x", theoryCredit: 100, labCredit: 0 }, REG))
      .rejects.toMatchObject({ code: "CREDIT_TOO_LARGE" });
  });
});

describe("Boundary: search page size (1 to 100)", () => {
  it("M2TC-126: size 0 is refused, size 1 is accepted, size 100 is accepted, size 101 is refused", async () => {
    await expect(searchCourses({ size: 0 }, REG)).rejects.toMatchObject({ code: "INVALID_PAGE_SIZE" });
    await expect(searchCourses({ size: 1 }, REG)).resolves.toBeDefined();
    await expect(searchCourses({ size: 100 }, REG)).resolves.toBeDefined();
    await expect(searchCourses({ size: 101 }, REG)).rejects.toMatchObject({ code: "PAGE_SIZE_TOO_LARGE" });
  });
});

describe("Boundary: effective dates (calendar edges)", () => {
  it("M2TC-127: 2028-02-29 (leap day) is accepted; 2027-02-29 (not a leap year) is refused", async () => {
    const ok = await setInstitutionType({ type: "SCHOOL", effectiveFrom: "2028-02-29" }, ADMIN);
    expect(ok.effectiveFrom).toBe("2028-02-29");
    await expect(setInstitutionType({ type: "SCHOOL", effectiveFrom: "2027-02-29" }, ADMIN))
      .rejects.toMatchObject({ code: "INVALID_EFFECTIVE_FROM" });
  });
});
