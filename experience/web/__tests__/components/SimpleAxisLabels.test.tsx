import { render, screen } from "@testing-library/react";
import { SimpleAxisLabels } from "../../components/SimpleAxisLabels";

// Mock store
const mockUseSettingsStore = jest.fn();

jest.mock("@/stores/useSettingsStore", () => ({
  useSettingsStore: (selector: any) => selector(mockUseSettingsStore()),
}));

describe("SimpleAxisLabels", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render nothing when disabled", () => {
    mockUseSettingsStore.mockReturnValue({ showAxisLabels: false });
    const { container } = render(<SimpleAxisLabels />);
    expect(container).toBeEmptyDOMElement();
  });

  it("should render labels when enabled", () => {
    mockUseSettingsStore.mockReturnValue({ showAxisLabels: true });
    render(<SimpleAxisLabels />);

    expect(screen.getByText("V+ Positive")).toBeInTheDocument();
    expect(screen.getByText("V− Negative")).toBeInTheDocument();
    expect(screen.getByText("A+ Activated")).toBeInTheDocument();
    expect(screen.getByText("A− Calm")).toBeInTheDocument();
    expect(screen.getByText("C+ Connected")).toBeInTheDocument();
    expect(screen.getByText("C− Separated")).toBeInTheDocument();
  });
});
