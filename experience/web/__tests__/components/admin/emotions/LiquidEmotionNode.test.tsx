import { render, cleanup, screen } from "@testing-library/react";
import React, { useRef } from "react";
import { LiquidEmotionNode } from "@/components/admin/emotions/LiquidEmotionNode";
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
Object.defineProperty(window.HTMLElement.prototype, "sheenColor", {
  get() {
    return this._sheenColor ?? { setHSL: jest.fn() };
  },
  set(v) {
    this._sheenColor = v;
  },
  configurable: true,
});

afterEach(cleanup);

describe("LiquidEmotionNode", () => {
  const mockEmotion = {
    id: "sadness",
    name: "Sadness",
    description: "Blue",
    vac: [-0.5, -0.2, 0.5] as [number, number, number],
    category: "negative",
    definition: "Sad",
    quaternion: { _x: 0, _y: 0, _z: 0, _w: 1 },
  } as any;
  const mockColor = new THREE.Color("#0000FF");

  const runFrameLoopTest = (props: any) => {
    // Capture frame callback
    let frameCallback: any;
    (useFrame as jest.Mock).mockImplementation((cb) => {
      frameCallback = cb;
    });

    render(<LiquidEmotionNode {...props} />);

    // Verify elements render, implying refs attach
    expect(screen.getByTestId("liquid-group")).toBeInTheDocument();
    expect(screen.getByTestId("liquid-body")).toBeInTheDocument();
    expect(screen.getByTestId("liquid-core")).toBeInTheDocument();
    expect(screen.getByTestId("liquid-material")).toBeInTheDocument();

    // Halo only shows if selected or hovered
    if (props.isSelected || props.isHovered) {
      expect(screen.getByTestId("liquid-halo")).toBeInTheDocument();
    }

    expect(useFrame).toHaveBeenCalled();
    if (frameCallback) {
      const stateMock = { clock: { elapsedTime: 1.0 } };
      // Execute frame logic directly to ensure no errors
      frameCallback(stateMock);

      // Execute again for animations
      stateMock.clock.elapsedTime = 2.0;
      frameCallback(stateMock);
    }
  };

  it("executes frame loop (selected=true, hovered=true)", () => {
    runFrameLoopTest({
      emotion: mockEmotion,
      color: mockColor,
      size: 1,
      isSelected: true,
      isHovered: true,
    });
  });

  it("executes frame loop (selected=true, hovered=false)", () => {
    runFrameLoopTest({
      emotion: mockEmotion,
      color: mockColor,
      size: 1,
      isSelected: true,
      isHovered: false,
    });
  });

  it("executes frame loop (selected=false, hovered=true)", () => {
    runFrameLoopTest({
      emotion: mockEmotion,
      color: mockColor,
      size: 1,
      isSelected: false,
      isHovered: true,
    });
  });

  it("executes frame loop (selected=false, hovered=false)", () => {
    runFrameLoopTest({
      emotion: mockEmotion,
      color: mockColor,
      size: 1,
      isSelected: false,
      isHovered: false,
    });
  });
  it("handles missing refs in frame loop", () => {
    let frameCallback: any;
    (useFrame as jest.Mock).mockImplementation((cb) => {
      frameCallback = cb;
    });

    // Refs in order: bodyRef, coreRef, bodyMatRef, modeConfig, enhancedColor...
    // Mocks for: bodyRef, coreRef, bodyMatRef
    const bodyRef = {
      current: { scale: { set: jest.fn() }, position: { y: 0 }, rotation: { x: 0, y: 0 } },
    };
    const coreRef = { current: { scale: { setScalar: jest.fn() }, position: { y: 0 } } };
    const bodyMatRef = { current: { opacity: 1, sheenColor: { setHSL: jest.fn() } } };
    const fallbackRef = { current: null };

    (useRef as jest.Mock)
      .mockReturnValueOnce(bodyRef)
      .mockReturnValueOnce(coreRef)
      .mockReturnValueOnce(bodyMatRef)
      .mockReturnValue(fallbackRef);

    render(
      <LiquidEmotionNode
        emotion={mockEmotion as any}
        color={mockColor}
        size={1}
        isSelected={false}
        isHovered={false}
      />
    );

    const stateMock = { clock: { elapsedTime: 1.0 } };

    // 1. All null
    bodyRef.current = null as any;
    coreRef.current = null as any;
    bodyMatRef.current = null as any;

    expect(() => frameCallback(stateMock)).not.toThrow();

    // 2. Partial: Body exists, core null
    bodyRef.current = {
      scale: { set: jest.fn() },
      position: { y: 0 },
      rotation: { x: 0, y: 0 },
    } as any;
    coreRef.current = null as any;
    expect(() => frameCallback(stateMock)).not.toThrow();
    expect(bodyRef.current.scale.set).toHaveBeenCalled();

    // 3. Partial: Body and Core exist
    coreRef.current = { scale: { setScalar: jest.fn() }, position: { y: 0 } } as any;
    expect(() => frameCallback(stateMock)).not.toThrow();
    expect(coreRef.current.scale.setScalar).toHaveBeenCalled();

    // 4. Material exists
    bodyMatRef.current = { opacity: 1, sheenColor: { setHSL: jest.fn() } } as any;
    expect(() => frameCallback(stateMock)).not.toThrow();

    (useRef as jest.Mock).mockImplementation(jest.requireActual("react").useRef);
  });
});
