import { Router } from "express";
import { createCourse, updateCourse, deactivateCourse } from "../../catalog/course.service.js";
import { searchCourses } from "../../catalog/course-search.service.js";
import { wrap } from "../errors.js";

// Routes for FR-07 to FR-11. Business rules stay in the services; routes only translate HTTP.
const router = Router();

router.get("/", wrap(async (req, res) => {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const size = req.query.size === undefined ? 20 : Number(req.query.size);
  const out = await searchCourses({ query: req.query.query ?? "", page, size }, req.actor);
  res.status(200).json(out);
}));

router.post("/", wrap(async (req, res) => {
  const course = await createCourse(req.body ?? {}, req.actor);
  res.status(201).json(course);
}));

router.patch("/:id", wrap(async (req, res) => {
  const course = await updateCourse(req.params.id, req.body ?? {}, req.actor);
  res.status(200).json(course);
}));

router.post("/:id/deactivate", wrap(async (req, res) => {
  const course = await deactivateCourse(req.params.id, req.actor);
  res.status(200).json(course);
}));

export default router;
