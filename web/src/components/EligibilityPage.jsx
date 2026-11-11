import { useState } from "react";
import { S } from "../strings.js";

// FR-28, FR-31, FR-32: shows the result and every reason. UNKNOWN blocks registration, never a silent pass.
export function EligibilityPage({ api }) {
  const [form, setForm] = useState({ studentId: "", courseId: "", termId: "" });
  const [result, setResult] = useState(null);

  const run = async (e) => {
    e.preventDefault();
    setResult(await api.checkEligibility(form));
  };

  return (
    <section>
      <form onSubmit={run}>
        <label htmlFor="el-student">{S.studentId}</label>
        <input id="el-student" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
        <label htmlFor="el-course">{S.courseId}</label>
        <input id="el-course" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} />
        <label htmlFor="el-term">{S.termId}</label>
        <input id="el-term" value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })} />
        <button type="submit">{S.check}</button>
      </form>
      {result?.result === "UNKNOWN" && <p role="alert">{S.unknownBanner}</p>}
      {result && (
        <div>
          <p>Result: {result.result}</p>
          <ul>{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
