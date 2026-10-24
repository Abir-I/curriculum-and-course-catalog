import { beforeEach, afterAll } from "vitest";
import { resetDatabase, closeDatabase } from "./db.js";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeDatabase();
});
