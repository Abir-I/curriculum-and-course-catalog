import { Router } from "express";
import { setCapacity, deactivate } from "../../scheduling/section.service.js";
import { requireStaff } from "../guard.js";
import { wrap } from "../errors.js";

// FR-51 (capacity), FR-52 (deactivate). The service enforces the rules and maps dependency failures to 503.
const router = Router();

router.patch("/:id/capacity", wrap(async (req, res) => {
  requireStaff(req);
  const section = await setCapacity(req.params.id, Number(req.body?.capacity), req.actor);
  res.status(200).json(section);
}));

router.post("/:id/deactivate", wrap(async (req, res) => {
  requireStaff(req);
  const section = await deactivate(req.params.id, req.actor);
  res.status(200).json(section);
}));

export default router;
