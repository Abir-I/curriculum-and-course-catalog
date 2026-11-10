// M2TC-158, 159 (FR-43, FR-10). Red first: the offerings route does not exist yet.
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REG = { "x-user-id": "00000000-0000-4000-8000-000000000011", "x-roles": "REGISTRAR" };
const TERM = "30000000-0000-4000-8000-000000000001";

describe("Offerings API (FR-43, FR-10)", () => {
  it("M2TC-158: GET /api/v1/offerings lists open offerings for a term", async () => {
    const res = await request(app).get(`/api/v1/offerings?termId=${TERM}`).set(REG);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("M2TC-159: an offering for an INACTIVE course is refused (422)", async () => {
    const res = await request(app).post("/api/v1/offerings").set(REG)
      .send({ courseId: "40000000-0000-4000-8000-000000000009", termId: TERM });
    expect(res.status).toBe(422);
  });
});
