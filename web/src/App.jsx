import { useState } from "react";
import { api } from "./api.js";
import { S } from "./strings.js";
import { CourseList } from "./components/CourseList.jsx";
import { CourseForm } from "./components/CourseForm.jsx";
import { EligibilityPage } from "./components/EligibilityPage.jsx";

export default function App() {
  const [tab, setTab] = useState("courses");
  return (
    <main>
      <h1>{S.appTitle}</h1>
      <nav>
        <button onClick={() => setTab("courses")}>{S.search}</button>
        <button onClick={() => setTab("new")}>{S.newCourse}</button>
        <button onClick={() => setTab("eligibility")}>{S.checkEligibility}</button>
      </nav>
      {tab === "courses" && <CourseList api={api} />}
      {tab === "new" && <CourseForm api={api} />}
      {tab === "eligibility" && <EligibilityPage api={api} />}
    </main>
  );
}
