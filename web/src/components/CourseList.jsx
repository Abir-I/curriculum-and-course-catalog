import { useEffect, useState } from "react";
import { S } from "../strings.js";

// FR-11 and FR-50: search by code or title; shows the Bangla title when it exists.
export function CourseList({ api }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.searchCourses({ query }).then((out) => {
      if (!cancelled) setItems(out.items ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [query, api]);

  return (
    <section>
      <label htmlFor="course-search">{S.search}</label>
      <input id="course-search" value={query} onChange={(e) => setQuery(e.target.value)} />
      {items.length === 0 ? <p>{S.noResults}</p> : (
        <table>
          <thead>
            <tr><th>{S.code}</th><th>{S.title}</th><th>{S.credits}</th></tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.code}</td>
                <td>{c.titleBn || c.titleEn}</td>
                <td>{c.theoryCredit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
