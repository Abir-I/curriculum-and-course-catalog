import { Router } from "express";
import { createRoom } from "../../catalog/rooms.service.js";
import { wrap } from "../errors.js";

const router = Router();

// FR-40: rooms with capacity.
router.post("/", wrap(async (req, res) => {
  const room = await createRoom(req.body ?? {}, req.actor);
  res.status(201).json(room);
}));

export default router;
