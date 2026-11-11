// M2TC-153 and M2TC-154 (FR-11, FR-50). Run: npm test
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CourseList } from "../components/CourseList.jsx";

const fakeApi = {
  searchCourses: vi.fn(async () => ({ items: [{ id: "1", code: "CSE101", titleEn: "Intro", titleBn: "পরিচিতি", theoryCredit: 3 }] })),
};

describe("CourseList", () => {
  it("M2TC-153: typing a query calls the API and shows the course code", async () => {
    render(<CourseList api={fakeApi} />);
    fireEvent.change(screen.getByLabelText(/search/i), { target: { value: "CSE" } });
    await waitFor(() => expect(screen.getByText("CSE101")).toBeInTheDocument());
    expect(fakeApi.searchCourses).toHaveBeenCalledWith(expect.objectContaining({ query: "CSE" }));
  });

  it("M2TC-154: the Bangla title is shown when it exists", async () => {
    render(<CourseList api={fakeApi} />);
    await waitFor(() => expect(screen.getByText("পরিচিতি")).toBeInTheDocument());
  });
});
