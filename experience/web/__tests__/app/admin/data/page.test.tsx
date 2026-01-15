import { render, screen, fireEvent } from "@testing-library/react";
import AdminDataPage from "@/app/admin/data/page";

// Mock child components
jest.mock("@/components/admin/layout/AdminLayout", () => ({
  AdminLayout: ({ children }: any) => <div data-testid="admin-layout">{children}</div>,
}));

jest.mock("@/components/admin/data/EmotionsTab", () => ({
  EmotionsTab: () => <div data-testid="emotions-tab">Emotions Content</div>,
}));

jest.mock("@/components/admin/data/StrategiesTab", () => ({
  StrategiesTab: () => <div data-testid="strategies-tab">Strategies Content</div>,
}));

jest.mock("@/components/admin/data/AiModelsTab", () => ({
  __esModule: true,
  default: () => <div data-testid="ai-tab">AI Models Content</div>,
}));

jest.mock("@/components/admin/data/ClinicalAlertsTab", () => ({
  __esModule: true,
  default: () => <div data-testid="alerts-tab">Clinical Alerts Content</div>,
}));

jest.mock("@/components/admin/data/BootstrapTab", () => ({
  __esModule: true,
  default: () => <div data-testid="bootstrap-tab">Bootstrap Content</div>,
}));

jest.mock("@/components/admin/data/PromptTemplatesTab", () => ({
  PromptTemplatesTab: () => <div data-testid="prompts-tab">Prompt Templates Content</div>,
}));

describe("AdminDataPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with default tab", () => {
    render(<AdminDataPage />);

    expect(screen.getByTestId("admin-layout")).toBeInTheDocument();
    expect(screen.getByText("Data Management")).toBeInTheDocument();

    // Default tab is emotions
    expect(screen.getByTestId("emotions-tab")).toBeInTheDocument();

    // Check tab buttons exist
    expect(screen.getByText("Atlas Emotions")).toBeInTheDocument();
    expect(screen.getByText("Strategies")).toBeInTheDocument();
    expect(screen.getByText("AI Models")).toBeInTheDocument();
  });

  it("switches tabs correctly", () => {
    render(<AdminDataPage />);

    // Switch to Strategies
    fireEvent.click(screen.getByText("Strategies"));
    expect(screen.queryByTestId("emotions-tab")).not.toBeInTheDocument();
    expect(screen.getByTestId("strategies-tab")).toBeInTheDocument();

    // Switch to AI Models
    fireEvent.click(screen.getByText("AI Models"));
    expect(screen.queryByTestId("strategies-tab")).not.toBeInTheDocument();
    expect(screen.getByTestId("ai-tab")).toBeInTheDocument();

    // Switch to Clinical Alerts
    fireEvent.click(screen.getByText("Clinical Alerts"));
    expect(screen.getByTestId("alerts-tab")).toBeInTheDocument();

    // Switch to Bootstrap Data
    fireEvent.click(screen.getByText("Bootstrap Data"));
    expect(screen.getByTestId("bootstrap-tab")).toBeInTheDocument();

    // Switch to Prompt Templates
    fireEvent.click(screen.getByText("Prompt Templates"));
    expect(screen.getByTestId("prompts-tab")).toBeInTheDocument();

    // Switch back to Emotions
    fireEvent.click(screen.getByText("Atlas Emotions"));
    expect(screen.getByTestId("emotions-tab")).toBeInTheDocument();
  });
});
