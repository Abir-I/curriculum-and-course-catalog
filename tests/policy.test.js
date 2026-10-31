// M2TC-109 (FR-33, FR-35): the most specific policy valid on a date wins.
// Written first and red until resolvePolicy() exists in policy.service.js (Sprint 3).
// A program row beats an institution row (scope NULL). No row means null.
import { describe, it, expect } from "vitest";
import { prisma } from "../src/core/prisma.js";
import { DEV_ACTOR_UUID } from "../src/core/auth.js";
import { resolvePolicy } from "../src/policy/policy.service.js";
import { seedProgram } from "./helpers/seed.js";

// MIN_ATTENDANCE is one of the policy keys the database accepts.
async function addPolicy({ scopeUnitId = null, value, effectiveFrom }) {
  return prisma.academicPolicy.create({
    data: {
      policyKey: "MIN_ATTENDANCE",
      scopeUnitId,
      value,
      effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`),
      createdBy: DEV_ACTOR_UUID,
    },
  });
}

describe("Policy resolution", () => {
  it("M2TC-109a: a program policy beats the institution policy", async () => {
    const programId = await seedProgram();
    await addPolicy({ value: 75, effectiveFrom: "2026-01-01" });
    await addPolicy({ scopeUnitId: programId, value: 80, effectiveFrom: "2026-01-01" });
    expect(await resolvePolicy("MIN_ATTENDANCE", programId, "2026-06-01")).toBe(80);
  });

  it("M2TC-109b: a program with no policy of its own gets the institution policy", async () => {
    const withPolicy = await seedProgram();
    const without = await seedProgram();
    await addPolicy({ value: 75, effectiveFrom: "2026-01-01" });
    await addPolicy({ scopeUnitId: withPolicy, value: 80, effectiveFrom: "2026-01-01" });
    expect(await resolvePolicy("MIN_ATTENDANCE", without, "2026-06-01")).toBe(75);
  });

  it("M2TC-109c: a date before any policy starts gives null", async () => {
    const programId = await seedProgram();
    await addPolicy({ value: 75, effectiveFrom: "2026-01-01" });
    expect(await resolvePolicy("MIN_ATTENDANCE", programId, "2025-12-31")).toBeNull();
  });
});
