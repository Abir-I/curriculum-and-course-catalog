// M2TC-106 to M2TC-108 (FR-51, FR-52): section capacity and deactivation.
// Module 2 asks the Registration module for seats taken and enrolments (a fake in tests).
// Written first and red until registration.client.js and section.service.js exist (Sprint 3).
import { describe, it, expect } from "vitest";
import { createSectionForTest } from "../src/scheduling/scheduling.service.js";
import { setRegistrationClient } from "../src/clients/registration.client.js";
import { setCapacity, deactivate, getSection } from "../src/scheduling/section.service.js";
import { fakeRegistration } from "./helpers/fakes.js";

const SCHEDULER = { id: 12, roles: ["SCHEDULER"] };

describe("Section capacity and deactivation", () => {
  it("M2TC-106: capacity can be changed to a number that still fits the seats taken", async () => {
    const section = await createSectionForTest({ instructorUserId: 701, capacity: 30 });
    setRegistrationClient(fakeRegistration({ occupancy: 10 }));
    await setCapacity(section.id, 20, SCHEDULER);
    expect((await getSection(section.id)).capacity).toBe(20);
  });

  it("M2TC-107: capacity below the seats already taken is refused (422)", async () => {
    const section = await createSectionForTest({ instructorUserId: 702, capacity: 30 });
    setRegistrationClient(fakeRegistration({ occupancy: 25 }));
    await expect(setCapacity(section.id, 20, SCHEDULER)).rejects.toMatchObject({
      code: "CAPACITY_BELOW_OCCUPIED",
      status: 422,
    });
    expect((await getSection(section.id)).capacity).toBe(30);
  });

  it("M2TC-108a: when Registration is down, the change is refused (503) and nothing changes", async () => {
    const section = await createSectionForTest({ instructorUserId: 703, capacity: 30 });
    setRegistrationClient(fakeRegistration({ down: true }));
    await expect(setCapacity(section.id, 20, SCHEDULER)).rejects.toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
      status: 503,
    });
    await expect(deactivate(section.id, SCHEDULER)).rejects.toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
      status: 503,
    });
    const saved = await getSection(section.id);
    expect(saved.capacity).toBe(30);
    expect(saved.isActive).toBe(true);
  });

  it("M2TC-108b: a section with enrolled students cannot be deactivated (422)", async () => {
    const section = await createSectionForTest({ instructorUserId: 704, capacity: 30 });
    setRegistrationClient(fakeRegistration({ enrolled: true }));
    await expect(deactivate(section.id, SCHEDULER)).rejects.toMatchObject({
      code: "SECTION_HAS_ENROLMENTS",
      status: 422,
    });
    expect((await getSection(section.id)).isActive).toBe(true);
  });
});
