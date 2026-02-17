import { render, cleanup, screen } from "@testing-library/react";
import React, { useRef } from "react";
import { LuminousEmotionNode } from "@/components/admin/emotions/LuminousEmotionNode";
import * as THREE from "three";

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  ...jest.requireActual("@react-three/fiber"),
  Canvas: ({ children }: any) => <div>{children}</div>,
  useFrame: jest.fn(),
}));

jest.mock("react", () => {
  const original = jest.requireActual("react");
  return {
    ...original,
    useRef: jest.fn().mockImplementation(original.useRef),
  };
});

import { useFrame } from "@react-three/fiber";

// Polyfill for THREE refs
Object.defineProperty(window.HTMLElement.prototype, "rotation", {
  get() {
    if (!this._rotation) this._rotation = { x: 0, y: 0, z: 0, copy: jest.fn() };
    return this._rotation;
  },
  configurable: true,
});
Object.defineProperty(window.HTMLElement.prototype, "scale", {
  get() {
    if (!this._scale)
      this._scale = { setScalar: jest.fn(), set: jest.fn(), copy: jest.fn(), x: 1, y: 1, z: 1 };
    return this._scale;
  },
  configurable: true,
});
Object.defineProperty(window.HTMLElement.prototype, "position", {
  get() {
    if (!this._position) this._position = { set: jest.fn(), copy: jest.fn(), x: 0, y: 0, z: 0 };
    return this._position;
  },
  configurable: true,
});
Object.defineProperty(window.HTMLElement.prototype, "opacity", {
  get() {
    return this._opacity ?? 1;
  },
  set(v) {
    this._opacity = v;
  },
  configurable: true,
});

afterEach(cleanup);

describe("LuminousEmotionNode", () => {
  const mockEmotion = {
    id: "awe",
    name: "Awe",
    description: "Awe",
    vac: [0.9, 0.7, 0.8] as [number, number, number],
    category: "positive",
    definition: "Awe",
    quaternion: { _x: 0, _y: 0, _z: 0, _w: 1 },
  } as any;
  const mockColor = new THREE.Color("#FFFFFF");

  // Helper to dry up test logic
  const runTest = (props: any) => {
    let frameCallback: any;
    (useFrame as jest.Mock).mockImplementation((cb) => {
      frameCallback = cb;
    });

    render(<LuminousEmotionNode {...props} />);

    // Verify elements render, implying refs attach
    expect(screen.getByTestId("luminous-group")).toBeInTheDocument();
    expect(screen.getByTestId("luminous-outer")).toBeInTheDocument();
    expect(screen.getByTestId("luminous-inner")).toBeInTheDocument();
    expect(screen.getByTestId("luminous-core")).toBeInTheDocument();

    expect(useFrame).toHaveBeenCalled();

    if (frameCallback) {
      const stateMock = { clock: { elapsedTime: 1.0 } };
      // Run twice to ensure time progression
      frameCallback(stateMock);
      stateMock.clock.elapsedTime = 2.0;
      frameCallback(stateMock);
    }
  };

  it("renders and executes frame loop (default)", () => {
    runTest({
      emotion: mockEmotion,
      color: mockColor,
      size: 1,
      isSelected: true,
      isHovered: false,
    });
  });

  it("renders and executes frame loop (selected=false, hovered=true)", () => {
    runTest({
      emotion: mockEmotion,
      color: mockColor,
      size: 1,
      isSelected: false,
      isHovered: true,
    });
  });

  it("renders and executes frame loop (selected=false, hovered=false)", () => {
    runTest({
      emotion: mockEmotion,
      color: mockColor,
      size: 1,
      isSelected: false,
      isHovered: false,
    });
  });

  it("renders checks color adaptation for high arousal", () => {
    const highArousalEmotion = { ...mockEmotion, vac: [0.9, 0.8, 0.8] };
    runTest({
      emotion: highArousalEmotion as any,
      color: mockColor,
      size: 1,
      isSelected: true,
      isHovered: false,
    });
  });

  it("renders checks color adaptation for low arousal", () => {
    const lowArousalEmotion = { ...mockEmotion, vac: [-0.9, -0.8, 0.8] };
    runTest({
      emotion: lowArousalEmotion as any,
      color: mockColor,
      size: 1,
      isSelected: true,
      isHovered: false,
    });
  });

  it("renders checks color adaptation for neutral arousal", () => {
    const neutralArousalEmotion = { ...mockEmotion, vac: [0.9, 0.0, 0.8] };
    runTest({
      emotion: neutralArousalEmotion as any,
      color: mockColor,
      size: 1,
      isSelected: true,
      isHovered: false,
    });
  });

  it("handles missing refs in frame loop", () => {
    let frameCallback: any;
    (useFrame as jest.Mock).mockImplementation((cb) => {
      frameCallback = cb;
    });

    // Refs: coreRef, glowRef, outerGlowRef, glowMatRef, outerGlowMatRef, modeConfig, enhancedColor...
    // Actually modeConfig and enhancedColor are useMemos, so useRef mock order matters for the component body refs.
    // Order: coreRef, glowRef, outerGlowRef, glowMatRef, outerGlowMatRef

    const coreRef = { current: { scale: { setScalar: jest.fn() }, position: { y: 0 } } };
    const glowRef = { current: { scale: { setScalar: jest.fn() }, position: { y: 0 } } };
    const outerGlowRef = { current: { scale: { setScalar: jest.fn() }, position: { y: 0 } } };
    const glowMatRef = { current: { opacity: 1 } };
    const outerGlowMatRef = { current: { opacity: 1 } };

    (useRef as jest.Mock)
      .mockReturnValueOnce(coreRef)
      .mockReturnValueOnce(glowRef)
      .mockReturnValueOnce(outerGlowRef)
      .mockReturnValueOnce(glowMatRef)
      .mockReturnValueOnce(outerGlowMatRef);

    render(
      <LuminousEmotionNode
        emotion={mockEmotion as any}
        color={mockColor}
        size={1}
        isSelected={false}
        isHovered={false}
      />
    );

    // Case 1: All refs null
    coreRef.current = null as any;
    glowRef.current = null as any;
    outerGlowRef.current = null as any;
    glowMatRef.current = null as any;
    outerGlowMatRef.current = null as any;

    const stateMock = { clock: { elapsedTime: 1.0 } };
    expect(() => frameCallback(stateMock)).not.toThrow();

    // Case 2: Partial refs (e.g. only core exists) to hit mixed branches
    coreRef.current = { scale: { setScalar: jest.fn() }, position: { y: 0 } } as any;
    // others still null
    expect(() => frameCallback(stateMock)).not.toThrow();
    expect(coreRef.current.scale.setScalar).toHaveBeenCalled();

    (useRef as jest.Mock).mockImplementation(jest.requireActual("react").useRef);
  });
});
