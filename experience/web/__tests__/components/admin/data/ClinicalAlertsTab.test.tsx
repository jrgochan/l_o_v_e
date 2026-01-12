import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClinicalAlertsTab from "@/components/admin/data/ClinicalAlertsTab";
import { adminApi } from "@/utils/api";
import { ClinicalAlert } from "@/types/admin";

// Mock the API
jest.mock("@/utils/api", () => ({
  adminApi: {
    getClinicalAlerts: jest.fn(),
  },
}));

const mockAlerts: ClinicalAlert[] = [
  {
    id: "alert-1",
    session_id: "session-1",
    timestamp: "2024-01-01T10:00:00Z",
    level: "critical",
    type: "high_arousal",
    message: "High arousal detected without valance counter-balance",
    suggestion: "Suggest grounding exercise",
    triggered_by: { arousal: 0.9, valence: -0.2 },
    threshold_used: { arousal_critical: 0.8 },
    version: "1.0",
  },
  {
    id: "alert-2",
    session_id: "session-2",
    timestamp: "2024-01-01T11:00:00Z",
    level: "warning",
    type: "voice_mismatch",
    message: "Voice tone does not match sentiment",
    suggestion: "Check for masking",
    triggered_by: { discrepancy: 0.6 },
    threshold_used: { discrepancy_warning: 0.5 },
    version: "1.0",
  },
];

describe("ClinicalAlertsTab", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (adminApi.getClinicalAlerts as jest.Mock).mockResolvedValue({
      items: mockAlerts,
      total: 60, // Mock > 50 to test pagination
    });
  });

  it("renders loading state initially", () => {
    (adminApi.getClinicalAlerts as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<ClinicalAlertsTab />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading alerts...")).toBeInTheDocument();
  });

  it("renders alerts list after loading", async () => {
    render(<ClinicalAlertsTab />);

    await waitFor(() => {
      expect(
        screen.getByText("High arousal detected without valance counter-balance")
      ).toBeInTheDocument();
      expect(screen.getByText("Voice tone does not match sentiment")).toBeInTheDocument();
    });

    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(screen.getByText("warning")).toBeInTheDocument();
  });

  it("handles filtering by severity", async () => {
    render(<ClinicalAlertsTab />);

    await waitFor(() => {
      expect(
        screen.getByText("High arousal detected without valance counter-balance")
      ).toBeInTheDocument();
    });

    // Initial call
    expect(adminApi.getClinicalAlerts).toHaveBeenCalledWith(1, 50, "all");

    // Select filter
    const filterSelect = screen.getByLabelText("Filter by Severity");
    await user.selectOptions(filterSelect, "critical");

    await waitFor(() => {
      expect(adminApi.getClinicalAlerts).toHaveBeenCalledWith(1, 50, "critical");
    });
  });

  it("handles pagination", async () => {
    render(<ClinicalAlertsTab />);

    await waitFor(() => {
      expect(adminApi.getClinicalAlerts).toHaveBeenCalledWith(1, 50, "all");
    });

    // Check pagination controls
    // Note: The previous/next buttons are only rendered if total > 50. Mock provides total=60.

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    });

    const nextButtons = screen.getAllByRole("button", { name: "Next Page" });
    const nextButton = nextButtons[0];
    expect(nextButton).toBeEnabled();

    await user.click(nextButton);

    await waitFor(() => {
      expect(adminApi.getClinicalAlerts).toHaveBeenCalledWith(2, 50, "all");
    });

    // Previous button should be enabled on page 2
    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
      const prevButton = screen.getByRole("button", { name: "Previous Page" });
      expect(prevButton).toBeEnabled();
    });
  });

  it("opens and closes alert details", async () => {
    render(<ClinicalAlertsTab />);

    await waitFor(() => {
      expect(
        screen.getByText("High arousal detected without valance counter-balance")
      ).toBeInTheDocument();
    });

    // Details panel should show placeholder initially
    expect(
      screen.getByText("Select an alert to view full trigger details and thresholds.")
    ).toBeInTheDocument();

    // Click an alert
    const alertItem = screen.getByLabelText(/View alert details: High arousal detected/i);
    await user.click(alertItem);

    // Verify details panel content
    expect(screen.getByText("Alert Details")).toBeInTheDocument();
    expect(screen.getByText("session-1")).toBeInTheDocument(); // Session ID

    // Close details
    const closeButton = screen.getByLabelText("Close Details");
    await user.click(closeButton);

    expect(
      screen.getByText("Select an alert to view full trigger details and thresholds.")
    ).toBeInTheDocument();
  });
});
