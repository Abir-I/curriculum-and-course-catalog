// Sprint 5 backend (RED first). HTTP tests for the course catalogue API, /api/v1.
// The app is src/app.js (Express). Dev auth: headers x-user-id and x-roles (replaced by Module 1 later).
// M2TC-140 to M2TC-148. Written before src/app.js and the routes exist.
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REG = { "x-user-id": "00000000-0000-4000-8000-000000000011", "x-roles": "REGISTRAR" };
const STUDENT = { "x-user-id": "21", "x-roles": "STUDENT" };
const stamp = () => Math.random().toString(36).slice(2, 7).toUpperCase();

describe("Courses API", () => {
  it("M2TC-140: GET /api/v1/courses returns items and total", async () => {
    const res = await request(app).get("/api/v1/courses?page=1&size=20").set(REG);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.total).toBe("number");
  });

  it("M2TC-141: POST /api/v1/courses as REGISTRAR creates a course (201)", async () => {
    const code = `API${stamp()}`;
    const res = await request(app).post("/api/v1/courses")
      .set(REG).send({ code, titleEn: "API course", theoryCredit: 3, labCredit: 0 });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(code);
  });

  it("M2TC-142: POST /api/v1/courses as STUDENT is refused (403)", async () => {
    const res = await request(app).post("/api/v1/courses")
      .set(STUDENT).send({ code: `NO${stamp()}`, titleEn: "x", theoryCredit: 3 });
    expect(res.status).toBe(403);
  });

  it("M2TC-143: negative credit returns 422 with code NEGATIVE_CREDIT", async () => {
    const res = await request(app).post("/api/v1/courses")
      .set(REG).send({ code: `NEG${stamp()}`, titleEn: "x", theoryCredit: -3 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("NEGATIVE_CREDIT");
  });

  it("M2TC-144: duplicate code returns 409 with code DUPLICATE_CODE", async () => {
    const code = `DUP${stamp()}`;
    await request(app).post("/api/v1/courses").set(REG).send({ code, titleEn: "a", theoryCredit: 3 });
    const res = await request(app).post("/api/v1/courses").set(REG).send({ code, titleEn: "b", theoryCredit: 3 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("DUPLICATE_CODE");
  });

  it("M2TC-145: page size 101 returns 422 PAGE_SIZE_TOO_LARGE", async () => {
    const res = await request(app).get("/api/v1/courses?size=101").set(REG);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("PAGE_SIZE_TOO_LARGE");
  });

  it("M2TC-146: no login header returns 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get("/api/v1/courses");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("M2TC-147: PATCH /api/v1/courses/:id changes the English title", async () => {
    const created = await request(app).post("/api/v1/courses").set(REG)
      .send({ code: `PAT${stamp()}`, titleEn: "Old", theoryCredit: 3 });
    const res = await request(app).patch(`/api/v1/courses/${created.body.id}`).set(REG).send({ titleEn: "New" });
    expect(res.status).toBe(200);
    expect(res.body.titleEn).toBe("New");
  });

  it("M2TC-148: POST /api/v1/courses/:id/deactivate sets status INACTIVE", async () => {
    const created = await request(app).post("/api/v1/courses").set(REG)
      .send({ code: `DEA${stamp()}`, titleEn: "x", theoryCredit: 3 });
    const res = await request(app).post(`/api/v1/courses/${created.body.id}/deactivate`).set(REG);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("INACTIVE");
  });
});
