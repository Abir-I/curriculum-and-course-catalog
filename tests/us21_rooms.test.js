// M2TC-087 to M2TC-089
// US-21: Manage rooms (FR-40). Module 2 owns the room list.
import { describe, it, expect } from "vitest";
import { createRoom } from "../src/catalog/rooms.service.js";

const SCHEDULER = { id: 12, roles: ["SCHEDULER"] };

describe("US-21 Rooms", () => {
  it("M2TC-087: a room is saved with code, capacity and type", async () => {
    const room = await createRoom(
      { code: "LAB-101", building: "Main", roomType: "LAB", capacity: 40 },
      SCHEDULER
    );
    expect(room.code).toBe("LAB-101");
    expect(room.capacity).toBe(40);
    expect(room.roomType).toBe("LAB");
  });

  it("M2TC-088: capacity zero is refused", async () => {
    await expect(
      createRoom({ code: "ZERO-1", capacity: 0 }, SCHEDULER)
    ).rejects.toMatchObject({ code: "ROOM_CAPACITY_INVALID", status: 422 });
  });

  it("M2TC-089: a duplicate room code is refused (409)", async () => {
    await createRoom({ code: "DUP-1", capacity: 30 }, SCHEDULER);
    await expect(
      createRoom({ code: "DUP-1", capacity: 50 }, SCHEDULER)
    ).rejects.toMatchObject({ code: "DUPLICATE_CODE", status: 409 });
  });
});
