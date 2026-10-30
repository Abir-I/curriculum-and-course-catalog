import { coded } from "./errors.js";

const DEV_ACTOR_UUID = "00000000-0000-4000-8000-000000000010";

export function requireRole(actor, role) {
  if (!actor?.roles?.includes(role)) {
    throw coded("FORBIDDEN", 403);
  }
}

export function actorUuid(actor) {
  if (!actor?.id) {
    throw coded("UNAUTHENTICATED", 401);
  }

  // Production actors must provide a UUID.
  // Numeric IDs are supported only by the test/development fixtures.
  if (typeof actor.id === "string") {
    return actor.id;
  }

  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
    return DEV_ACTOR_UUID;
  }

  throw coded("INVALID_ACTOR_ID", 400);
}
