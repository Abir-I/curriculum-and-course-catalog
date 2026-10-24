// Test helper (written with the tests; the database layer does not exist yet)
import { createUnit } from "../../src/structure/unit.service.js";
export async function seedProgram() {
  const u = await createUnit({ unitType: "PROGRAM", code: `PRG-${Date.now()}-${Math.random()}`,
    nameEn: "BSc CSE", termPattern: "TRIMESTER" }, { id: 10, roles: ["INSTITUTION_ADMIN"] });
  return u.id;
}
