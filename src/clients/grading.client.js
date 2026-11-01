// The real client calls Module 4 (Grading) through its API.
// Tests replace it with fakeGrading() from tests/helpers/fakes.js.
let impl = null;

export function setGradingClient(c) {
  impl = c;
}

function client() {
  if (!impl) throw new Error("Grading client not configured");
  return impl;
}

export const passedCourses = (studentId) => client().passedCourses(studentId);
export const inProgressCourses = (studentId) => client().inProgressCourses(studentId);
export const stageResults = (studentId, stageId) => client().stageResults(studentId, stageId);
