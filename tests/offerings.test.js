// M2TC-105 (Sprint 2, red). FR-10: a deactivated course cannot be offered.
// Red until createTerm, createOffering and deactivateCourse exist.
// (M2TC-104, the list of open offerings, joins this file in Sprint 3.)
import { describe, it, expect } from "vitest";
import { createCourse, deactivateCourse } from "../src/catalog/course.service.js";
import { createTerm } from "../src/structure/term.service.js";
import { createOffering } from "../src/scheduling/offering.service.js";

const REGISTRAR = { id: 11, roles: ["REGISTRAR"] };

describe("Offerings", () => {
  it("M2TC-105: a deactivated course cannot be offered in a term (422)", async () => {
    const course = await createCourse({ code: "CSE501", titleEn: "Security", theoryCredit: 3 }, REGISTRAR);
    const term = await createTerm(
      { termType: "SEMESTER", sessionLabel: "2026-FALL", nameEn: "Fall 2026" },
      REGISTRAR
    );
    await deactivateCourse(course.id, REGISTRAR);
    await expect(
      createOffering({ courseId: course.id, termId: term.id }, REGISTRAR)
    ).rejects.toMatchObject({ code: "COURSE_INACTIVE", status: 422 });
  });
});
