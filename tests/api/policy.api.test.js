// M2TC-166, 179 (FR-33, FR-35, FR-36, FR-47). Red first: the policy route does not exist yet.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/core/prisma.js";
import { resetDatabase } from "../helpers/db.js";

const ADMIN = { "x-user-id": "00000000-0000-4000-8000-000000000010", "x-roles": "INSTITUTION_ADMIN" };
const REG = { "x-user-id": "00000000-0000-4000-8000-000000000011", "x-roles": "REGISTRAR" };
const UUID = "00000000-0000-4000-8000-000000000010";
let programId;

beforeEach(async () => {
  await resetDatabase();
  const prog = await prisma.academicUnit.create({ data: { unitType: "PROGRAM", code: "P-POL", nameEn: "Pol", termPattern: "SEMESTER" } });
  programId = prog.id;
  await prisma.academicPolicy.create({ data: { policyKey: "IN_PROGRESS_ALLOWED", scopeUnitId: null, value: { allowed: false }, effectiveFrom: new Date("2026-01-01"), createdBy: UUID } });
  await prisma.academicPolicy.create({ data: { policyKey: "IN_PROGRESS_ALLOWED", scopeUnitId: programId, value: { allowed: true }, effectiveFrom: new Date("2026-01-01"), createdBy: UUID } });
});

describe("Policy API (FR-33, FR-35, FR-36, FR-47)", () => {
  it("M2TC-166: an administrator may set a policy (201); a registrar may not (403)", async () => {
    const ok = await request(app).post("/api/v1/policies").set(ADMIN)
      .send({ policyKey: "MIN_ATTENDANCE", value: { percent: 75 }, effectiveFrom: "2026-01-01" });
    expect(ok.status).toBe(201);
    const no = await request(app).post("/api/v1/policies").set(REG)
      .send({ policyKey: "MIN_ATTENDANCE", value: { percent: 75 }, effectiveFrom: "2026-01-01" });
    expect(no.status).toBe(403);
  });

  it("M2TC-179: resolve returns the most specific policy (program over institution)", async () => {
    const res = await request(app).get(`/api/v1/policies/resolve?key=IN_PROGRESS_ALLOWED&unitId=${programId}&date=2026-06-01`).set(REG);
    expect(res.status).toBe(200);
    expect(res.body.value.allowed).toBe(true);
  });
});
