// Thin client for /api/v1. Development headers identify the registrar until Module 1 login exists.
const DEV_HEADERS = { "x-user-id": "11", "x-roles": "REGISTRAR" };

async function request(path, options = {}) {
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...DEV_HEADERS, ...(options.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.message ?? "Request failed"), { code: body.code, status: res.status });
  return body;
}

export const api = {
  searchCourses: ({ query = "", page = 1, size = 20 } = {}) =>
    request(`/courses?query=${encodeURIComponent(query)}&page=${page}&size=${size}`),
  createCourse: (course) => request("/courses", { method: "POST", body: JSON.stringify(course) }),
  checkEligibility: ({ studentId, courseId, termId }) =>
    request(`/eligibility?studentId=${encodeURIComponent(studentId)}&courseId=${encodeURIComponent(courseId)}&termId=${encodeURIComponent(termId)}`),
};
