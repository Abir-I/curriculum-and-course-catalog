import { Router } from "express";
import { resolvePolicy } from "../../policy/policy.service.js";
import { prisma } from "../../core/prisma.js";
import { requireRole } from "../../core/auth.js";
import { wrap } from "../errors.js";

// FR-33 (effective-dated policy), FR-35 (most specific wins), FR-36, FR-47 (admin only to set).
const router = Router();

router.post("/", wrap(async (req, res) => {
  requireRole(req.actor, "INSTITUTION_ADMIN");
  const { policyKey, value, effectiveFrom, scopeUnitId = null } = req.body ?? {};
  const row = await prisma.academicPolicy.create({
    data: {
      policyKey,
      value,
      scopeUnitId,
      effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`),
      createdBy: req.actor.id,
    },
  });
  res.status(201).json(row);
}));

router.get("/resolve", wrap(async (req, res) => {
  const { key, unitId = null, date } = req.query;
  const out = await resolvePolicy(key, unitId, date ? new Date(`${date}T00:00:00.000Z`) : new Date());
  res.status(200).json({ value: out });
}));

export default router;
