import { prisma } from "../core/prisma.js";
import { coded, mapDbError } from "../core/errors.js";
import { record } from "../audit/audit.service.js";

// Creates a room. Capacity must be above zero (Sprint 2, US-21).
export async function createRoom(input, actor) {
  if (!(Number(input.capacity) > 0)) throw coded("ROOM_CAPACITY_INVALID", 422);
  try {
    const room = await prisma.room.create({
      data: {
        code: input.code,
        building: input.building ?? null,
        campus: input.campus ?? null,
        roomType: input.roomType ?? "LECTURE",
        capacity: input.capacity,
      },
    });
    if (actor) {
      await record({ actor, action: "CREATE", entityType: "room", entityId: room.id, details: { code: room.code } });
    }
    return room;
  } catch (err) {
    throw mapDbError(err);
  }
}
