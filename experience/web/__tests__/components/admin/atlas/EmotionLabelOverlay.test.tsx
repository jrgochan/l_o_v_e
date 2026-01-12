import { render, screen } from "@testing-library/react";
import { EmotionLabelOverlay } from "../../../../components/admin/atlas/EmotionLabelOverlay";

// Mock Store
const mockUseAtlasAdminStore = jest.fn();
jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: (selector: any) => selector(mockUseAtlasAdminStore()),
}));

describe("EmotionLabelOverlay", () => {
  const mockEmotion = {
    id: "e1",
    name: "Joy",
    vac: [0.1, 0.2, 0.3] as [number, number, number],
    category: "Positive",
    definition: "",
    quaternion: [0, 0, 0, 1] as [number, number, number, number],
  };
  const mockLabels = [{ emotion: mockEmotion, x: 100, y: 100, visible: true }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAtlasAdminStore.mockReturnValue({
      selectedEmotionIds: new Set(),
      hoveredEmotionId: null,
      layers: { emotionLabels: true },
      settings: { pathAnimationMode: "subtle" },
    });
  });

  it("should render labels", () => {
    render(<EmotionLabelOverlay labels={mockLabels} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
  });

  it("should render nothing if disabled", () => {
    mockUseAtlasAdminStore.mockReturnValue({
      selectedEmotionIds: new Set(),
      layers: { emotionLabels: false }, // Disabled
      settings: { pathAnimationMode: "subtle" },
    });

    const { container } = render(<EmotionLabelOverlay labels={mockLabels} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("should show details when hovered", () => {
    mockUseAtlasAdminStore.mockReturnValue({
      selectedEmotionIds: new Set(),
      hoveredEmotionId: "e1", // Hovered
      layers: { emotionLabels: true },
      settings: { pathAnimationMode: "subtle" },
    });

    render(<EmotionLabelOverlay labels={mockLabels} />);
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("[0.10, 0.20, 0.30]")).toBeInTheDocument();
  });

  it("should apply mode styles", () => {
    mockUseAtlasAdminStore.mockReturnValue({
      selectedEmotionIds: new Set(),
      hoveredEmotionId: "e1", // Hovered to trigger dynamic cyan border
      layers: { emotionLabels: true },
      settings: { pathAnimationMode: "dynamic" }, // Dynamic mode
    });

    render(<EmotionLabelOverlay labels={mockLabels} />);

    const label = screen.getByText("Joy").closest(".rounded-xl");
    expect(label).toHaveClass("border-cyan-300");
  });
});
