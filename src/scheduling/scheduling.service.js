// src/scheduling/scheduling.service.js
// Replace the whole file with this version.
// Fixes: missing imports (prisma, coded, mapDbError), missing teacherUuid(), missing addSlot(),
// and the createRoom re-export that tests/helpers/scheduling-fixtures.js imports from here.
import { prisma } from "../core/prisma.js";
import { coded, mapDbError } from "../core/errors.js";

// One place for the room function. Tests import it from this file.
export { createRoom } from "../catalog/rooms.service.js";

// A numeric teacher id (e.g. 501) becomes a fixed UUID, so the same number is the same teacher.
function teacherUuid(n) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

// Test helper: one section with its own course and offering.
// If termId is given, the section uses that term. Clashes only happen inside one term,
// so tests that need a clash must pass the same termId to both sections.
export async function createSectionForTest({ instructorUserId, capacity, termId }) {
  const stamp = `${Date.now()}-${Math.random()}`;

  const resolvedTermId =
    termId ??
    (
      await prisma.academicTerm.create({
        data: { termType: "SEMESTER", sessionLabel: `FIX-${stamp}`, nameEn: "Fixture" },
      })
    ).id;

  const course = await prisma.course.create({
    data: { code: `FIX-${stamp}`, titleEn: "Fixture", theoryCredit: 3, labCredit: 0 },
  });

  const offering = await prisma.courseOffering.create({
    data: { courseId: course.id, termId: resolvedTermId, status: "OPEN" },
  });

  const section = await prisma.courseSection.create({
    data: {
      offeringId: offering.id,
      sectionCode: "A",
      sectionType: "THEORY",
      instructorUserId: teacherUuid(instructorUserId),
      capacity,
    },
  });

  return { ...section, termId: resolvedTermId };
}

// Books one weekly slot. The database trigger refuses room and teacher clashes (409).
export async function addSlot(sectionId, { roomId, day, startMin, endMin }, actor) {
  const section = await prisma.courseSection.findUnique({
    where: { id: sectionId },
    include: { offering: true },
  });
  if (!section) throw coded("SECTION_NOT_FOUND", 404);

  try {
    return await prisma.sectionMeeting.create({
      data: {
        sectionId,
        roomId,
        termId: section.offering.termId,
        dayOfWeek: day,
        startMinute: startMin,
        endMinute: endMin,
      },
    });
  } catch (err) {
    throw mapDbError(err);
  }
}