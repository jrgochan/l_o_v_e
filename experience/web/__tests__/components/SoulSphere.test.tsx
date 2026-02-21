import { render, screen, cleanup } from "@testing-library/react";
import { SoulSphere } from "../../components/SoulSphere";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// --- Mocks ---

// Mock Three.js
const mockShaderMaterialUniforms = {
  uTime: { value: 0 },
  uValence: { value: 0 },
  uArousal: { value: 0 },
  uConnection: { value: 0 },
  uCameraPosition: { value: { copy: jest.fn() } },
  uColorNeg: { value: {} },
  uColorPos: { value: {} },
};

jest.mock("three", () => {
  const originalThree = jest.requireActual("three");
  return {
    ...originalThree,
    Mesh: jest.fn(() => ({
      rotation: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0, z: 0 },
    })),
    ShaderMaterial: jest.fn(() => ({
      uniforms: mockShaderMaterialUniforms,
    })),
    IcosahedronGeometry: jest.fn(),
    Color: jest.fn((...args) => {
      const colorInstance = {
        r: 0,
        g: 0,
        b: 0,
        set: jest.fn(),
        setHSL: jest.fn((h, s, l) => {
          // Minimal HSL mock: just ensure it doesn't crash.
          // For testing, we might not need exact HSL->RGB conversion if we rely on the pre-HSL-boost values
          // or if we just want to ensure it changes.
          // A simple bypass: do nothing, or set to a recognizable value if critical.
          // Given the test checks r > 0.3 etc, leaving r/g/b as is (from the mix) is probably safer/easier
          // than implementing full HSL conversion.
        }),
        getHSL: jest.fn((target) => {
          target.h = 0;
          target.s = 0.5;
          target.l = 0.5; // Dummy values
        }),
        copy: jest.fn(function (this: any, c: any) {
          if (c.r !== undefined) this.r = c.r;
          if (c.g !== undefined) this.g = c.g;
          if (c.b !== undefined) this.b = c.b;
          return this;
        }),
      };

      if (args.length === 1 && typeof args[0] === "string") {
        const hex = args[0];
        if (hex === "#2DD4BF") {
          colorInstance.r = 0.176;
          colorInstance.g = 0.831;
          colorInstance.b = 0.749;
        } else if (hex === "#E11D48" || hex === "#FF4444") {
          colorInstance.r = 0.882;
          colorInstance.g = 0.114;
          colorInstance.b = 0.282;
        } else if (hex === "#F59E0B") {
          colorInstance.r = 0.961;
          colorInstance.g = 0.62;
          colorInstance.b = 0.043;
        } else if (hex === "#4338CA") {
          colorInstance.r = 0.263;
          colorInstance.g = 0.22;
          colorInstance.b = 0.792;
        } else if (hex === "#A855F7") {
          colorInstance.r = 0.659;
          colorInstance.g = 0.333;
          colorInstance.b = 0.969;
        } else if (hex === "#64748B") {
          colorInstance.r = 0.392;
          colorInstance.g = 0.455;
          colorInstance.b = 0.545;
        } else if (hex === "#44FF44") {
          colorInstance.r = 0.26;
          colorInstance.g = 1;
          colorInstance.b = 0.26;
        } // Approx
      } else if (args.length >= 3) {
        colorInstance.r = args[0];
        colorInstance.g = args[1];
        colorInstance.b = args[2];
      }

      return colorInstance;
    }),
    Vector3: jest.fn((x, y, z) => ({ x, y, z, copy: jest.fn() })),
    DoubleSide: 2,
  };
});

// Mock R3F
const mockUseFrame = jest.fn();
jest.mock("@react-three/fiber", () => ({
  useFrame: (cb: any) => mockUseFrame(cb),
}));

// Mock Store with inline factory
const mockGetState = jest.fn();
jest.mock("@/stores/useExperienceStore", () => {
  return {
    useExperienceStore: Object.assign(
      (selector: any) => selector({}), // hook implementation
      { getState: () => mockGetState() } // static method
    ),
  };
});

const mockUseSettingsStore = jest.fn();
jest.mock("@/stores/useSettingsStore", () => ({
  useSettingsStore: (selector: any) => mockUseSettingsStore(selector),
}));

// Mock Atlas Admin Store
const mockUseAtlasAdminStore = jest.fn();
jest.mock("@/stores/useVisualizationStore", () => ({
  useVisualizationStore: (selector: any) => mockUseAtlasAdminStore(selector),
}));

describe("SoulSphere", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    mockGetState.mockReturnValue({
      currentVAC: [0, 0, 0],
    });
    mockUseSettingsStore.mockImplementation((selector: any) => {
      const state = { pathAnimationMode: "subtle", sphereOpacity: 1.0, animationSpeed: 1.0 };
      return selector ? selector(state) : state;
    });
    // Default: No selection
    mockUseAtlasAdminStore.mockImplementation((selector: any) => {
      const state = {
        allEmotions: [],
        selectedEmotionIds: new Set(),
      };
      return selector(state);
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("Aggregate Color Logic", () => {
    const mockEmotions = [
      { id: "e1", name: "Joy", vac: [0.8, 0.6, 0.4] }, // High V, Mod A, some C
      { id: "e2", name: "Sadness", vac: [-0.8, -0.4, 0.1] }, // Neg V, Neg A
      { id: "e3", name: "Anger", vac: [-0.6, 0.8, -0.2] }, // Neg V, High A
      { id: "e4", name: "Love", vac: [0.9, 0.5, 0.9] }, // High V, High C
      { id: "e5", name: "Neutral", vac: [0.001, -0.001, 0] }, // Near Zero
    ];

    it("should default to Teal when no emotions selected", () => {
      mockUseAtlasAdminStore.mockImplementation((selector: any) =>
        selector({ allEmotions: mockEmotions, selectedEmotionIds: new Set() })
      );

      const { container } = render(<SoulSphere />);
      const shaderMaterial = container.querySelector("shaderMaterial");

      const updateModeCallback = mockUseFrame.mock.calls[0][0];

      const capturedColor = new THREE.Color();
      (shaderMaterial as any).uniforms = {
        uMode: { value: 0 },
        uColorNeg: { value: { copy: (c: any) => capturedColor.copy(c) } },
        uColorPos: { value: { copy: jest.fn() } },
      };

      updateModeCallback();

      expect(capturedColor.r).toBeCloseTo(0.176, 2);
      expect(capturedColor.g).toBeCloseTo(0.831, 2);
      expect(capturedColor.b).toBeCloseTo(0.749, 2);
    });

    it("should calculate reddish color for Negative Valence (Sadness)", () => {
      mockUseAtlasAdminStore.mockImplementation((selector: any) =>
        selector({
          allEmotions: mockEmotions,
          selectedEmotionIds: new Set(["e2"]),
        })
      );

      const { container } = render(<SoulSphere />);
      const shaderMaterial = container.querySelector("shaderMaterial");
      const updateModeCallback = mockUseFrame.mock.calls[0][0];

      const capturedColor = new THREE.Color();
      (shaderMaterial as any).uniforms = {
        uMode: { value: 0 },
        uColorNeg: { value: { copy: (c: any) => capturedColor.copy(c) } },
        uColorPos: { value: { copy: jest.fn() } },
      };
      updateModeCallback();

      expect(capturedColor.r).toBeGreaterThan(0.3);
      expect(capturedColor.b).toBeGreaterThan(0.1);
    });

    it("should calculate yellowish color for High Arousal (Anger)", () => {
      mockUseAtlasAdminStore.mockImplementation((selector: any) =>
        selector({
          allEmotions: mockEmotions,
          selectedEmotionIds: new Set(["e3"]),
        })
      );

      const { container } = render(<SoulSphere />);
      const shaderMaterial = container.querySelector("shaderMaterial");
      const updateModeCallback = mockUseFrame.mock.calls[0][0];

      const capturedColor = new THREE.Color();
      (shaderMaterial as any).uniforms = {
        uMode: { value: 0 },
        uColorNeg: { value: { copy: (c: any) => capturedColor.copy(c) } },
        uColorPos: { value: { copy: jest.fn() } },
      };
      updateModeCallback();

      expect(capturedColor.r).toBeGreaterThan(0.5);
      expect(capturedColor.g).toBeGreaterThan(0.2);
    });

    it("should calculate purpleish color for High Connection (Love)", () => {
      mockUseAtlasAdminStore.mockImplementation((selector: any) =>
        selector({
          allEmotions: mockEmotions,
          selectedEmotionIds: new Set(["e4"]),
        })
      );

      const { container } = render(<SoulSphere />);
      const shaderMaterial = container.querySelector("shaderMaterial");
      const updateModeCallback = mockUseFrame.mock.calls[0][0];

      const capturedColor = new THREE.Color();
      (shaderMaterial as any).uniforms = {
        uMode: { value: 0 },
        uColorNeg: { value: { copy: (c: any) => capturedColor.copy(c) } },
        uColorPos: { value: { copy: jest.fn() } },
      };
      updateModeCallback();

      expect(capturedColor.b).toBeGreaterThan(0.4);
    });

    it("should default to Teal if total weight is negligible (Neutral)", () => {
      mockUseAtlasAdminStore.mockImplementation((selector: any) =>
        selector({
          allEmotions: mockEmotions,
          selectedEmotionIds: new Set(["e5"]),
        })
      );

      const { container } = render(<SoulSphere />);
      const shaderMaterial = container.querySelector("shaderMaterial");
      const updateModeCallback = mockUseFrame.mock.calls[0][0];

      const capturedColor = new THREE.Color();
      (shaderMaterial as any).uniforms = {
        uMode: { value: 0 },
        uColorNeg: { value: { copy: (c: any) => capturedColor.copy(c) } },
        uColorPos: { value: { copy: jest.fn() } },
      };
      updateModeCallback();

      expect(capturedColor.r).toBeCloseTo(0.176, 2);
      expect(capturedColor.g).toBeCloseTo(0.831, 2);
      expect(capturedColor.b).toBeCloseTo(0.749, 2);
    });
  });

  const modes = [
    ["subtle", 0],
    ["dynamic", 1],
    ["mystical", 2],
    ["crystalline", 3],
    ["luminous", 4],
    ["liquid", 5],
    ["glitch", 6],
    ["invalid_mode", 0], // Hits default
  ] as const;

  it.each(modes)("should update uniform for mode %s (index %d)", (mode, index) => {
    mockUseSettingsStore.mockImplementation((selector: any) => {
      const state = { pathAnimationMode: mode, sphereOpacity: 1.0, animationSpeed: 1.0 };
      return selector ? selector(state) : state;
    });
    const { container } = render(<SoulSphere />);

    const shaderMaterial = container.querySelector("shaderMaterial");
    expect(shaderMaterial).toBeTruthy();

    // Mock update
    const mockUniforms = {
      uMode: { value: 0 },
      uTime: { value: 0 },
      uValence: { value: 0 },
      uArousal: { value: 0 },
      uConnection: { value: 0 },
      uCameraPosition: { value: { copy: jest.fn() } },
      uColorNeg: { value: { copy: jest.fn() } },
      uColorPos: { value: { copy: jest.fn() } },
      uOpacity: { value: 1.0 },
    };
    (shaderMaterial as any).uniforms = mockUniforms;

    // Get callback (first useFrame is likely the mode updater since it's defined first in component)
    // Actually hooks order: settings -> memo modeInt -> memo geometry -> memo material -> useFrame(mode) -> useFrame(anim)
    // We need to identify which callback is which.
    // The mode updater uses materialRef.current.uniforms.uMode

    const calls = mockUseFrame.mock.calls;
    // We expect 2 useFrame calls
    // We can try executing both

    calls.forEach(([cb]: [any]) => {
      if (cb) cb({ camera: { position: { x: 0, y: 0, z: 0 } } }, 0.1);
    });

    expect((shaderMaterial as any).uniforms.uMode.value).toBe(index);
  });

  it("should update mode uniform when ref exists in frame loop", () => {
    // This targets lines 270-272 specifically
    mockUseSettingsStore.mockImplementation((selector: any) => {
      const state = { pathAnimationMode: "dynamic", sphereOpacity: 1.0, animationSpeed: 1.0 };
      return selector ? selector(state) : state;
    });
    const { container } = render(<SoulSphere />);

    const shaderMaterial = container.querySelector("shaderMaterial");
    // Setup mock uniforms
    (shaderMaterial as any).uniforms = {
      uMode: { value: 0 },
      uColorNeg: { value: { copy: jest.fn() } },
      uColorPos: { value: { copy: jest.fn() } },
    };

    // Find the mode update callback
    // It's likely the first useFrame call because it appears before the animation loop in source
    const modeCallback = mockUseFrame.mock.calls[0][0];

    // Execute it
    modeCallback();

    expect((shaderMaterial as any).uniforms.uMode.value).toBe(1);
  });

  it("should safely ignore mode update if material ref is missing", () => {
    // Covers the 'false' branch of line 270
    const { unmount } = render(<SoulSphere />);
    // Find mode update callback (first one)
    const modeCallback = mockUseFrame.mock.calls[0][0];

    // Unmount to clean refs (simulate missing ref)
    unmount();

    // Execute callback - should not throw and not hit property access
    expect(() => modeCallback()).not.toThrow();
  });

  it("should default to Teal when selected IDs do not match any known emotions", () => {
    // This covers the case where selectedEmotionIds is not empty, but filtered result IS empty
    const mockEmotions = [
      { id: "joy", valence: 0.8, arousal: 0.7, color: "#FFFF00" },
      { id: "sadness", valence: -0.6, arousal: -0.4, color: "#0000FF" },
    ];
    mockUseAtlasAdminStore.mockImplementation((selector: any) =>
      selector({
        allEmotions: mockEmotions,
        selectedEmotionIds: new Set(["unknown_id_999"]),
      })
    );

    const { container } = render(<SoulSphere />);
    const shaderMaterial = container.querySelector("shaderMaterial");
    const updateModeCallback = mockUseFrame.mock.calls[0][0];

    const capturedColor = new THREE.Color();
    (shaderMaterial as any).uniforms = {
      uMode: { value: 0 },
      uColorNeg: { value: { copy: (c: any) => capturedColor.copy(c) } },
      uColorPos: { value: { copy: jest.fn() } },
    };
    updateModeCallback();

    // Should hit line 263 and return Teal
    expect(capturedColor.r).toBeCloseTo(0.176, 2);
    expect(capturedColor.g).toBeCloseTo(0.831, 2);
    expect(capturedColor.b).toBeCloseTo(0.749, 2);
  });

  it("should create geometry and material", () => {
    render(<SoulSphere />);
    expect(THREE.IcosahedronGeometry).toHaveBeenCalledWith(1, 20);
    expect(THREE.ShaderMaterial).toHaveBeenCalled();
  });

  it("should register animation loop", () => {
    render(<SoulSphere />);
    expect(mockUseFrame).toHaveBeenCalled();
  });

  it("should update uniforms on frame tick", () => {
    const { container } = render(<SoulSphere />);

    const shaderMaterial = container.querySelector("shaderMaterial");
    expect(shaderMaterial).toBeTruthy();

    // Setup mock uniforms on the DOM node
    const domUniforms = {
      uTime: { value: 0 },
      uValence: { value: 0 },
      uArousal: { value: 0 },
      uConnection: { value: 0 },
      uCameraPosition: { value: { copy: jest.fn() } },
      uOpacity: { value: 1.0 },
    };

    (shaderMaterial as any).uniforms = domUniforms;

    // Setup Store State
    mockGetState.mockReturnValue({
      currentVAC: [0.8, 0.5, 0.2], // V, A, C
    });

    // Get callback
    const calls = mockUseFrame.mock.calls;
    const callback = calls[calls.length - 1][0];

    // Invoke callback
    const mockState = { camera: { position: { x: 0, y: 0, z: 5 } } };
    const delta = 0.1;
    callback(mockState, delta);

    expect(domUniforms.uTime.value).toBeCloseTo(0.1);
    expect(domUniforms.uValence.value).toBe(0.8);
    expect(domUniforms.uCameraPosition.value.copy).toHaveBeenCalledWith(mockState.camera.position);
  });

  it("should safely abort if material ref is missing (e.g. unmounted)", () => {
    const { unmount } = render(<SoulSphere />);

    // Capture callback
    const calls = mockUseFrame.mock.calls;
    const callback = calls[calls.length - 1][0];

    // Unmount component -> React sets ref.current to null
    unmount();

    // Execute callback. It should return early because ref is null.
    // If it proceeded, it would throw because we haven't patched the DOM node
    // (and the DOM node is gone anyway).

    // We spy on getState to ensure it's NOT reached
    mockGetState.mockClear();

    callback({ camera: { position: { x: 0, y: 0, z: 0 } } }, 0.1);

    expect(mockGetState).not.toHaveBeenCalled();
  });
});
