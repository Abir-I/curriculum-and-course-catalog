import { prisma } from "../core/prisma.js";
import { passedCourses, inProgressCourses } from "../clients/grading.client.js";
import { resolvePolicy } from "../policy/policy.service.js";

// Returns ELIGIBLE, ELIGIBLE_IN_PROGRESS, NOT_ELIGIBLE or UNKNOWN, with one reason per prerequisite.
// If Grading cannot answer the result is UNKNOWN, never a guess. Nothing about the student is stored.
export async function check({ studentId, courseId, termId }) {
  let passed;
  let inProg;
  try {
    [passed, inProg] = await Promise.all([passedCourses(studentId), inProgressCourses(studentId)]);
  } catch (e) {
    return { result: "UNKNOWN", reasons: ["Grading service unavailable"], stored: false };
  }

  // The COURSE nodes of this course's prerequisite trees.
  const items = await prisma.curriculumItem.findMany({ where: { courseId }, select: { id: true } });
  const nodes = await prisma.prerequisiteRule.findMany({
    where: { curriculumItemId: { in: items.map((i) => i.id) }, nodeType: "COURSE" },
    include: { course: true },
  });

  const policy = await resolvePolicy("IN_PROGRESS_ALLOWED", null, new Date());
  const allowInProgress = policy?.allowed === true;

  const reasons = [];
  let result = "ELIGIBLE";
  for (const n of nodes) {
    const code = n.course.code;
    if (passed.some((p) => p.code === code)) {
      reasons.push(`${code}: passed`);
      continue;
    }
    if (inProg.some((p) => p.code === code) && allowInProgress) {
      reasons.push(`${code}: in progress (allowed)`);
      result = "ELIGIBLE_IN_PROGRESS";
      continue;
    }
    reasons.push(`${code}: missing`);
    result = "NOT_ELIGIBLE";
  }
  if (nodes.length === 0) reasons.push("no prerequisites");
  return { result, reasons, stored: false };
}
