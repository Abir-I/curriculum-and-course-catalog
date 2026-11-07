// The real client calls Module 4 (Grading) through its API.
// Tests replace it with fakeGrading() from tests/helpers/fakes.js.
// Every call has a 3-second limit (NFR-09). The grade scale belongs to Module 4,
// so the rank of a grade (higher is better) is asked from Module 4, not decided here.
import { makeClientHolder } from "./client-holder.js";

const holder = makeClientHolder("Grading");
const TIMEOUT_MS = 3000;

function withTimeout(promise, ms = TIMEOUT_MS) {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Grading timeout")), ms);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

export const setGradingClient = holder.set;
export const passedCourses = (studentId) => withTimeout(holder.get().passedCourses(studentId));
export const inProgressCourses = (studentId) => withTimeout(holder.get().inProgressCourses(studentId));
export const stageResults = (studentId, stageId) => withTimeout(holder.get().stageResults(studentId, stageId));
export const gradeRank = (grade) => withTimeout(holder.get().gradeRank(grade));
