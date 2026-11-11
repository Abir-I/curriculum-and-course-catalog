// M2TC-157 (FR-31, FR-32). Run: npm test
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EligibilityPage } from "../components/EligibilityPage.jsx";

describe("EligibilityPage", () => {
  it("M2TC-157: shows every reason, and an UNKNOWN banner when the result is UNKNOWN", async () => {
    const api = { checkEligibility: vi.fn(async () => ({ result: "UNKNOWN", reasons: ["Grading service unavailable"] })) };
    render(<EligibilityPage api={api} />);
    fireEvent.click(screen.getByRole("button", { name: /check/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/registration blocked/i));
    expect(screen.getByText("Grading service unavailable")).toBeInTheDocument();
  });
});
