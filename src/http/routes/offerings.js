import { Router } from "express";
import { listOpen, createOffering } from "../../scheduling/offering.service.js";
import { requireStaff } from "../guard.js";
import { wrap } from "../errors.js";

// FR-43: open offerings per term; FR-10: an inactive course cannot be offered (the service refuses it).
const router = Router();

router.get("/", wrap(async (req, res) => {
  if (!req.actor?.id) throw Object.assign(new Error("login required"), { code: "UNAUTHENTICATED", status: 401 });
  const items = await listOpen(req.query.termId);
  res.status(200).json({ items });
}));

router.post("/", wrap(async (req, res) => {
  requireStaff(req);
  const offering = await createOffering(req.body ?? {}, req.actor);
  res.status(201).json(offering);
}));

export default router;
