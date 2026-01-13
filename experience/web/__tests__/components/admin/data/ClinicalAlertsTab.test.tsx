
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ClinicalAlertsTab from "@/components/admin/data/ClinicalAlertsTab";
import { adminApi } from "@/utils/api";
import { act } from "react-dom/test-utils";

jest.mock("@/utils/api", () => ({
  adminApi: {
    getClinicalAlerts: jest.fn(),
  },
}));

describe("ClinicalAlertsTab", () => {
  const mockAlerts = {
    items: [
      {
        id: "alert1",
        level: "critical",
        message: "High heart rate detected",
        suggestion: "Check vitals",
        timestamp: "2024-01-01T12:00:00Z",
        version: "1.0",
        session_id: "sess1",
        triggered_by: { bpm: 120 },
        threshold_used: { max_bpm: 100 }
      },
      {
        id: "alert2",
        level: "warning",
        message: "Moderate anxiety",
        suggestion: "Suggest calm path",
        timestamp: "2024-01-02T12:00:00Z",
        version: "1.1",
        session_id: "sess2",
        triggered_by: { anxiety_score: 0.6 },
        threshold_used: { anxiety_limit: 0.5 }
      }
    ],
    total: 60 // Enable pagination
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", async () => {
    (adminApi.getClinicalAlerts as jest.Mock).mockReturnValue(new Promise(() => { }));
    render(<ClinicalAlertsTab />);
    expect(screen.getByText("Loading alerts...")).toBeInTheDocument();
  });

  it("renders alerts list on success", async () => {
    (adminApi.getClinicalAlerts as jest.Mock).mockResolvedValue(mockAlerts);
    render(<ClinicalAlertsTab />);

    await waitFor(() => {
      expect(screen.getByText("High heart rate detected")).toBeInTheDocument();
    });

    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(screen.getByText("warning")).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
  });

  it("handles empty state", async () => {
    (adminApi.getClinicalAlerts as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    render(<ClinicalAlertsTab />);

    await waitFor(() => {
      expect(screen.getByText("No alerts found matching filter.")).toBeInTheDocument();
    });
  });

  it("handles filtering", async () => {
    (adminApi.getClinicalAlerts as jest.Mock).mockResolvedValue(mockAlerts);
    render(<ClinicalAlertsTab />);
    await waitFor(() => expect(screen.getByText("High heart rate detected")).toBeInTheDocument());

    const filter = screen.getByLabelText("Filter by Severity");
    fireEvent.change(filter, { target: { value: "critical" } });

    await waitFor(() => {
      expect(adminApi.getClinicalAlerts).toHaveBeenCalledWith(1, 50, "critical");
    });
  });

  it("handles pagination", async () => {
    (adminApi.getClinicalAlerts as jest.Mock).mockResolvedValue(mockAlerts);
    render(<ClinicalAlertsTab />);
    await waitFor(() => expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Next Page"));

    await waitFor(() => {
      expect(adminApi.getClinicalAlerts).toHaveBeenCalledWith(2, 50, "all");
    });

    expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Previous Page"));

    await waitFor(() => {
      expect(adminApi.getClinicalAlerts).toHaveBeenCalledWith(1, 50, "all");
    });
  });

  it("handles alert selection and details view", async () => {
    (adminApi.getClinicalAlerts as jest.Mock).mockResolvedValue(mockAlerts);
    render(<ClinicalAlertsTab />);
    await waitFor(() => expect(screen.getByText("High heart rate detected")).toBeInTheDocument());

    // Initial state: details placeholder
    expect(screen.getByText("Select an alert to view full trigger details and thresholds.")).toBeInTheDocument();

    // Click item
    fireEvent.click(screen.getByLabelText("View alert details: High heart rate detected"));

    // Details view
    expect(screen.getByText("Alert Details")).toBeInTheDocument();
    expect(screen.getByText("sess1")).toBeInTheDocument();
    // JSON content in details
    expect(screen.getByText(/"bpm": 120/)).toBeInTheDocument();

    // Close details
    fireEvent.click(screen.getByLabelText("Close Details"));
    expect(screen.getByText("Select an alert to view full trigger details and thresholds.")).toBeInTheDocument();
  });

  it("handles keyboard interaction for selection", async () => {
    (adminApi.getClinicalAlerts as jest.Mock).mockResolvedValue(mockAlerts);
    render(<ClinicalAlertsTab />);
    await waitFor(() => expect(screen.getByText("High heart rate detected")).toBeInTheDocument());

    const item = screen.getByLabelText("View alert details: High heart rate detected");

    fireEvent.keyDown(item, { key: "Enter" });
    expect(screen.getByText("Alert Details")).toBeInTheDocument();
  });

  it("handles refresh", async () => {
    (adminApi.getClinicalAlerts as jest.Mock).mockResolvedValue(mockAlerts);
    render(<ClinicalAlertsTab />);
    await waitFor(() => expect(screen.getByText("High heart rate detected")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Refresh Alerts"));
    expect(adminApi.getClinicalAlerts).toHaveBeenCalledTimes(2);
  });

  it("handles fetch error", async () => {
    (adminApi.getClinicalAlerts as jest.Mock).mockRejectedValue(new Error("Fetch failed"));
    render(<ClinicalAlertsTab />);

    await waitFor(() => {
      // Should default to not loading and maybe empty? or error state?
      // Component only logs error and sets loading false.
      // So list remains empty?
      // "Loading alerts..." removes.
      // "No alerts found matching filter." appears (since alerts is empty [] and loading false).
      expect(screen.getByText("No alerts found matching filter.")).toBeInTheDocument();
    });
  });

  it("renders different severity colors", async () => {
    const mixedAlerts = {
      items: [
        { ...mockAlerts.items[0], id: "a1", level: "critical" },
        { ...mockAlerts.items[0], id: "a2", level: "warning" },
        { ...mockAlerts.items[0], id: "a3", level: "attention" },
        { ...mockAlerts.items[0], id: "a4", level: "unknown" },
      ],
      total: 4
    };
    (adminApi.getClinicalAlerts as jest.Mock).mockResolvedValue(mixedAlerts);
    render(<ClinicalAlertsTab />);

    await waitFor(() => expect(screen.getByText("critical")).toBeInTheDocument());

    const critical = screen.getByText("critical");
    expect(critical).toHaveClass("text-red-400");

    const warning = screen.getByText("warning");
    expect(warning).toHaveClass("text-orange-400");

    const attention = screen.getByText("attention");
    expect(attention).toHaveClass("text-yellow-400");

    const unknown = screen.getByText("unknown");
    expect(unknown).toHaveClass("text-gray-400");
  });
});
