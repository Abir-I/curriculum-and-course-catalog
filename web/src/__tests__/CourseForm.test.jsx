// M2TC-155 and M2TC-156 (FR-07, FR-08). Run: npm test
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CourseForm } from "../components/CourseForm.jsx";

describe("CourseForm", () => {
  it("M2TC-155: a negative credit shows the rule message and does not call the API", () => {
    const api = { createCourse: vi.fn() };
    render(<CourseForm api={api} />);
    fireEvent.change(screen.getByLabelText(/code/i), { target: { value: "X1" } });
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText(/theory credit/i), { target: { value: "-1" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByText(/credit cannot be negative/i)).toBeInTheDocument();
    expect(api.createCourse).not.toHaveBeenCalled();
  });

  it("M2TC-156: a valid course is sent to the API and a confirmation is shown", async () => {
    const api = { createCourse: vi.fn(async (c) => ({ id: "9", ...c })) };
    render(<CourseForm api={api} />);
    fireEvent.change(screen.getByLabelText(/code/i), { target: { value: "CSE102" } });
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Data" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/course saved/i));
    expect(api.createCourse).toHaveBeenCalledWith(expect.objectContaining({ code: "CSE102", theoryCredit: 3 }));
  });
});
