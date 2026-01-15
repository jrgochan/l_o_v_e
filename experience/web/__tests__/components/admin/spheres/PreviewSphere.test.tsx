import { render, screen } from "@testing-library/react";
import { PreviewSphere } from "@/components/admin/spheres/PreviewSphere";
import React from "react";

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: any) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: jest.fn(),
}));

// Mock BaseSphere to render children
jest.mock("@/components/admin/spheres/BaseSphere", () => ({
  BaseSphere: ({ children }: any) => {
    return (
      <div data-testid="base-sphere">{typeof children === "function" ? children() : children}</div>
    );
  },
  StandardLighting: () => <div data-testid="lighting" />,
  getColorFromCategory: () => "#ffffff",
}));

describe("PreviewSphere", () => {
  const mockEmotion = {
    id: "1",
    name: "Joy",
    category: "joy",
    vac: [0.8, 0.5, 0.7],
    definition: "Happy",
  };

  it("renders correctly with BaseSphere and children", () => {
    render(<PreviewSphere emotion={mockEmotion as any} />);
    expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("base-sphere")).toBeInTheDocument();
  });
});
