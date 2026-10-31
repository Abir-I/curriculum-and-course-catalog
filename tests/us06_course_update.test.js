// M2TC-021 to M2TC-022, M2TC-098
// US-06: Change a course without changing old records (FR-09)
import { describe, it, expect } from "vitest";
import { createCourse, updateCourse } from "../src/catalog/course.service.js";
import { createVersionWithCourse, getPlacedItem } from "./helpers/curriculum-fixtures.js";

const REGISTRAR = { id: 11, roles: ["REGISTRAR"] };

describe("US-06 Change a course without changing old records", () => {
  it("M2TC-021: a published version keeps the credits it had when the course was placed", async () => {
    const course = await createCourse({ code: "CSE201", titleEn: "Data Structures", theoryCredit: 3 }, REGISTRAR);
    const placed = await createVersionWithCourse({ courseId: course.id, status: "PUBLISHED" });
    await updateCourse(course.id, { theoryCredit: 4 }, REGISTRAR);
    const item = await getPlacedItem(placed.itemId);
    expect(item.copiedCredits).toBe(3);
  });

  it("M2TC-022: a draft version uses the new credits after the change", async () => {
    const course = await createCourse({ code: "CSE202", titleEn: "Algorithms", theoryCredit: 3 }, REGISTRAR);
    const draft = await createVersionWithCourse({ courseId: course.id, status: "DRAFT" });
    await updateCourse(course.id, { theoryCredit: 4 }, REGISTRAR);
    const item = await getPlacedItem(draft.itemId);
    expect(item.copiedCredits).toBe(4);
  });

  it("M2TC-098: a negative credit on update is refused (422)", async () => {
    const course = await createCourse({ code: "CSE203", titleEn: "Databases", theoryCredit: 3 }, REGISTRAR);
    await expect(
      updateCourse(course.id, { theoryCredit: -1 }, REGISTRAR)
    ).rejects.toMatchObject({ code: "NEGATIVE_CREDIT", status: 422 });
  });
});
