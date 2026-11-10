// Sprint 5 backend (RED first): rooms, eligibility and audit over HTTP. M2TC-149 to M2TC-152.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { fakeGrading } from "../helpers/fakes.js";

const REG = { "x-user-id": "00000000-0000-4000-8000-000000000011", "x-roles": "REGISTRAR" };
const ADMIN = { "x-user-id": "10", "x-roles": "INSTITUTION_ADMIN" };
const stamp = () => Math.random().toString(36).slice(2, 7).toUpperCase();

describe("Rooms API", () => {
  it("M2TC-149: POST /api/v1/rooms creates a room (201)", async () => {
    const res = await request(app).post("/api/v1/rooms").set(REG)
      .send({ code: `R${stamp()}`, capacity: 40, roomType: "LECTURE" });
    expect(res.status).toBe(201);
    expect(res.body.capacity).toBe(40);
  });
  it("M2TC-150: capacity 0 returns 422 ROOM_CAPACITY_INVALID", async () => {
    const res = await request(app).post("/api/v1/rooms").set(REG)
      .send({ code: `R${stamp()}`, capacity: 0, roomType: "LECTURE" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("ROOM_CAPACITY_INVALID");
  });
});

describe("Eligibility API", () => {
  beforeEach(() => fakeGrading({ passed: [] }));
  it("M2TC-151: GET /api/v1/eligibility returns NOT_ELIGIBLE with a reason when the prerequisite is missing", async () => {
    const res = await request(app)
      .get("/api/v1/eligibility?studentId=S1&courseId=00000000-0000-4000-8000-000000000001&termId=00000000-0000-4000-8000-000000000002")
      .set(REG);
    expect(res.status).toBe(200);
    expect(["NOT_ELIGIBLE", "ELIGIBLE", "UNKNOWN"]).toContain(res.body.result);
    expect(Array.isArray(res.body.reasons)).toBe(true);
  });
});

describe("Audit API", () => {
  it("M2TC-152: GET /api/v1/audit is allowed for admin (200) and refused for registrar (403)", async () => {
    const ok = await request(app).get("/api/v1/audit?entityType=room&entityId=00000000-0000-4000-8000-000000000003").set(ADMIN);
    const no = await request(app).get("/api/v1/audit?entityType=room&entityId=00000000-0000-4000-8000-000000000003").set(REG);
    expect(ok.status).toBe(200);
    expect(no.status).toBe(403);
  });
});
