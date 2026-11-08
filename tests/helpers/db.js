import { prisma } from "../../src/core/prisma.js";

// Guard for M2D010. The reset deletes every row, so it fails closed unless ALL of these hold:
//   1. M2_TEST_DATABASE=1 (set in vitest.config.js for the test run only);
//   2. the host is this machine (localhost, 127.0.0.1 or ::1), not a remote or shared server;
//   3. the database name ends in _test.
// Anything else throws before any SQL is sent.
export function assertDisposableDatabase(rawUrl = process.env.DATABASE_URL) {
  if (process.env.M2_TEST_DATABASE !== "1") {
    throw new Error("Refusing to reset: M2_TEST_DATABASE must be 1 (test runs set it in vitest.config.js).");
  }
  if (!rawUrl) throw new Error("Refusing to reset: DATABASE_URL is not set.");
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Refusing to reset: DATABASE_URL is not a valid URL.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  if (!local) throw new Error(`Refusing to reset: host "${url.hostname}" is not local.`);
  const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!/_test$/.test(name)) throw new Error(`Refusing to reset: database "${name}" does not end in _test.`);
}

// Empties every table in the test database. Guards are switched off only for this
// transaction (SET LOCAL), because the audit log refuses TRUNCATE by design.
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
