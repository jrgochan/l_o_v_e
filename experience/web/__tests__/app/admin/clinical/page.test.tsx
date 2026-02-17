import React from "react";
import { render } from "@testing-library/react";
import ClinicalPage from "@/app/admin/clinical/page";
import { ClinicalPortal } from "@/components/admin/clinical/ClinicalPortal";

// Mock the inner component
jest.mock("@/components/admin/clinical/ClinicalPortal", () => ({
  ClinicalPortal: jest.fn(() => <div data-testid="clinical-portal">Portal Content</div>),
}));

describe("ClinicalPage", () => {
  it("renders ClinicalPortal", () => {
    render(<ClinicalPage />);
    expect(screen.getByTestId("clinical-portal")).toBeInTheDocument();
  });
});

import { screen } from "@testing-library/react";
