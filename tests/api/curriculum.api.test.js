// M2TC-163, 164, 165 (FR-15, FR-16, FR-26). Red first: the curriculum route does not exist yet.
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REG = { "x-user-id": "00000000-0000-4000-8000-000000000011", "x-roles": "REGISTRAR" };
const PLAN = "60000000-0000-4000-8000-000000000001";
const VERSION = "70000000-0000-4000-8000-000000000001";
const ITEM = "80000000-0000-4000-8000-000000000001";

describe("Curriculum API (FR-15, FR-16, FR-26)", () => {
  it("M2TC-163: a second version of the same plan gets code 1001-v2 (201)", async () => {
    const res = await request(app).post(`/api/v1/curricula`).set(REG)
      .send({ planId: PLAN, cohortStartYear: 2030, cohortEndYear: 2033 });
    expect(res.status).toBe(201);
    expect(res.body.versionCode).toBe("1001-v2");
  });

  it("M2TC-164: an unknown group type is refused (422)", async () => {
    const res = await request(app).post(`/api/v1/curricula/${VERSION}/groups`).set(REG)
      .send({ groupType: "NOT_A_TYPE" });
    expect(res.status).toBe(422);
  });

  it("M2TC-165: a prerequisite cycle is refused (422 PREREQ_CYCLE)", async () => {
    const res = await request(app).post(`/api/v1/curricula/items/${ITEM}/prerequisites`).set(REG)
      .send({ requiredCourseId: "40000000-0000-4000-8000-000000000001" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("PREREQ_CYCLE");
  });
});
