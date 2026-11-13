// Development actor from request headers (Sprint 5). Module 1 replaces this later.
// Default deny: a route that calls requireRole(actor, ...) refuses requests without an actor.
// Headers: x-user-id (UUID or number in tests) and x-roles (comma-separated, e.g. "REGISTRAR,STUDENT").
export function devAuth(req, _res, next) {
  const id = req.get("x-user-id");
  const roles = (req.get("x-roles") ?? "").split(",").map((r) => r.trim()).filter(Boolean);
  req.actor = id ? { id, roles } : null;
  next();
}
