import { render, screen } from "@testing-library/react";
import {
  EmotionLabelOverlay,
  getLabelStyle,
} from "../../../../components/admin/atlas/EmotionLabelOverlay";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

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

  it("should render nothing if disabled or empty", () => {
    // Disabled
    mockUseAtlasAdminStore.mockReturnValue({
      selectedEmotionIds: new Set(),
      layers: { emotionLabels: false },
      settings: { pathAnimationMode: "subtle" },
    });
    const { container: c1 } = render(<EmotionLabelOverlay labels={mockLabels} />);
    expect(c1).toBeEmptyDOMElement();

    // Empty
    mockUseAtlasAdminStore.mockReturnValue({
      selectedEmotionIds: new Set(),
      layers: { emotionLabels: true },
      settings: { pathAnimationMode: "subtle" },
    });
    const { container: c2 } = render(<EmotionLabelOverlay labels={[]} />);
    expect(c2).toBeEmptyDOMElement();
  });

  it("should render nothing if label is not visible", () => {
    const hiddenLabels = [{ ...mockLabels[0], visible: false }];
    const { container } = render(<EmotionLabelOverlay labels={hiddenLabels} />);
    // The wrapper div exists but is empty
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  describe("Mode: Subtle", () => {
    beforeEach(() => {
      mockUseAtlasAdminStore.mockReturnValue({
        selectedEmotionIds: new Set(),
        hoveredEmotionId: null,
        layers: { emotionLabels: true },
        settings: { pathAnimationMode: "subtle" },
      });
    });

    it("renders default style", () => {
      render(<EmotionLabelOverlay labels={mockLabels} />);
      const labelText = screen.getByText("Joy");
      // Text color is on the container div
      const container = labelText.closest("div.rounded-lg");
      expect(container).toHaveClass("text-gray-200");
      expect(container).toHaveClass("bg-gray-800/85");
      expect(container).toHaveClass("border-gray-700");
    });

    it("renders hovered style", () => {
      mockUseAtlasAdminStore.mockReturnValue({
        selectedEmotionIds: new Set(),
        hoveredEmotionId: "e1",
        layers: { emotionLabels: true },
        settings: { pathAnimationMode: "subtle" },
      });
      render(<EmotionLabelOverlay labels={mockLabels} />);
      const labelText = screen.getByText("Joy");

      const innerContainer = labelText.closest("div.rounded-lg");
      expect(innerContainer).toHaveClass("text-white");
      expect(innerContainer).toHaveClass("bg-gray-800/95");
      expect(innerContainer).toHaveClass("border-cyan-400");

      // Scale is on outer wrapper
      const outerWrapper = innerContainer?.parentElement;
      expect(outerWrapper).toHaveClass("scale-110");

      // Check details
      expect(screen.getByText("Positive")).toBeInTheDocument();
      expect(screen.getByText("[0.10, 0.20, 0.30]")).toBeInTheDocument();
    });

    it("renders selected style", () => {
      mockUseAtlasAdminStore.mockReturnValue({
        selectedEmotionIds: new Set(["e1"]),
        hoveredEmotionId: null,
        layers: { emotionLabels: true },
        settings: { pathAnimationMode: "subtle" },
      });
      render(<EmotionLabelOverlay labels={mockLabels} />);
      const container = screen.getByText("Joy").closest("div.rounded-lg");
      expect(container).toHaveClass("bg-gray-900/90");

      expect(container).toHaveStyle({ borderColor: "#888888" });
    });
  });

  describe("Mode: Dynamic", () => {
    beforeEach(() => {
      mockUseAtlasAdminStore.mockReturnValue({
        selectedEmotionIds: new Set(),
        hoveredEmotionId: null,
        layers: { emotionLabels: true },
        settings: { pathAnimationMode: "dynamic" },
      });
    });

    it("renders default style", () => {
      render(<EmotionLabelOverlay labels={mockLabels} />);
      const labelText = screen.getByText("Joy");
      const container = labelText.closest("div.rounded-xl");
      expect(container).toHaveClass("bg-gray-800/90");
      expect(container).toHaveClass("border-gray-600");

      const outerWrapper = container?.parentElement;
      expect(outerWrapper).toHaveClass("scale-100");
    });

    it("renders hovered style", () => {
      mockUseAtlasAdminStore.mockReturnValue({
        selectedEmotionIds: new Set(),
        hoveredEmotionId: "e1",
        layers: { emotionLabels: true },
        settings: { pathAnimationMode: "dynamic" },
      });
      render(<EmotionLabelOverlay labels={mockLabels} />);
      const container = screen.getByText("Joy").closest("div.rounded-xl");
      expect(container).toHaveClass("bg-cyan-500");
      expect(container).toHaveClass("border-cyan-300");

      const outerWrapper = container?.parentElement;
      expect(outerWrapper).toHaveClass("scale-110");
    });

    it("renders selected style", () => {
      mockUseAtlasAdminStore.mockReturnValue({
        selectedEmotionIds: new Set(["e1"]),
        hoveredEmotionId: null,
        layers: { emotionLabels: true },
        settings: { pathAnimationMode: "dynamic" },
      });
      render(<EmotionLabelOverlay labels={mockLabels} />);
      const container = screen.getByText("Joy").closest("div.rounded-xl");
      expect(container).toHaveClass("bg-gray-900/95");
      // Check inline style for border
      expect(container).toHaveStyle({ borderColor: "#888888" });
    });
  });

  describe("Mode: Mystical", () => {
    beforeEach(() => {
      mockUseAtlasAdminStore.mockReturnValue({
        selectedEmotionIds: new Set(),
        hoveredEmotionId: null,
        layers: { emotionLabels: true },
        settings: { pathAnimationMode: "mystical" },
      });
    });

    it("renders default style", () => {
      render(<EmotionLabelOverlay labels={mockLabels} />);
      const container = screen.getByText("Joy").closest("div.rounded-2xl");
      expect(container).toHaveClass("bg-gray-900/20");
      expect(container).toHaveClass("backdrop-blur-sm");
    });

    it("renders hovered style", () => {
      mockUseAtlasAdminStore.mockReturnValue({
        selectedEmotionIds: new Set(),
        hoveredEmotionId: "e1",
        layers: { emotionLabels: true },
        settings: { pathAnimationMode: "mystical" },
      });
      render(<EmotionLabelOverlay labels={mockLabels} />);
      const container = screen.getByText("Joy").closest("div.rounded-2xl");
      expect(container).toHaveClass("bg-purple-900/40");
      expect(container).toHaveClass("backdrop-blur-md");
    });

    it("renders selected style", () => {
      mockUseAtlasAdminStore.mockReturnValue({
        selectedEmotionIds: new Set(["e1"]),
        hoveredEmotionId: null,
        layers: { emotionLabels: true },
        settings: { pathAnimationMode: "mystical" },
      });
      render(<EmotionLabelOverlay labels={mockLabels} />);
      const container = screen.getByText("Joy").closest("div.rounded-2xl");
      expect(container).toHaveClass("bg-purple-950/30");
    });
  });

  it("renders bridge emotion icon for known bridge emotions", () => {
    // "Awe" is in BRIDGE_EMOTIONS constant
    const bridgeLabel = {
      ...mockLabels[0],
      emotion: { ...mockEmotion, id: "b1", name: "Awe" },
    };

    // Test in default mode (Subtle)
    mockUseAtlasAdminStore.mockReturnValue({
      selectedEmotionIds: new Set(),
      layers: { emotionLabels: true },
      settings: { pathAnimationMode: "subtle" },
    });

    render(<EmotionLabelOverlay labels={[bridgeLabel]} />);

    // Look for the star icon (rendered as text "★")
    expect(screen.getByText("★")).toBeInTheDocument();
  });
});

describe("getLabelStyle", () => {
  it("returns correct styles for each mode", () => {
    // Subtle
    // @ts-ignore
    const s1 = getLabelStyle("subtle", false, false, "#fff");
    expect(s1.containerClass).toContain("bg-gray-800/85");

    // Dynamic
    // @ts-ignore
    const s2 = getLabelStyle("dynamic", true, false, "#fff");
    expect(s2.containerClass).toContain("bg-gray-900/95");

    // Mystical
    // @ts-ignore
    const s3 = getLabelStyle("mystical", false, true, "#fff");
    expect(s3.containerClass).toContain("bg-purple-900/40");
  });
});
