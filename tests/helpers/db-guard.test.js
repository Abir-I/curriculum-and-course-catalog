// M2D010 regression: the reset guard must refuse every unsafe target. Pure function, no database needed.
import { describe, it, expect } from "vitest";
import { assertDisposableDatabase } from "./db.js";

const ok = "postgresql://postgres:x@localhost:5432/ars_module2_test";
describe("M2D010 reset guard", () => {
  it("accepts a local _test database when the test flag is set", () => {
    process.env.M2_TEST_DATABASE = "1";
    expect(() => assertDisposableDatabase(ok)).not.toThrow();
  });
  it("refuses a dev database name", () => {
    process.env.M2_TEST_DATABASE = "1";
    expect(() => assertDisposableDatabase(ok.replace("_test", "_dev"))).toThrow(/_test/);
  });
  it("refuses a remote host even with a _test name", () => {
    process.env.M2_TEST_DATABASE = "1";
    expect(() => assertDisposableDatabase("postgresql://u:p@db.example.com:5432/ars_test")).toThrow(/not local/);
  });
  it("refuses when the test flag is missing", () => {
    delete process.env.M2_TEST_DATABASE;
    expect(() => assertDisposableDatabase(ok)).toThrow(/M2_TEST_DATABASE/);
    process.env.M2_TEST_DATABASE = "1";
  });
});
