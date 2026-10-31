// Concurrency (race) testing: two bookings of the same room slot at the same moment (Sprint 2 extra test).
import { describe, it, expect } from "vitest";
import { createRoom, createSectionForTest, addSlot } from "../../src/scheduling/scheduling.service.js";

const SCHED = { id: 12, roles: ["SCHEDULER"] };

describe("Concurrency: room race", () => {
  it("M2TC-138: two simultaneous bookings of one room slot: exactly one succeeds, the other is ROOM_CLASH", async () => {
    const room = await createRoom({ code: `RACE-${Date.now()}`, capacity: 60 }, SCHED);
    const a = await createSectionForTest({ instructorUserId: 601, capacity: 30 });
    const b = await createSectionForTest({ instructorUserId: 602, capacity: 30, termId: a.termId });
    const slot = { roomId: room.id, day: 2, startMin: 540, endMin: 600 };
    const results = await Promise.allSettled([addSlot(a.id, slot, SCHED), addSlot(b.id, slot, SCHED)]);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const clash = results.filter((r) => r.status === "rejected" && r.reason.code === "ROOM_CLASH").length;
    expect(ok).toBe(1);
    expect(clash).toBe(1);
  });
});
