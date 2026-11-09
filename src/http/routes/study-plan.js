import { Router } from "express";
import { buildStudyPlan } from "../../study/study-plan.service.js";
import { wrap } from "../errors.js";

const router = Router();

// FR-21: GET /api/v1/curricula/:id/study-plan (mounted in app.js). Staff only; read-only.
router.get("/:id/study-plan", wrap(async (req, res) => {
  const plan = await buildStudyPlan(req.params.id, req.actor);
  res.status(200).json({ curriculumId: req.params.id, stages: plan });
}));

export default router;
