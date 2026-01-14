
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { MysticalEtherealPath } from "@/components/admin/paths/MysticalEtherealPath";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

// Suppress R3F tag warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      /Use PascalCase for React components/.test(args[0]) ||
      /The tag <.*> is unrecognized/.test(args[0]) ||
      /Received .* for a non-boolean attribute/.test(args[0]) ||
      /React does not recognize the .* prop/.test(args[0]) ||
      /is using incorrect casing/.test(args[0])
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

describe("MysticalEtherealPath", () => {
  const mockProps = {
    tubeGeometry: new THREE.TubeGeometry(),
    color: new THREE.Color("purple"),
    opacity: 0.7,
    isSelected: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  it("renders mesh", () => {
    const { container } = render(<MysticalEtherealPath {...mockProps} />);
    expect(container.querySelector("mesh")).toBeInTheDocument();
  });

  it("registers animation loop", () => {
    render(<MysticalEtherealPath {...mockProps} />);
    expect(useFrame).toHaveBeenCalled();
  });
});
