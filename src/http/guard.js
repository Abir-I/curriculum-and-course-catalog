import { coded } from "../core/errors.js";

// Staff routes: no actor gives 401, a non-staff role gives 403 (S5-B1, FR-47).
export function requireStaff(req) {
  if (!req.actor?.id) throw coded("UNAUTHENTICATED", 401);
  const ok = req.actor.roles.some((r) => r === "REGISTRAR" || r === "INSTITUTION_ADMIN");
  if (!ok) throw coded("FORBIDDEN", 403);
}
