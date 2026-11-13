import { Router } from "express";
import { check } from "../../eligibility/eligibility.service.js";
import { coded } from "../../core/errors.js";
import { wrap } from "../errors.js";

const router = Router();

// FR-28, FR-31, FR-32. UNKNOWN is a normal answer (HTTP 200), never a silent pass.
router.get("/", wrap(async (req, res) => {
  if (!req.actor?.id) throw coded("UNAUTHENTICATED", 401);
  for (const name of ["studentId", "courseId", "termId"]) {
    if (!req.query[name]) {
      throw Object.assign(new Error(`Missing query parameter: ${name}`), { code: "PARAMETER_REQUIRED", status: 422 });
    }
  }
  const out = await check({ studentId: req.query.studentId, courseId: req.query.courseId });
  res.status(200).json(out);
}));

export default router;
