// US-02: Create the academic structure (FR-02, FR-04, FR-05, FR-06)
// M2TC-004 to M2TC-008
import { describe, it, expect } from "vitest";
import { createUnit } from "../src/structure/unit.service.js";

const ADMIN = { id: 10, roles: ["INSTITUTION_ADMIN"] };

describe("US-02 Create the academic structure", () => {
  it("M2TC-004: a department can be created under a faculty", async () => {
    const faculty = await createUnit({ unitType: "FACULTY", code: "FAC-SCI", nameEn: "Science" }, ADMIN);
    const dept = await createUnit(
      { unitType: "DEPARTMENT", code: "DEPT-CSE", nameEn: "Computer Science", parentId: faculty.id }, ADMIN);
    expect(dept.parentId).toBe(faculty.id);
  });

  it("M2TC-005: a stream must belong to a program", async () => {
    await expect(
      createUnit({ unitType: "STREAM", code: "STR-1", nameEn: "Science stream" }, ADMIN)
    ).rejects.toMatchObject({ code: "PARENT_REQUIRED" });
  });

  it("M2TC-006: a PROGRAM must have a term pattern; other unit types must not", async () => {
    await expect(
      createUnit({ unitType: "PROGRAM", code: "PRG-1", nameEn: "BSc CSE" }, ADMIN)
    ).rejects.toMatchObject({ code: "TERM_PATTERN_REQUIRED" });
    await expect(
      createUnit({ unitType: "FACULTY", code: "FAC-2", nameEn: "Arts", termPattern: "ANNUAL" }, ADMIN)
    ).rejects.toMatchObject({ code: "TERM_PATTERN_NOT_ALLOWED" });
  });

  it("M2TC-007: a unit cannot be its own parent", async () => {
    const u = await createUnit({ unitType: "FACULTY", code: "FAC-3", nameEn: "Engineering" }, ADMIN);
    await expect(
      createUnit({ unitType: "DEPARTMENT", code: "DEPT-X", nameEn: "X", parentId: u.id, selfId: u.id }, ADMIN)
    ).rejects.toMatchObject({ code: "UNIT_LOOP" });
  });

  it("M2TC-008: a Bangla name is stored and returned with the English name", async () => {
    const u = await createUnit(
      { unitType: "FACULTY", code: "FAC-BN", nameEn: "Business", nameBn: "ব্যবসায়" }, ADMIN);
    expect(u.nameBn).toBe("ব্যবসায়");
  });
});
