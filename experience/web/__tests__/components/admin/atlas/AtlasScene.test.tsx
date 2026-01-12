import { render } from "@testing-library/react";
import { AtlasScene } from "../../../../components/admin/atlas/AtlasScene";

// Mock child components
jest.mock("@/components/SoulSphere", () => ({
  SoulSphere: () => <mesh data-testid="soul-sphere" />,
}));

jest.mock("../../../../components/admin/atlas/EmotionCloud", () => ({
  EmotionCloud: () => <group data-testid="emotion-cloud" />,
}));

jest.mock("../../../../components/admin/atlas/PathNetwork", () => ({
  PathNetwork: () => <group data-testid="path-network" />,
}));

// Mock store
const mockUseSettingsStore = jest.fn();
jest.mock("@/stores/useSettingsStore", () => ({
  useSettingsStore: (selector: any) =>
    selector ? selector(mockUseSettingsStore()) : mockUseSettingsStore(),
}));

// Mock Three
jest.mock("@react-three/fiber", () => ({
  element: "canvas", // Render as simple element
  createRoot: jest.fn(() => ({
    configure: jest.fn(),
    render: jest.fn(),
    unmount: jest.fn(),
  })),
}));

describe("AtlasScene", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSettingsStore.mockReturnValue({
      layers: { soulSphere: true },
      showAxisLabels: true,
    });
  });

  it("should render all main components enabled", () => {
    // Since AtlasScene returns a <group>, we can render it directly
    // But <group> is an R3F element. In testing-library render, it treats it as HTML tag <group>.
    // That's fine for existence check.
    const { getByTestId } = render(<AtlasScene />);

    expect(getByTestId("soul-sphere")).toBeInTheDocument();
    expect(getByTestId("emotion-cloud")).toBeInTheDocument();
    expect(getByTestId("path-network")).toBeInTheDocument();
  });

  it("should hide soul sphere if disabled in settings", () => {
    mockUseSettingsStore.mockReturnValue({
      layers: { soulSphere: false },
      showAxisLabels: true,
    });

    const { queryByTestId } = render(<AtlasScene />);
    expect(queryByTestId("soul-sphere")).not.toBeInTheDocument();
  });

  // Note: gridHelper is an intrinsic R3F element.
  // Checking for it directly renders as <gridHelper> in snapshot/DOM.
  it("should render grids if enabled", () => {
    const { container } = render(<AtlasScene />);
    expect(container.querySelectorAll("gridhelper")).toHaveLength(3);
  });

  it("should hide grids if disabled", () => {
    mockUseSettingsStore.mockReturnValue({
      layers: { soulSphere: true },
      showAxisLabels: false,
    });

    const { container } = render(<AtlasScene />);
    expect(container.querySelectorAll("gridhelper")).toHaveLength(0);
  });
});
