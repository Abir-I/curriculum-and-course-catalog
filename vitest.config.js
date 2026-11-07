import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Every test starts from an empty database (see tests/helpers/setup.js).
    setupFiles: ["tests/helpers/setup.js"],
    // One database is shared, so test files must run one after another.
    fileParallelism: false,
    testTimeout: 20000,
    // Required by tests/helpers/db.js before any reset is allowed (M2D010).
    env: { M2_TEST_DATABASE: "1" },
  },
});
