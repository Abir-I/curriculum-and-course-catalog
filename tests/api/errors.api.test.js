// M2TC-167 (NFR-02). Every error leaves the API as { code, message, status }.
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REG = { "x-user-id": "00000000-0000-4000-8000-000000000011", "x-roles": "REGISTRAR" };

describe("Error envelope (NFR-02)", () => {
  it("M2TC-167: an unknown route returns { code, message, status }", async () => {
    const res = await request(app).get("/api/v1/does-not-exist").set(REG);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(typeof res.body.message).toBe("string");
  });
});
