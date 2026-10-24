// US-12: Stop room and teacher clashes (FR-41, FR-42). Module 2 owns this check.
// Student-level overlaps are NOT tested here; they belong to Module 3 (M3FR003).
// M2TC-023 to M2TC-025
import { describe, it, expect } from "vitest";
import { addSlot } from "../src/scheduling/scheduling.service.js";
import { seedRoomAndSection } from "./helpers/scheduling-fixtures.js";

const SCHEDULER = { id: 12, roles: ["SCHEDULER"] };

describe("US-12 Room and teacher clashes", () => {
  it("M2TC-023: a room already booked at an overlapping time is refused (409)", async () => {
    const { roomId, sectionA, sectionB } = await seedRoomAndSection({ roomCapacity: 60, sectionCapacity: 40 });
    await addSlot(sectionA, { roomId, day: 1, startMin: 540, endMin: 630 }, SCHEDULER); // Mon 09:00-10:30
    await expect(
      addSlot(sectionB, { roomId, day: 1, startMin: 600, endMin: 660 }, SCHEDULER) // Mon 10:00-11:00
    ).rejects.toMatchObject({ code: "ROOM_CLASH", status: 409 });
  });

  it("M2TC-024: the same teacher in two rooms at an overlapping time is refused (409)", async () => {
    const { roomId, otherRoomId, sectionA, sectionB } = await seedRoomAndSection({
      roomCapacity: 60, sectionCapacity: 40, sameInstructor: true });
    await addSlot(sectionA, { roomId, day: 2, startMin: 540, endMin: 630 }, SCHEDULER);
    await expect(
      addSlot(sectionB, { roomId: otherRoomId, day: 2, startMin: 600, endMin: 660 }, SCHEDULER)
    ).rejects.toMatchObject({ code: "INSTRUCTOR_CLASH", status: 409 });
  });

  it("M2TC-025: adjacent slots (10:30 ends, 10:30 starts) are both accepted", async () => {
    const { roomId, sectionA, sectionB } = await seedRoomAndSection({ roomCapacity: 60, sectionCapacity: 40 });
    await addSlot(sectionA, { roomId, day: 3, startMin: 540, endMin: 630 }, SCHEDULER);
    const ok = await addSlot(sectionB, { roomId, day: 3, startMin: 630, endMin: 690 }, SCHEDULER);
    expect(ok.id).toBeDefined();
  });
});
