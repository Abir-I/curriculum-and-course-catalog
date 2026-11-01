// M2TC-110, M2TC-111 (FR-45, FR-46): does a student move to the next stage?
// PROMOTE only when every rule is met. Missing input gives REVIEW, never PROMOTE.
// Written first and red until progression.service.js exists (Sprint 3).
import { describe, it, expect } from "vitest";
import { prisma } from "../src/core/prisma.js";
import { DEV_ACTOR_UUID } from "../src/core/auth.js";
import { createStage } from "../src/structure/stage.service.js";
import { setGradingClient } from "../src/clients/grading.client.js";
import { evaluate } from "../src/progression/progression.service.js";
import { seedProgram } from "./helpers/seed.js";
import { fakeGrading } from "./helpers/fakes.js";

const ADMIN = { id: 10, roles: ["INSTITUTION_ADMIN"] };

// One program with one stage and the given PROGRESSION_RULES policy for that program.
async function stageWithRules(rules) {
  const programId = await seedProgram();
  const stage = await createStage({ programId, seqNo: 1, nameEn: "1st Year" }, ADMIN);
  await prisma.academicPolicy.create({
    data: {
      policyKey: "PROGRESSION_RULES",
      scopeUnitId: programId,
      value: rules,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      createdBy: DEV_ACTOR_UUID,
    },
  });
  return stage.id;
}

const course = (code, credits, grade = "A") => ({ code, credits, grade });
const RULES = { minCredits: 12, maxFailed: 1, requireAttendance: false, minGpa: 2.0 };

describe("Progression", () => {
  it("M2TC-110: a student who meets every rule is PROMOTED, with one reason per rule", async () => {
    const stageId = await stageWithRules(RULES);
    setGradingClient(
      fakeGrading({
        passed: [course("C1", 3), course("C2", 3), course("C3", 3), course("C4", 3)],
        stage: { gpa: 3.0 },
      })
    );
    const answer = await evaluate("S-110", stageId);
    expect(answer.result).toBe("PROMOTE");
    expect(answer.reasons).toHaveLength(3);
  });

  it("M2TC-110b: a student below the minimum credits is told to REPEAT", async () => {
    const stageId = await stageWithRules(RULES);
    setGradingClient(
      fakeGrading({ passed: [course("C1", 3), course("C2", 3)], stage: { gpa: 3.0 } })
    );
    const answer = await evaluate("S-110b", stageId);
    expect(answer.result).toBe("REPEAT");
  });

  it("M2TC-111: when attendance is required but missing, the answer is REVIEW, never PROMOTE", async () => {
    const stageId = await stageWithRules({ ...RULES, requireAttendance: true });
    setGradingClient(
      fakeGrading({
        passed: [course("C1", 3), course("C2", 3), course("C3", 3), course("C4", 3)],
        stage: { gpa: 3.0 },
      })
    );
    const answer = await evaluate("S-111", stageId);
    expect(answer.result).toBe("REVIEW");
  });
});
