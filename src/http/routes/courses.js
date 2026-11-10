import { Router } from "express";
import { createCourse, updateCourse, deactivateCourse } from "../../catalog/course.service.js";
import { searchCourses } from "../../catalog/course-search.service.js";
import { requireStaff } from "../guard.js";
import { wrap } from "../errors.js";
import { coded } from "../../core/errors.js";
// FR-07 to FR-11. Reads are public; every write needs a staff role (FR-47).
const router = Router();

router.get("/", wrap(async (req, res) => {
  if (!req.actor?.id) throw coded("UNAUTHENTICATED", 401);
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const size = req.query.size === undefined ? 20 : Number(req.query.size);
  const out = await searchCourses({ query: req.query.query ?? "", page, size }, req.actor);
  res.status(200).json(out);
}));

router.post("/", wrap(async (req, res) => {
  requireStaff(req);
  const course = await createCourse(req.body ?? {}, req.actor);
  res.status(201).json(course);
}));

router.patch("/:id", wrap(async (req, res) => {
  requireStaff(req);
  const course = await updateCourse(req.params.id, req.body ?? {}, req.actor);
  res.status(200).json(course);
}));

router.post("/:id/deactivate", wrap(async (req, res) => {
  requireStaff(req);
  const course = await deactivateCourse(req.params.id, req.actor);
  res.status(200).json(course);
}));

export default router;