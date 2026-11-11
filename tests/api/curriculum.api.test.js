// M2TC-163, 164, 165 (FR-15, FR-16, FR-26). Each test builds its own data (see beforeEach).
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/core/prisma.js";
import { resetDatabase } from "../helpers/db.js";

const REG = { "x-user-id": "00000000-0000-4000-8000-000000000011", "x-roles": "REGISTRAR" };
const UUID = "00000000-0000-4000-8000-000000000011";
let planId, versionId, itemAId, itemBId, courseAId, courseBId;

beforeEach(async () => {
  await resetDatabase();
  const prog = await prisma.academicUnit.create({ data: { unitType: "PROGRAM", code: "P-CUR", nameEn: "Curr", termPattern: "SEMESTER" } });
  const plan = await prisma.degreePlan.create({ data: { planCode: "1001", programId: prog.id, nameEn: "CSE" } });
  const cur = await prisma.curriculum.create({ data: { programId: prog.id, degreePlanId: plan.id, versionNo: 1, cohortStartYear: 2026, cohortEndYear: 2029, preparedBy: UUID } });
  const a = await prisma.course.create({ data: { code: "CUR-A", titleEn: "A", theoryCredit: 3, labCredit: 0 } });
  const b = await prisma.course.create({ data: { code: "CUR-B", titleEn: "B", theoryCredit: 3, labCredit: 0 } });
  const itemA = await prisma.curriculumItem.create({ data: { curriculumId: cur.id, itemType: "COURSE", courseId: a.id } });
  const itemB = await prisma.curriculumItem.create({ data: { curriculumId: cur.id, itemType: "COURSE", courseId: b.id } });
  planId = plan.id; versionId = cur.id;
  itemAId = itemA.id; itemBId = itemB.id; courseAId = a.id; courseBId = b.id;
});

describe("Curriculum API (FR-15, FR-16, FR-26)", () => {
  it("M2TC-163: a second version of the same plan gets code 1001-v2 (201)", async () => {
    const res = await request(app).post("/api/v1/curricula").set(REG)
      .send({ planId, cohortStartYear: 2030, cohortEndYear: 2033 });
    expect(res.status).toBe(201);
    expect(res.body.versionCode).toBe("1001-v2");
  });

  it("M2TC-164: an unknown group type is refused (422)", async () => {
    const res = await request(app).post(`/api/v1/curricula/${versionId}/groups`).set(REG)
      .send({ groupType: "NOT_A_TYPE" });
    expect(res.status).toBe(422);
  });

  it("M2TC-165: a prerequisite cycle across two courses is refused (422 PREREQ_CYCLE)", async () => {
    // A requires B (accepted), then B requires A closes the cycle.
    await request(app).post(`/api/v1/curricula/items/${itemAId}/prerequisites`).set(REG)
      .send({ requiredCourseId: courseBId });
    const res = await request(app).post(`/api/v1/curricula/items/${itemBId}/prerequisites`).set(REG)
      .send({ requiredCourseId: courseAId });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("PREREQ_CYCLE");
  });

  it("M2TC-165b: a course that requires itself is refused (422 SELF_PREREQUISITE)", async () => {
    const res = await request(app).post(`/api/v1/curricula/items/${itemAId}/prerequisites`).set(REG)
      .send({ requiredCourseId: courseAId });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("SELF_PREREQUISITE");
  });
});
