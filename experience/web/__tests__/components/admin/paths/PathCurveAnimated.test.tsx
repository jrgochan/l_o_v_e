
import { render, screen } from "@testing-library/react";
import { PathCurveAnimated } from "@/components/admin/paths/PathCurveAnimated";
import * as THREE from "three";

// Mock Child Components
jest.mock("@/components/admin/paths/SubtleElegantPath", () => ({
  SubtleElegantPath: () => <div data-testid="subtle-path" />,
}));
jest.mock("@/components/admin/paths/DynamicPlayfulPath", () => ({
  DynamicPlayfulPath: () => <div data-testid="dynamic-path" />,
}));
jest.mock("@/components/admin/paths/MysticalEtherealPath", () => ({
  MysticalEtherealPath: () => <div data-testid="mystical-path" />,
}));

describe("PathCurveAnimated", () => {
  const mockProps = {
    mode: "subtle" as const,
    tubeGeometry: new THREE.TubeGeometry(),
    color: new THREE.Color("blue"),
    opacity: 0.5,
    isSelected: false,
  };

  it("renders Subtle path by default", () => {
    render(<PathCurveAnimated {...mockProps} />);
    expect(screen.getByTestId("subtle-path")).toBeInTheDocument();
  });

  it("renders Dynamic path when mode is dynamic", () => {
    render(<PathCurveAnimated {...mockProps} mode="dynamic" />);
    expect(screen.getByTestId("dynamic-path")).toBeInTheDocument();
  });

  it("renders Mystical path when mode is mystical", () => {
    render(<PathCurveAnimated {...mockProps} mode="mystical" />);
    expect(screen.getByTestId("mystical-path")).toBeInTheDocument();
  });
});
