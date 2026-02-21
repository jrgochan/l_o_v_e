import { render, cleanup, screen } from "@testing-library/react";
import React, { useRef } from "react";
import { GlitchEmotionNode } from "@/components/admin/emotions/GlitchEmotionNode";
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

// Polyfill for THREE refs in JSDOM
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
    if (!this._position)
      this._position = {
        set: jest.fn(),
        copy: jest.fn(),
        x: 0,
        y: 0,
        z: 0,
        multiplyScalar: jest.fn(),
      };
    return this._position;
  },
  configurable: true,
});

afterEach(cleanup);

describe("GlitchEmotionNode", () => {
  const mockEmotion = {
    id: "fear",
    name: "Fear",
    description: "Anxiety",
    vac: [0.2, 0.8, 0.3] as [number, number, number],
    category: "negative",
    definition: "Scary",
    quaternion: { _x: 0, _y: 0, _z: 0, _w: 1 },
  } as any;
  const mockColor = new THREE.Color("#E11D48");

  const runFrameLoopTest = (props: any, sinValue = 1) => {
    let frameCallback: any;
    (useFrame as jest.Mock).mockImplementation((cb) => {
      frameCallback = cb;
    });

    render(<GlitchEmotionNode {...props} />);

    // Ensure elements render (and implies refs *should* be attached)
    expect(screen.getByTestId("glitch-group")).toBeInTheDocument();
    expect(screen.getByTestId("glitch-red")).toBeInTheDocument();
    expect(screen.getByTestId("glitch-green")).toBeInTheDocument();
    expect(screen.getByTestId("glitch-blue")).toBeInTheDocument();

    expect(useFrame).toHaveBeenCalled();
    if (frameCallback) {
      const stateMock = { clock: { elapsedTime: 1.0 } };
      // Spy on Math.sin to control branching
      const sinSpy = jest.spyOn(Math, "sin").mockReturnValue(sinValue);

      // Execute frame directly
      frameCallback(stateMock);

      // Execute again for time delta check
      stateMock.clock.elapsedTime = 2.0;
      frameCallback(stateMock);

      sinSpy.mockRestore();
    }
  };

  it("executes frame loop (strobe=true, glitch=true)", () => {
    // sin > 0.7 -> strobe happens
    // sin > threshold -> glitch (if threshold < 1, which it is ~0.95)
    runFrameLoopTest(
      {
        emotion: mockEmotion,
        color: mockColor,
        size: 1,
        isSelected: true,
        isHovered: false,
      },
      1.0
    );
  });

  it("executes frame loop (strobe=false, glitch=false)", () => {
    // sin <= 0.7 -> no strobe
    // sin <= threshold -> no glitch
    // A low sin value like -0.5 covers both "false" branches
    runFrameLoopTest(
      {
        emotion: mockEmotion,
        color: mockColor,
        size: 1,
        isSelected: false,
        isHovered: true,
      },
      -0.5
    );
  });

  it("executes frame loop (selected=false, hovered=false)", () => {
    runFrameLoopTest(
      {
        emotion: mockEmotion,
        color: mockColor,
        size: 1,
        isSelected: false,
        isHovered: false,
      },
      0.8
    ); // 0.8 is > 0.7 (strobe true) but maybe < threshold depending on arousal
  });

  it("handles emotion without name (hash fallback)", () => {
    const headlessEmotion = { ...mockEmotion, name: undefined };
    render(
      <GlitchEmotionNode
        emotion={headlessEmotion as any}
        color={mockColor}
        size={1}
        isSelected={false}
        isHovered={false}
      />
    );
    // implicit assertion: no crash means hash calculation worked on .id
  });
  it("handles null group ref in frame loop", () => {
    let frameCallback: any;
    (useFrame as jest.Mock).mockImplementation((cb) => {
      frameCallback = cb;
    });

    const nullRef = { current: null };
    (useRef as jest.Mock).mockReturnValue(nullRef);

    render(
      <GlitchEmotionNode
        emotion={mockEmotion}
        color={mockColor}
        size={1}
        isSelected={false}
        isHovered={false}
      />
    );

    // Clear manually just in case render populated it (though our mock returns a persistent obj)
    nullRef.current = null;

    const stateMock = { clock: { elapsedTime: 1.0 } };
    expect(() => frameCallback(stateMock)).not.toThrow();

    (useRef as jest.Mock).mockImplementation(jest.requireActual("react").useRef);
  });

  it("handles missing child refs in frame loop", () => {
    let frameCallback: any;
    (useFrame as jest.Mock).mockImplementation((cb) => {
      frameCallback = cb;
    });

    const groupRef = { current: { position: { copy: jest.fn() } } };

    // distinct refs for children
    const redRef = { current: null };
    const greenRef = { current: null };
    const blueRef = { current: null };
    const fallbackRef = { current: null }; // for offsets etc

    // Order in component: groupRef, redRef, greenRef, blueRef, glitchOffsetRef, lastGlitchTimeRef
    (useRef as jest.Mock)
      .mockReturnValueOnce(groupRef)
      .mockReturnValueOnce(redRef)
      .mockReturnValueOnce(greenRef)
      .mockReturnValueOnce(blueRef)
      .mockReturnValue(fallbackRef);

    render(
      <GlitchEmotionNode
        emotion={mockEmotion}
        color={mockColor}
        size={1}
        isSelected={false}
        isHovered={false}
      />
    );

    // Manually clear children
    redRef.current = null;
    greenRef.current = null;
    blueRef.current = null;

    // Ensure glitch offset refs work or are mocked sufficiently to not crash access
    (fallbackRef as any).current = new THREE.Vector3();

    const stateMock = { clock: { elapsedTime: 1.0 } };
    expect(() => frameCallback(stateMock)).not.toThrow();

    (useRef as jest.Mock).mockImplementation(jest.requireActual("react").useRef);
  });
});
