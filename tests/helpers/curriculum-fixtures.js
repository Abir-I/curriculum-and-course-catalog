// Test helper (written with the tests; the curriculum module does not exist yet)
import { placeCourseInVersion, getCurriculumItem } from "../../src/curriculum/curriculum.service.js";
export async function createVersionWithCourse({ courseId, status }) {
  const r = await placeCourseInVersion({ courseId, status });
  return { itemId: r.itemId };
}
export async function getPlacedItem(itemId) {
  return getCurriculumItem(itemId);
}
