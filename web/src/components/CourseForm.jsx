import { useState } from "react";
import { S } from "../strings.js";

// FR-07 and FR-08: credits only. Marks belong to Module 4 (decision DV-02), so there is no marks field.
export function CourseForm({ api, onSaved }) {
  const [form, setForm] = useState({ code: "", titleEn: "", titleBn: "", theoryCredit: 3, labCredit: 0 });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = S.codeRequired;
    if (!form.titleEn.trim()) e.titleEn = S.titleRequired;
    if (Number(form.theoryCredit) < 0 || Number(form.labCredit) < 0) e.credit = S.creditNegative;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const saved = await api.createCourse({ ...form, theoryCredit: Number(form.theoryCredit), labCredit: Number(form.labCredit) });
    setMessage(S.saved);
    onSaved?.(saved);
  };

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="course-code">{S.code}</label>
      <input id="course-code" value={form.code} onChange={set("code")} />
      {errors.code && <p role="alert">{errors.code}</p>}
      <label htmlFor="course-title-en">{S.title}</label>
      <input id="course-title-en" value={form.titleEn} onChange={set("titleEn")} />
      {errors.titleEn && <p role="alert">{errors.titleEn}</p>}
      <label htmlFor="course-title-bn">Bangla title</label>
      <input id="course-title-bn" value={form.titleBn} onChange={set("titleBn")} />
      <label htmlFor="course-theory">Theory credit</label>
      <input id="course-theory" type="number" step="0.5" value={form.theoryCredit} onChange={set("theoryCredit")} />
      <label htmlFor="course-lab">Lab credit</label>
      <input id="course-lab" type="number" step="0.5" value={form.labCredit} onChange={set("labCredit")} />
      {errors.credit && <p role="alert">{errors.credit}</p>}
      <button type="submit">{S.save}</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
