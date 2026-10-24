// Test helper (written with the tests; the scheduling module does not exist yet)
import { createRoom, createSectionForTest } from "../../src/scheduling/scheduling.service.js";
export async function seedRoomAndSection({ roomCapacity, sectionCapacity, sameInstructor = false }) {
  const roomId = (await createRoom({ code: `R-${Math.random()}`, capacity: roomCapacity })).id;
  const otherRoomId = (await createRoom({ code: `R2-${Math.random()}`, capacity: roomCapacity })).id;
  const sectionA = (await createSectionForTest({ instructorUserId: 501, capacity: sectionCapacity })).id;
  const sectionB = (await createSectionForTest({ instructorUserId: sameInstructor ? 501 : 502, capacity: sectionCapacity })).id;
  return { roomId, otherRoomId, sectionA, sectionB };
}
