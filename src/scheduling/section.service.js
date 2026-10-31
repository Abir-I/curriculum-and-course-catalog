import { prisma } from "../core/prisma.js";
import { coded, mapDbError } from "../core/errors.js";
import { occupancy, enrolmentStatus } from "../clients/registration.client.js";

export async function getSection(id) {
  return prisma.courseSection.findUnique({ where: { id } });
}

// Capacity cannot go below the seats already taken (FR-51).
// If Registration cannot answer, nothing changes (503).
export async function setCapacity(sectionId, capacity, actor) {
  let seats;
  try {
    seats = await occupancy(sectionId);
  } catch (err) {
    throw coded("DEPENDENCY_UNAVAILABLE", 503);
  }
  if (capacity < seats) throw coded("CAPACITY_BELOW_OCCUPIED", 422);
  try {
    // The database refuses a capacity above the smallest booked room.
    return await prisma.courseSection.update({ where: { id: sectionId }, data: { capacity } });
  } catch (err) {
    throw mapDbError(err);
  }
}

// A section with enrolled students stays active (FR-52).
export async function deactivate(sectionId, actor) {
  let status;
  try {
    status = await enrolmentStatus(sectionId);
  } catch (err) {
    throw coded("DEPENDENCY_UNAVAILABLE", 503);
  }
  if (status.enrolled) throw coded("SECTION_HAS_ENROLMENTS", 422);
  return prisma.courseSection.update({ where: { id: sectionId }, data: { isActive: false } });
}
