import { prisma } from "../../src/core/prisma.js";

// Guard (M2D010): the reset deletes every row. It runs only when the test configuration
// says so AND the database name ends with _test. Any other database is refused.
function assertDisposableDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  const name = url.split("?")[0].split("/").pop() ?? "";
  if (process.env.M2_TEST_DATABASE !== "1" || !/_test$/.test(name)) {
    throw new Error(`Refusing to reset database "${name}": tests need M2_TEST_DATABASE=1 and a database name ending in _test`);
  }
}

// Empties every table in the test database.
// The audit log refuses TRUNCATE by design, so the guards are switched off for this
// transaction only. SET LOCAL is used so the setting ends with the transaction.
export async function resetDatabase() {
  assertDisposableDatabase();
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
