import { render, fireEvent } from "@testing-library/react";
import { QuickActions } from "../../../../../components/admin/panels/ControlPanel/QuickActions";

// Mock SmartRecommendations to avoid dependency issues
jest.mock("@/components/admin/shared/SmartRecommendations", () => ({
  SmartRecommendations: () => <div data-testid="smart-recommendations">Mock Recommendations</div>,
}));

const mockUseAdminTheme = jest.fn();
jest.mock("@/hooks/admin/useAdminTheme", () => ({
  useAdminTheme: () => mockUseAdminTheme(),
}));

describe("QuickActions", () => {
  const defaultProps = {
    selectedCount: 0,
    onClearSelection: jest.fn(),
    onSelectBridgeEmotions: jest.fn(),
    showRecommendations: false,
    onToggleRecommendations: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminTheme.mockReturnValue({
      colors: {
        text: { secondary: "text-gray-400" },
        secondary: "bg-gray-700",
        primary: "bg-blue-600",
        border: "border-gray-700",
      },
      layout: { borderRadius: "rounded-lg" },
      typography: { fontFamily: "font-sans" },
    });
  });

  it("should render selection controls", () => {
    const { getByText, queryByText } = render(<QuickActions {...defaultProps} />);
    expect(getByText("Selected (0)")).toBeInTheDocument();
    expect(queryByText("Clear All")).not.toBeInTheDocument();

    expect(getByText(/Select Bridge Emotions/)).toBeInTheDocument();
    expect(getByText(/Smart Recommendations/)).toBeInTheDocument();
  });

  it("should show Clear All when selection > 0", () => {
    const { getByText } = render(<QuickActions {...defaultProps} selectedCount={5} />);
    expect(getByText("Selected (5)")).toBeInTheDocument();
    const clearBtn = getByText("Clear All");
    expect(clearBtn).toBeInTheDocument();
  });

  it("should handle clear selection click", () => {
    const onClear = jest.fn();
    const { getByText } = render(
      <QuickActions {...defaultProps} selectedCount={1} onClearSelection={onClear} />
    );
    fireEvent.click(getByText("Clear All"));
    expect(onClear).toHaveBeenCalled();
  });

  it("should handle bridge emotion selection", () => {
    const onSelectBridge = jest.fn();
    const { getByText } = render(
      <QuickActions {...defaultProps} onSelectBridgeEmotions={onSelectBridge} />
    );
    fireEvent.click(getByText(/Select Bridge Emotions/));
    expect(onSelectBridge).toHaveBeenCalled();
  });

  it("should handle recommendations toggle", () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <QuickActions {...defaultProps} onToggleRecommendations={onToggle} />
    );
    fireEvent.click(getByText(/Smart Recommendations/));
    expect(onToggle).toHaveBeenCalled();
  });

  it("should show encoded recommendations when visible", () => {
    const { getByTestId, getByText } = render(
      <QuickActions {...defaultProps} showRecommendations={true} />
    );
    expect(getByTestId("smart-recommendations")).toBeInTheDocument();
    expect(getByText("▼")).toBeInTheDocument(); // Expanded arrow
  });

  it("should show collapsed arrow when hidden", () => {
    const { getByText } = render(<QuickActions {...defaultProps} showRecommendations={false} />);
    expect(getByText("▶")).toBeInTheDocument(); // Collapsed arrow
  });

  it("should apply monospace font when theme is font-mono", () => {
    mockUseAdminTheme.mockReturnValue({
      colors: {
        text: { secondary: "text-gray-400" },
        secondary: "bg-gray-700",
        primary: "bg-blue-600",
        border: "border-gray-700",
      },
      layout: { borderRadius: "rounded-lg" },
      typography: { fontFamily: "font-mono" },
    });

    const { getByText } = render(<QuickActions {...defaultProps} />);

    // Check if style applies
    const bridgeBtn = getByText(/Select Bridge Emotions/);
    expect(bridgeBtn).toHaveStyle({ fontFamily: "monospace" });

    const recBtn = getByText(/Smart Recommendations/).closest("button");
    expect(recBtn).toHaveStyle({ fontFamily: "monospace" });
  });
});
