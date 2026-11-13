// Fake clients for the other modules. Module 2 never calls a real module in tests.

// Registration: fakeRegistration({ occupancy: 12, enrolled: false }) answers normally,
// fakeRegistration({ down: true }) fails every call, like a module that is down.
export function fakeRegistration({ occupancy = 0, enrolled = false, down = false } = {}) {
  const fail = () => Promise.reject(new Error("Registration module unavailable"));
  return {
    occupancy: down ? fail : async () => occupancy,
    enrolmentStatus: down ? fail : async () => ({ enrolled }),
  };
}

// Grading: courses are plain objects such as { code: "CSE101", credits: 3, grade: "A" }.
// The grade scale belongs to Module 4; this fake only ranks the grades it knows (higher is better).
const GRADE_ORDER = ["F", "D", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+"];
export function fakeGrading({ passed = [], inProgress = [], stage = {}, fail = false } = {}) {
  const down = () => Promise.reject(new Error("Grading module unavailable"));
  return {
    passedCourses: fail ? down : async () => passed,
    inProgressCourses: fail ? down : async () => inProgress,
    stageResults: fail ? down : async () => stage,
    gradeRank: async (grade) => GRADE_ORDER.indexOf(grade),
  };
}
