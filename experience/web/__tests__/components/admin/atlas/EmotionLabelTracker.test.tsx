import { render } from "@testing-library/react";
import { EmotionLabelTracker } from "../../../../components/admin/atlas/EmotionLabelTracker";
import * as THREE from "three";

// Mock Store
const mockUseAtlasAdminStore = jest.fn();
jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: (selector: any) => selector(mockUseAtlasAdminStore()),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock R3F
const mockUseFrame = jest.fn();
const mockProject = jest.fn();
const mockCamera = {
  position: new THREE.Vector3(0, 0, 10),
  updateMatrixWorld: jest.fn(),
  projectionMatrix: new THREE.Matrix4(),
  matrixWorldInverse: new THREE.Matrix4(),
};

jest.mock("@react-three/fiber", () => ({
  useFrame: (cb: any) => mockUseFrame(cb),
  useThree: () => ({
    camera: mockCamera,
    size: { width: 1000, height: 1000 },
  }),
}));

// Mock THREE.Vector3.project
jest.mock("three", () => {
  const original = jest.requireActual("three");
  return {
    ...original,
    Vector3: class extends original.Vector3 {
      project() {
        mockProject(this); // Track call
        return this; // Return self for chaining if needed, but logic uses mutation
      }
    },
  };
});

describe("EmotionLabelTracker", () => {
  const mockOnUpdate = jest.fn();
  const mockEmotion = { id: "e1", name: "Joy", vac: [0, 0, 0] };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAtlasAdminStore.mockReturnValue({
      allEmotions: [mockEmotion],
      selectedEmotionIds: new Set(["e1"]),
      hoveredEmotionId: null,
      layers: { emotionLabels: true },
    });
  });

  it("should register frame loop", () => {
    render(<EmotionLabelTracker onUpdate={mockOnUpdate} />);
    expect(mockUseFrame).toHaveBeenCalled();
  });

  it("should update labels on frame", () => {
    let frameCallback: any;
    mockUseFrame.mockImplementation((cb) => {
      frameCallback = cb;
    });

    // Add an ignored emotion (not selected, not hovered)
    mockUseAtlasAdminStore.mockReturnValue({
      allEmotions: [
        mockEmotion,
        { id: "e2", name: "Ignored", vac: [1, 1, 1] }
      ],
      selectedEmotionIds: new Set(["e1"]),
      hoveredEmotionId: null,
      layers: { emotionLabels: true },
    });

    render(<EmotionLabelTracker onUpdate={mockOnUpdate} />);

    // Run frame
    if (frameCallback) frameCallback();

    expect(mockProject).toHaveBeenCalled();

    // Expect e1 to be present
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ emotion: mockEmotion, visible: true })])
    );

    // Expect e2 to NOT be present (list length 1)
    const updateCall = mockOnUpdate.mock.calls[0][0];
    expect(updateCall).toHaveLength(1);
    expect(updateCall.find((l: any) => l.emotion.id === "e2")).toBeUndefined();
  });

  it("should return empty if disabled", () => {
    mockUseAtlasAdminStore.mockReturnValue({
      allEmotions: [mockEmotion],
      selectedEmotionIds: new Set(["e1"]),
      layers: { emotionLabels: false }, // Disabled
    });

    let frameCallback: any;
    mockUseFrame.mockImplementation((cb) => {
      frameCallback = cb;
    });

    render(<EmotionLabelTracker onUpdate={mockOnUpdate} />);
    if (frameCallback) frameCallback();

    expect(mockOnUpdate).toHaveBeenCalledWith([]);
  });
});
