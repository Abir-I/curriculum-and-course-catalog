// US-01: Set the institution type (FR-01, SEC-02)
// M2TC-001 to M2TC-003
import { describe, it, expect } from "vitest";
import { setInstitutionType } from "../src/policy/policy.service.js";

const ADMIN = { id: 10, roles: ["INSTITUTION_ADMIN"] };
const REGISTRAR = { id: 11, roles: ["REGISTRAR"] };

describe("US-01 Set the institution type", () => {
  it("M2TC-001: stores SCHOOL, COLLEGE or UNIVERSITY as a policy with a start date", async () => {
    // Given an Institution Admin, When they choose COLLEGE from 2026-01-01
    const saved = await setInstitutionType({ type: "COLLEGE", effectiveFrom: "2026-01-01" }, ADMIN);
    // Then the policy row exists with the chosen type and start date
    expect(saved.policyKey).toBe("INSTITUTION_TYPE");
    expect(saved.value).toEqual({ type: "COLLEGE" });
    expect(saved.effectiveFrom).toBe("2026-01-01");
  });

  it("M2TC-002: refuses any value other than SCHOOL, COLLEGE or UNIVERSITY", async () => {
    await expect(
      setInstitutionType({ type: "ACADEMY", effectiveFrom: "2026-01-01" }, ADMIN)
    ).rejects.toMatchObject({ code: "INVALID_INSTITUTION_TYPE" });
  });

  it("M2TC-003: refuses the change when the caller is not an Institution Admin (403)", async () => {
    await expect(
      setInstitutionType({ type: "SCHOOL", effectiveFrom: "2026-01-01" }, REGISTRAR)
    ).rejects.toMatchObject({ status: 403 });
  });
});
