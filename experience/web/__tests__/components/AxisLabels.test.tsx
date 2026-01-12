import { render, screen } from "@testing-library/react";
import { AxisLabels } from "../../components/AxisLabels";

// Mock store
const mockUseSettingsStore = jest.fn();
jest.mock("@/stores/useSettingsStore", () => ({
  useSettingsStore: (selector: any) => selector(mockUseSettingsStore()),
}));

describe("AxisLabels", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render nothing when disabled", () => {
    mockUseSettingsStore.mockReturnValue({ showAxisLabels: false });
    const { container } = render(<AxisLabels />);
    expect(container).toBeEmptyDOMElement();
  });

  it("should render all axis labels when enabled", () => {
    mockUseSettingsStore.mockReturnValue({ showAxisLabels: true });
    render(<AxisLabels />);

    // Valence
    expect(screen.getByText("V+")).toBeInTheDocument();
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("V−")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();

    // Arousal
    expect(screen.getByText("A+")).toBeInTheDocument();
    expect(screen.getByText("Activated")).toBeInTheDocument();
    expect(screen.getByText("A−")).toBeInTheDocument();
    expect(screen.getByText("Calm")).toBeInTheDocument();

    // Connection
    expect(screen.getByText("C+")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("C−")).toBeInTheDocument();
    expect(screen.getByText("Separated")).toBeInTheDocument();
  });

  it("should have correct aria labels and tooltips", () => {
    mockUseSettingsStore.mockReturnValue({ showAxisLabels: true });
    render(<AxisLabels />);

    const vPlus = screen.getByText("V+").closest("[role='img']");
    expect(vPlus).toHaveAttribute("aria-label", expect.stringContaining("Valence: Pleasant"));
    expect(vPlus).toHaveAttribute("title", expect.stringContaining("Valence: Pleasant"));
  });
});
