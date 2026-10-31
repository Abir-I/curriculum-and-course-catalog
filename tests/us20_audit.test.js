// M2TC-095 (Sprint 2, writer) and M2TC-096 to M2TC-097 (Sprint 3, reader, red until then)
// US-20: Audit log (FR-48)
import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { prisma } from "../src/core/prisma.js";
import { createRoom } from "../src/catalog/rooms.service.js";
import { record, queryAudit } from "../src/audit/audit.service.js";

const SCHEDULER = { id: 12, roles: ["SCHEDULER"] };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe("US-20 Audit log", () => {
  it("M2TC-095: creating a room writes exactly one audit row", async () => {
    const room = await createRoom({ code: "AUD-1", capacity: 30 }, SCHEDULER);
    const rows = await prisma.auditLog.findMany({
      where: { entityType: "room", entityId: room.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe("CREATE");
  });

  // Sprint 3 API (assumed): queryAudit({ entityType, entityId }) returns rows, oldest first.
  it("M2TC-096: audit rows come back in time order", async () => {
    const entityId = randomUUID();
    for (const action of ["CREATE", "UPDATE", "DELETE"]) {
      await record({ actor: SCHEDULER, action, entityType: "room", entityId });
      await wait(5);
    }
    const rows = await queryAudit({ entityType: "room", entityId });
    expect(rows.map((r) => r.action)).toEqual(["CREATE", "UPDATE", "DELETE"]);
  });

  it("M2TC-097: secret fields are redacted when audit rows are read", async () => {
    const entityId = randomUUID();
    await record({
      actor: SCHEDULER,
      action: "UPDATE",
      entityType: "user",
      entityId,
      details: { password: "secret123", token: "abc", note: "kept" },
    });
    const rows = await queryAudit({ entityType: "user", entityId });
    expect(rows[0].details.password).toBe("[REDACTED]");
    expect(rows[0].details.token).toBe("[REDACTED]");
    expect(rows[0].details.note).toBe("kept");
  });
});
