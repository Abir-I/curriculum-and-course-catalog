// US-03: Set up stages and their order (FR-03, FR-06)
// M2TC-009 to M2TC-012
import { describe, it, expect } from "vitest";
import { createStage, setNextStage } from "../src/structure/stage.service.js";
import { seedProgram } from "./helpers/seed.js";

const ADMIN = { id: 10, roles: ["INSTITUTION_ADMIN"] };

describe("US-03 Set up stages and their order", () => {
  it("M2TC-009: a second stage with the same order in one program is refused", async () => {
    // Given stage 1 already exists in the program
    const programId = await seedProgram();
    await createStage({ programId, seqNo: 1, nameEn: "1st Year" }, ADMIN);
    // When another stage with order 1 is created
    // Then the system refuses it with a duplicate-order error
    await expect(
      createStage({ programId, seqNo: 1, nameEn: "Duplicate" }, ADMIN)
    ).rejects.toMatchObject({ code: "DUPLICATE_ORDER", status: 409 });
  });

  it("M2TC-010: a stage chain that would loop back is refused", async () => {
    const programId = await seedProgram();
    const s1 = await createStage({ programId, seqNo: 1, nameEn: "1st Year" }, ADMIN);
    const s2 = await createStage({ programId, seqNo: 2, nameEn: "2nd Year", nextStageId: s1.id }, ADMIN);
    // When stage 1 is set to point to stage 2 (which already points to stage 1)
    await expect(setNextStage(s1.id, s2.id, ADMIN)).rejects.toMatchObject({
      code: "STAGE_LOOP", status: 422,
    });
  });

  it("M2TC-011: a stage cannot be its own next stage", async () => {
    const programId = await seedProgram();
    const s1 = await createStage({ programId, seqNo: 1, nameEn: "1st Year" }, ADMIN);
    await expect(setNextStage(s1.id, s1.id, ADMIN)).rejects.toMatchObject({ code: "STAGE_SELF_REFERENCE" });
  });

  it("M2TC-012: a stage in use is deactivated, not deleted (FR-06)", async () => {
    const programId = await seedProgram();
    const s1 = await createStage({ programId, seqNo: 1, nameEn: "1st Year" }, ADMIN);
    const result = await import("../src/structure/stage.service.js")
      .then((m) => m.deleteStage(s1.id, ADMIN, { inUse: true }));
    expect(result.isActive).toBe(false);
    expect(result.deleted).toBe(false);
  });
});
