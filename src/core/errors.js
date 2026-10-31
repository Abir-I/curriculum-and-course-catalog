// Turns database and Prisma errors into the API error codes used by the tests.
// Checks are done in code first where a clear message helps the user; the database
// remains the final guard.

export function coded(code, status) {
  return Object.assign(new Error(code), { code, status });
}

// Error text raised by the Module 2 guard triggers (see migrations 0002 to 0004).
const DB_CODES = [
  "PARENT_REQUIRED", "PARENT_MUST_BE_PROGRAM", "UNIT_LOOP", "UNIT_TREE_TOO_DEEP",
  "STAGE_LOOP", "STAGE_OTHER_PROGRAM", "STAGE_CHAIN_TOO_LONG",
  "COURSE_INACTIVE", "INVALID_TRANSITION", "PUBLISHED_IMMUTABLE", "CURRICULUM_FROZEN",
  "COHORT_OVERLAP", "RULE_ON_GROUP", "SELF_PREREQUISITE", "PREREQ_CYCLE", "RULE_LOOP",
  "POLICY_IMMUTABLE", "POLICY_NOT_DELETABLE", "POLICY_END_FIXED", "POLICY_OVERLAP",
  "RELATION_NOT_DELETABLE", "RELATION_IMMUTABLE", "RELATION_END_FIXED",
  "LAB_NEEDS_THEORY_LINK", "LAB_LINK_OTHER_OFFERING", "LINK_MUST_BE_THEORY",
  "SECTION_EXCEEDS_ROOM", "ROOM_CLASH", "INSTRUCTOR_CLASH", "MEETING_TERM_MISMATCH",
  "AUDIT_APPEND_ONLY", "DEGREE_PLAN_REQUIRED", "PLAN_OTHER_PROGRAM", "PLAN_CODE_FIXED",
];

// Clashes are conflicts (409); other database rule violations are 422.
const DB_STATUS = { ROOM_CLASH: 409, INSTRUCTOR_CLASH: 409 };

export function mapDbError(err) {
  // Errors raised with RAISE EXCEPTION carry the code in the message.
  const text = `${err?.message ?? ""} ${err?.meta?.message ?? ""}`;
  const hit = DB_CODES.find((c) => text.includes(c));
  if (hit) return coded(hit, DB_STATUS[hit] ?? 422);

  // Unique violations come from Prisma as P2002. meta.target lists the columns.
  if (err?.code === "P2002") {
    const target = JSON.stringify(err.meta?.target ?? "");
    if (target.includes("seq_no")) return coded("DUPLICATE_ORDER", 409);
    if (target.includes("code")) return coded("DUPLICATE_CODE", 409);
    return coded("DUPLICATE", 409);
  }
  return err;
}
