import { prisma } from "../../src/core/prisma.js";

// Empties every table in the test database.
// The audit log refuses TRUNCATE by design, so the guards are switched off for this
// transaction only. SET LOCAL is used so the setting ends with the transaction.
export async function resetDatabase() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = replica");
    const rows = await tx.$queryRawUnsafe(
      "SELECT string_agg(quote_ident(tablename), ',') AS t FROM pg_tables WHERE schemaname = 'public'"
    );
    if (rows[0].t) await tx.$executeRawUnsafe(`TRUNCATE ${rows[0].t} CASCADE`);
  });
}

export async function closeDatabase() {
  await prisma.$disconnect();
}
