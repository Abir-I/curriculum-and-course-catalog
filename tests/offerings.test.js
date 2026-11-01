// M2TC-104 and M2TC-105 (FR-10): which courses are offered in a term.
// 105 was red in Sprint 2 (createTerm, createOffering, deactivateCourse did not exist).
// 104 (listOpen) is added after listOpen already existed, so it is not red-to-green evidence.
import { describe, it, expect } from "vitest";
import { createCourse, deactivateCourse } from "../src/catalog/course.service.js";
import { createTerm } from "../src/structure/term.service.js";
import { createOffering, listOpen } from "../src/scheduling/offering.service.js";

const REGISTRAR = { id: 11, roles: ["REGISTRAR"] };

const newTerm = () =>
  createTerm({ termType: "SEMESTER", sessionLabel: "2026-FALL", nameEn: "Fall 2026" }, REGISTRAR);

describe("Offerings", () => {
  it("M2TC-104: only open offerings of the term are listed", async () => {
    const open = await createCourse({ code: "CSE601", titleEn: "Open", theoryCredit: 3 }, REGISTRAR);
    const draft = await createCourse({ code: "CSE602", titleEn: "Draft", theoryCredit: 3 }, REGISTRAR);
    const term = await newTerm();
    await createOffering({ courseId: open.id, termId: term.id, status: "OPEN" }, REGISTRAR);
    await createOffering({ courseId: draft.id, termId: term.id, status: "DRAFT" }, REGISTRAR);
    const listed = await listOpen(term.id);
    expect(listed).toHaveLength(1);
    expect(listed[0].courseId).toBe(open.id);
  });

  it("M2TC-105: a deactivated course cannot be offered in a term (422)", async () => {
    const course = await createCourse({ code: "CSE501", titleEn: "Security", theoryCredit: 3 }, REGISTRAR);
    const term = await newTerm();
    await deactivateCourse(course.id, REGISTRAR);
    await expect(
      createOffering({ courseId: course.id, termId: term.id }, REGISTRAR)
    ).rejects.toMatchObject({ code: "COURSE_INACTIVE", status: 422 });
  });
});
