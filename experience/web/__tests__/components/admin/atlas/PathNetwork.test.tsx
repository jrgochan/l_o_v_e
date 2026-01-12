import { render } from "@testing-library/react";
import { PathNetwork } from "../../../../components/admin/atlas/PathNetwork";
import * as THREE from "three";

// Mock child components
jest.mock("../../../../components/admin/visualizations/PathParticles", () => ({
  PathParticles: () => <group data-testid="path-particles" />,
}));

jest.mock("../../../../components/admin/paths/PathCurveAnimated", () => ({
  PathCurveAnimated: () => <mesh data-testid="path-curve-animated" />,
}));

// Mock Three
jest.mock("three", () => {
  const original = jest.requireActual("three");
  return {
    ...original,
    CatmullRomCurve3: jest.fn(() => ({
      getPointAt: jest.fn(() => new original.Vector3(0, 0, 0)), // Dummy
      getPoints: jest.fn(() => []),
    })),
    TubeGeometry: jest.fn(),
    Vector3: original.Vector3,
    Color: original.Color,
  };
});

// Mock Store
const mockUseAtlasAdminStore = jest.fn();
jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: (selector: any) => mockUseAtlasAdminStore(selector),
}));

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(), // If used in sub-components, but PathNetwork mainly renders them
  ThreeEvent: {},
}));

describe("PathNetwork", () => {
  const mockPath = {
    id: "p1",
    from: { id: "e1", vac: [0, 0, 0], name: "Joy" },
    to: { id: "e2", vac: [1, 1, 1], name: "Love" },
    waypoints: [],
    difficulty: "easy",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAtlasAdminStore.mockImplementation((selector: any) => {
      const state = {
        computedPaths: new Map([["p1", mockPath]]),
        selectedEmotionIds: new Set(["e1", "e2"]), // Both selected -> path visible
        layers: { transitionPaths: true, waypoints: true },
        settings: { pathOpacity: 1.0, pathAnimationMode: "flow" },
        allEmotions: [],
        selectedPathId: null,
        hoveredPathId: null,
        setHoveredPath: jest.fn(),
        setSelectedPath: jest.fn(),
      };
      return selector(state);
    });
  });

  it("should render visible paths", () => {
    const { getAllByTestId } = render(<PathNetwork />);
    expect(getAllByTestId("path-curve-animated")).toHaveLength(1);
  });

  it("should hide if transitionPaths layer disabled", () => {
    mockUseAtlasAdminStore.mockImplementation((selector: any) => {
      const state = {
        computedPaths: new Map([["p1", mockPath]]),
        selectedEmotionIds: new Set(["e1", "e2"]),
        layers: { transitionPaths: false }, // Disabled
        settings: { pathOpacity: 1.0 },
        allEmotions: [],
      };
      return selector(state);
    });

    const { queryAllByTestId } = render(<PathNetwork />);
    expect(queryAllByTestId("path-curve-animated")).toHaveLength(0);
  });

  it("should hide if endpoints not selected", () => {
    mockUseAtlasAdminStore.mockImplementation((selector: any) => {
      const state = {
        computedPaths: new Map([["p1", mockPath]]),
        selectedEmotionIds: new Set(["e1"]), // Only 'from' is selected
        layers: { transitionPaths: true },
        settings: { pathOpacity: 1.0 },
        allEmotions: [],
      };
      return selector(state);
    });

    const { queryAllByTestId } = render(<PathNetwork />);
    expect(queryAllByTestId("path-curve-animated")).toHaveLength(0);
  });
});
