import { prisma } from "../core/prisma.js";
import { passedCourses, inProgressCourses, gradeRank } from "../clients/grading.client.js";
import { resolvePolicy } from "../policy/policy.service.js";

// Outcome order for combining results: the worst outcome wins (FAIL > UNKNOWN > IN_PROGRESS > PASS).
const RANK = { PASS: 0, IN_PROGRESS: 1, UNKNOWN: 2, FAIL: 3 };
const worst = (a, b) => (RANK[a] >= RANK[b] ? a : b);

// Returns ELIGIBLE, ELIGIBLE_IN_PROGRESS, NOT_ELIGIBLE or UNKNOWN, with one reason per prerequisite leaf.
// The AND/OR tree is evaluated as a tree (M2D006, M2D007). A minimum grade is checked (M2D008).
// Any doubt gives UNKNOWN, never a guess. Nothing about the student is stored.
export async function check({ studentId, courseId }) {
  let passed;
  let inProg;
  try {
    [passed, inProg] = await Promise.all([passedCourses(studentId), inProgressCourses(studentId)]);
  } catch (e) {
    return { result: "UNKNOWN", reasons: ["Grading service unavailable"], stored: false };
  }

  const allowInProgress = (await resolvePolicy("IN_PROGRESS_ALLOWED", null, new Date()))?.allowed === true;

  // Every prerequisite node of every curriculum placement of this course.
  const items = await prisma.curriculumItem.findMany({ where: { courseId }, select: { id: true } });
  if (items.length === 0) return { result: "ELIGIBLE", reasons: ["no prerequisites"], stored: false };

  let overall = "PASS";
  const reasons = [];
  for (const item of items) {
    const rules = await prisma.prerequisiteRule.findMany({
      where: { curriculumItemId: item.id, ruleKind: "PREREQUISITE" },
      include: { course: true },
    });
    if (rules.length === 0) {
      reasons.push("no prerequisites");
      continue;
    }
    const roots = rules.filter((r) => r.parentNodeId === null);
    if (roots.length !== 1) return { result: "UNKNOWN", reasons: ["prerequisite tree has no single root"], stored: false };
    const evalNode = async (node) => {
      if (node.nodeType === "COURSE") return evalCourse(node);
      const kids = rules.filter((r) => r.parentNodeId === node.id);
      if (kids.length === 0) return "UNKNOWN";
      const outs = [];
      for (const k of kids) outs.push(await evalNode(k));
      if (node.nodeType === "AND") return outs.reduce(worst, "PASS");
      // OR: one passing alternative is enough.
      if (outs.includes("PASS")) return "PASS";
      if (outs.includes("IN_PROGRESS")) return "IN_PROGRESS";
      if (outs.includes("UNKNOWN")) return "UNKNOWN";
      return "FAIL";
    };
    const evalCourse = async (node) => {
      const code = node.course.code;
      const row = passed.find((p) => p.code === code);
      if (row) {
        if (!node.minGrade) {
          reasons.push(`${code}: passed`);
          return "PASS";
        }
        let have;
        let need;
        try {
          have = await gradeRank(row.grade);
          need = await gradeRank(node.minGrade);
        } catch (e) {
          reasons.push(`${code}: grade scale unavailable`);
          return "UNKNOWN";
        }
        if (have < 0 || need < 0) {
          reasons.push(`${code}: grade not recognised`);
          return "UNKNOWN";
        }
        if (have >= need) {
          reasons.push(`${code}: passed with grade ${row.grade} (minimum ${node.minGrade})`);
          return "PASS";
        }
        reasons.push(`${code}: grade ${row.grade} is below the minimum ${node.minGrade}`);
        return "FAIL";
      }
      if (inProg.some((p) => p.code === code) && allowInProgress) {
        reasons.push(`${code}: in progress (allowed)`);
        return "IN_PROGRESS";
      }
      reasons.push(`${code}: missing`);
      return "FAIL";
    };
    overall = worst(overall, await evalNode(roots[0]));
  }

  const result = { PASS: "ELIGIBLE", IN_PROGRESS: "ELIGIBLE_IN_PROGRESS", UNKNOWN: "UNKNOWN", FAIL: "NOT_ELIGIBLE" }[overall];
  return { result, reasons, stored: false };
}
