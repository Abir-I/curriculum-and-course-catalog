// M2TC-160, 161, 162 (FR-51, FR-52, FR-39). Registration is replaced by a fake (see tests/helpers/fakes.js).
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { setRegistrationClient } from "../../src/clients/registration.client.js";
import { fakeRegistration } from "../helpers/fakes.js";

const REG = { "x-user-id": "00000000-0000-4000-8000-000000000011", "x-roles": "REGISTRAR" };
const SECTION = "50000000-0000-4000-8000-000000000001";

describe("Sections API (FR-51, FR-52, FR-39)", () => {
  it("M2TC-160: capacity below occupied seats is refused (422)", async () => {
    setRegistrationClient(fakeRegistration({ occupancy: 12 }));
    const res = await request(app).patch(`/api/v1/sections/${SECTION}/capacity`).set(REG).send({ capacity: 0 });
    expect(res.status).toBe(422);
  });

  it("M2TC-161: deactivating a section with enrolments is refused (422)", async () => {
    setRegistrationClient(fakeRegistration({ enrolled: true }));
    const res = await request(app).post(`/api/v1/sections/${SECTION}/deactivate`).set(REG);
    expect(res.status).toBe(422);
  });

  it("M2TC-162: Registration down gives 503 DEPENDENCY_UNAVAILABLE", async () => {
    setRegistrationClient(fakeRegistration({ down: true }));
    const res = await request(app).patch(`/api/v1/sections/${SECTION}/capacity`).set(REG).send({ capacity: 40 });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("DEPENDENCY_UNAVAILABLE");
  });
});
