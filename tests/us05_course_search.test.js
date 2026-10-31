// M2TC-017 to M2TC-020
// US-05: Find a course quickly (FR-11)
import { describe, it, expect, beforeEach } from "vitest";
import { createCourse } from "../src/catalog/course.service.js";
import { searchCourses } from "../src/catalog/course-search.service.js";

const REGISTRAR = { id: 11, roles: ["REGISTRAR"] };

beforeEach(async () => {   // setup.js resets the database before each test, so seed here
  await createCourse({ code: "CSE101", titleEn: "Intro to Programming", titleBn: "প্রোগ্রামিং পরিচিতি",
    theoryCredit: 3 }, REGISTRAR);
  for (let i = 0; i < 250; i++) {
    await createCourse({ code: `GEN${i}`, titleEn: `General course ${i}`, theoryCredit: 3 }, REGISTRAR);
  }
});

describe("US-05 Find a course quickly", () => {
  it("M2TC-017: finds a course by its code", async () => {
    const r = await searchCourses({ query: "CSE101" }, REGISTRAR);
    expect(r.items.map((c) => c.code)).toContain("CSE101");
  });

  it("M2TC-018: finds a course by its Bangla title", async () => {
    const r = await searchCourses({ query: "প্রোগ্রামিং" }, REGISTRAR);
    expect(r.items.map((c) => c.code)).toContain("CSE101");
  });

  it("M2TC-019: results are paged, at most 20 per page by default, with the total count", async () => {
    const r = await searchCourses({ query: "General", page: 1 }, REGISTRAR);
    expect(r.items.length).toBeLessThanOrEqual(20);
    expect(r.total).toBe(250);
  });

  it("M2TC-020: page size above 100 is refused", async () => {
    await expect(searchCourses({ query: "General", size: 500 }, REGISTRAR))
      .rejects.toMatchObject({ code: "PAGE_SIZE_TOO_LARGE" });
  });
});
