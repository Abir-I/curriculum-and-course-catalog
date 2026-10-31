// US-04: Add a course to the catalog (FR-07, FR-08)
// M2TC-013 to M2TC-016
import { describe, it, expect } from "vitest";
import { createCourse } from "../src/catalog/course.service.js";

const REGISTRAR = { id: 11, roles: ["REGISTRAR"] };
const base = { code: "CSE101", titleEn: "Intro to Programming", theoryCredit: 3, labCredit: 0 };

describe("US-04 Add a course to the catalog", () => {
  it("M2TC-013: creates a course with valid marks and credits", async () => {
    const c = await createCourse(base, REGISTRAR);
    expect(c.code).toBe("CSE101");
    expect(Number(c.theoryCredit)).toBe(3);
  });

  it("M2TC-014: a duplicate course code is refused", async () => {
    await createCourse(base, REGISTRAR);
    await expect(
      createCourse({ ...base, titleEn: "Another" }, REGISTRAR)
    ).rejects.toMatchObject({ code: "DUPLICATE_CODE", status: 409 });
  });

  it("M2TC-015: course service refuses grading marks (Module 4 owns marks)", async () => {
    await expect(
      createCourse({ ...base, code: "CSE102", practicalMarks: 30 }, REGISTRAR)
    ).rejects.toMatchObject({ code: "MARKS_NOT_OWNED_BY_M2", status: 422 });
  });

  it("M2TC-016: negative credit is refused", async () => {
    await expect(
      createCourse({ ...base, code: "CSE103", theoryCredit: -3 }, REGISTRAR)
    ).rejects.toMatchObject({ code: "NEGATIVE_CREDIT" });
  });
});
