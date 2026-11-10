import { Router } from "express";
import { queryAudit } from "../../audit/audit.service.js";
import { requireRole } from "../../core/auth.js";
import { wrap } from "../errors.js";

const router = Router();

// FR-48: admin only, rows in time order (Sprint 5 task S5-B7).
router.get("/", wrap(async (req, res) => {
  requireRole(req.actor, "INSTITUTION_ADMIN");
  const rows = await queryAudit({ entityType: req.query.entityType, entityId: req.query.entityId }, req.actor);
  res.status(200).json({ items: rows });
}));

export default router;
