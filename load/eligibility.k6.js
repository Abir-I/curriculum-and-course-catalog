// NFR-06 smoke test (Sprint 4 task S4-04, Sprint 5 task S5-N1).
// Run: k6 run load/eligibility.k6.js  (install k6 first; see the setup guide)
// Target: p95 below 300 ms for 50 requests. This is a smoke test, not a capacity test (NFR-08 is Sprint 6).
import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 5,
  iterations: 50,
  thresholds: { http_req_duration: ["p(95)<300"], http_req_failed: ["rate<0.01"] },
};

const BASE = __ENV.API || "http://localhost:3000/api/v1";
const COURSE = __ENV.COURSE_ID;
const TERM = __ENV.TERM_ID;

export default function () {
  const url = `${BASE}/eligibility?studentId=S${__ITER}&courseId=${COURSE}&termId=${TERM}`;
  const res = http.get(url, { headers: { "x-user-id": "11", "x-roles": "REGISTRAR" } });
  check(res, { "status is 200": (r) => r.status === 200, "has result": (r) => r.json("result") !== undefined });
}
