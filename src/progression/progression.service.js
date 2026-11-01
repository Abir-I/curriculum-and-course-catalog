import { prisma } from "../core/prisma.js";
import { passedCourses, stageResults } from "../clients/grading.client.js";
import { resolvePolicy } from "../policy/policy.service.js";

// PROMOTE only when every rule is met. Missing input gives REVIEW, never PROMOTE.
export async function evaluate(studentId, stageId) {
  const stage = await prisma.academicStage.findUnique({ where: { id: stageId } });
  const rules = await resolvePolicy("PROGRESSION_RULES", stage.programId, new Date());
  if (!rules) return { result: "REVIEW", reasons: ["no progression rules"] };

  const passed = await passedCourses(studentId);
  const results = await stageResults(studentId, stageId);
  const reasons = [];
  let result = "PROMOTE";

  const credits = passed.reduce((sum, c) => sum + (c.credits ?? 0), 0);
  reasons.push(`credits ${credits} >= ${rules.minCredits}`);
  if (credits < rules.minCredits) result = "REPEAT";

  const failed = passed.filter((c) => c.grade === "F").length;
  reasons.push(`failed courses ${failed} <= ${rules.maxFailed}`);
  if (failed > rules.maxFailed) result = "REPEAT";

  if (rules.requireAttendance) {
    const attendance = results.attendance; // missing input is undefined
    if (attendance === undefined || attendance === null) {
      return { result: "REVIEW", reasons: [...reasons, "attendance missing"] };
    }
  }

  reasons.push(`GPA >= ${rules.minGpa}`);
  if (results.gpa !== undefined && results.gpa < rules.minGpa) result = "REPEAT";
  return { result, reasons };
}
