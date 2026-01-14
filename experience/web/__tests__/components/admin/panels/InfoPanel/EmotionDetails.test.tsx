
import { render, screen } from "@testing-library/react";
import { EmotionDetails } from "@/components/admin/panels/InfoPanel/EmotionDetails";
import React from "react";
import { Canvas } from "@react-three/fiber";

// Mock R3F & Three
jest.mock("@react-three/fiber", () => ({
  ...jest.requireActual("@react-three/fiber"),
  Canvas: ({ children }: any) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: jest.fn(),
}));

jest.mock("three", () => {
  const originalThree = jest.requireActual("three");
  return {
    ...originalThree,
    Color: class { set() { } copy() { } offsetHSL() { } getHexString() { return "ffffff"; } },
    Vector3: class { set() { } lerp() { } sub() { } length() { return 1; } normalize() { } },
  };
});

// Mock Sphere Components (since they are complex R3F components)
// We verify they are rendered with correct props by mocking them as simple divs.
jest.mock("@/components/admin/spheres/CharacterSphere", () => ({
  CharacterSphere: () => <div data-testid="character-sphere" />,
}));

jest.mock("@/components/admin/spheres/PreviewSphere", () => ({
  PreviewSphere: () => <div data-testid="preview-sphere" />,
}));

describe("EmotionDetails", () => {
  const mockEmotion = {
    id: "1",
    name: "Joy",
    category: "joy",
    definition: "A feeling of great pleasure and happiness.",
    vac: [0.8, 0.6, 0.7],
    color: "#FFFF00",
  };

  beforeAll(() => {
    // Patch Element prototype for R3F components if they were real.
    // Since we mocked CharacterSphere/PreviewSphere as simple divs, patching is not strictly needed for this test file
    // but consistent with other R3F tests.
  });

  it("renders emotion name and category", () => {
    render(<EmotionDetails emotion={mockEmotion} animationMode="dynamic" />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("joy")).toBeInTheDocument();
  });

  it("renders definition", () => {
    render(<EmotionDetails emotion={mockEmotion} animationMode="dynamic" />);
    expect(screen.getByText("Definition")).toBeInTheDocument();
    expect(screen.getByText("A feeling of great pleasure and happiness.")).toBeInTheDocument();
  });

  it("renders VAC coordinates", () => {
    render(<EmotionDetails emotion={mockEmotion} animationMode="dynamic" />);
    expect(screen.getByText("Valence")).toBeInTheDocument();
    expect(screen.getByText("0.800")).toBeInTheDocument();
    expect(screen.getByText("Arousal")).toBeInTheDocument();
    expect(screen.getByText("0.600")).toBeInTheDocument();
    expect(screen.getByText("Connection")).toBeInTheDocument();
    expect(screen.getByText("0.700")).toBeInTheDocument();
  });

  it("renders spheres", () => {
    render(<EmotionDetails emotion={mockEmotion} animationMode="dynamic" />);
    expect(screen.getByTestId("character-sphere")).toBeInTheDocument();
    expect(screen.getByTestId("preview-sphere")).toBeInTheDocument();
  });

  it("renders bridge indicator for bridge emotions", () => {
    const bridgeEmotion = { ...mockEmotion, name: "Awe" }; // Awe is a bridge emotion
    render(<EmotionDetails emotion={bridgeEmotion} animationMode="dynamic" />);
    expect(screen.getByText("★ Bridge")).toBeInTheDocument();
  });
});
