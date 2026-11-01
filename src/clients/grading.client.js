// The real client calls Module 4 (Grading) through its API.
// Tests replace it with fakeGrading() from tests/helpers/fakes.js.
import { makeClientHolder } from "./client-holder.js";

const holder = makeClientHolder("Grading");

export const setGradingClient = holder.set;
export const passedCourses = (studentId) => holder.get().passedCourses(studentId);
export const inProgressCourses = (studentId) => holder.get().inProgressCourses(studentId);
export const stageResults = (studentId, stageId) => holder.get().stageResults(studentId, stageId);
