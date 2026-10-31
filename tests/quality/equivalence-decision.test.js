// Equivalence partitioning and decision-table testing (Sprint 2 extra tests).
import { describe, it, expect } from "vitest";
import { setInstitutionType } from "../../src/policy/policy.service.js";
import { createCourse } from "../../src/catalog/course.service.js";

const ADMIN = { id: 10, roles: ["INSTITUTION_ADMIN"] };
const REG = { id: 11, roles: ["REGISTRAR"] };

// Equivalence classes for institution type: 3 valid values, and invalid classes
// (wrong case, empty, missing, wrong type, unknown word). One representative per class.
describe("Equivalence partitions: institution type", () => {
  it.each([
    ["valid: SCHOOL", "SCHOOL", undefined],
    ["valid: COLLEGE", "COLLEGE", undefined],
    ["valid: UNIVERSITY", "UNIVERSITY", undefined],
    ["invalid: wrong case", "school", "INVALID_INSTITUTION_TYPE"],
    ["invalid: empty string", "", "INVALID_INSTITUTION_TYPE"],
    ["invalid: missing", undefined, "INVALID_INSTITUTION_TYPE"],
    ["invalid: number", 5, "INVALID_INSTITUTION_TYPE"],
    ["invalid: unknown word", "ACADEMY", "INVALID_INSTITUTION_TYPE"],
  ])("M2TC-128 %s", async (_name, type, expectedCode) => {
    const call = setInstitutionType({ type, effectiveFrom: "2026-01-01" }, ADMIN);
    if (expectedCode) await expect(call).rejects.toMatchObject({ code: expectedCode });
    else await expect(call).resolves.toBeDefined();
  });
});

// Decision table for course creation: each row is one combination of conditions and its outcome.
// Conditions: marks supplied? | theory < 0 ? | theory and lab both 0 ? | outcome
describe("Decision table: course creation", () => {
  it.each([
    // marks, neg, zero, expected
    [true,  false, false, "MARKS_NOT_OWNED_BY_M2"],
    [false, true,  false, "NEGATIVE_CREDIT"],
    [false, false, true,  "CREDIT_REQUIRED"],
    [false, false, false, "ok"],
  ])("M2TC-129 marks=%s negative=%s zero=%s -> %s", async (marks, neg, zero, expected) => {
    const input = { code: `DT${Math.random().toString(36).slice(2, 7)}`, titleEn: "x",
      theoryCredit: neg ? -1 : zero ? 0 : 3, labCredit: zero ? 0 : 0 };
    if (marks) input.practicalMarks = 30;
    const call = createCourse(input, REG);
    if (expected === "ok") await expect(call).resolves.toBeDefined();
    else await expect(call).rejects.toMatchObject({ code: expected });
  });
});
