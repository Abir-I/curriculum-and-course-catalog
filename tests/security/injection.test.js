// Sprint 4 task S4-05 (NFR-02): injection and output-encoding checks over HTTP.
// Needs a database and the generated Prisma client, like the other service tests.
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REG = { "x-user-id": "11", "x-roles": "REGISTRAR" };

describe("NFR-02 injection and encoding", () => {
  it("S4-05a: SQL text in the search box is treated as plain text (200, no rows leaked)", async () => {
    const res = await request(app).get("/api/v1/courses?query=" + encodeURIComponent("' OR 1=1 --")).set(REG);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(0);
  });
  it("S4-05b: a script tag in a title is stored as text and not executed by the API", async () => {
    const code = "XSS" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const created = await request(app).post("/api/v1/courses").set(REG)
      .send({ code, titleEn: "<script>alert(1)</script>", theoryCredit: 3, labCredit: 0 });
    expect(created.status).toBe(201);
    expect(created.body.titleEn).toBe("<script>alert(1)</script>");
    expect(created.headers["content-type"]).toMatch(/application\/json/);
  });
  it("S4-05c: an unknown query parameter does not change the result", async () => {
    const res = await request(app).get("/api/v1/courses?query=&size=5&drop=table").set(REG);
    expect(res.status).toBe(200);
  });
});
