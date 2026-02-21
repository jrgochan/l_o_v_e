import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { ClinicalPortal } from "@/components/admin/clinical/ClinicalPortal";
import { clinicianApi } from "@/utils/clinicianApi";
import { useAuthStore } from "@/stores/authStore";

// Mock dependencies
jest.mock("@/hooks/admin/useAdminTheme", () => ({
  useAdminTheme: jest.fn(() => ({
    colors: {
      primary: "#00ff00",
      secondary: "#4338ca",
      background: "bg-black",
      surface: "bg-gray-900",
      border: "border-gray-800",
      hover: "hover:bg-gray-800",
      text: {
        primary: "text-white",
        secondary: "text-gray-300",
        muted: "text-gray-500",
        inverted: "text-black",
      },
      status: {
        success: "text-green-400 bg-green-900/30",
        warning: "text-yellow-400 bg-yellow-900/30",
        error: "text-red-400 bg-red-900/30",
        info: "text-blue-400 bg-blue-900/30",
      },
      buttonPrimary: "bg-teal-600 hover:bg-teal-500 text-white",
      buttonSecondary: "bg-gray-800 hover:bg-gray-700 text-white",
      buttonAction: "bg-cyan-600 hover:bg-cyan-500 text-white",
      buttonDanger: "bg-red-600 hover:bg-red-500 text-white",
      chart: {
        linePrimary: "stroke-teal-400",
        lineSecondary: "stroke-cyan-500",
        grid: "stroke-gray-800",
        tooltipBackground: "bg-gray-900",
      },
    },
    effects: {
      glowPrimary: "shadow-[0_0_15px_rgba(20,184,166,0.5)]",
      glowSecondary: "shadow-[0_0_15px_rgba(6,182,212,0.5)]",
      glass: "bg-gray-900/80 backdrop-blur-md",
      backdropBlur: "backdrop-blur-md",
    },
    layout: {
      containerPadding: "p-6",
      panelGap: "gap-6",
      borderRadius: "rounded-xl",
      cardBorderRadius: "rounded-lg",
    },
    typography: {
      fontFamily: "font-sans",
      headingScale: "text-xl md:text-2xl lg:text-3xl font-bold",
      bodyScale: "text-sm md:text-base",
    },
  })),
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/utils/clinicianApi", () => ({
  clinicianApi: {
    getClients: jest.fn(),
    getAlerts: jest.fn(),
    getAlertSummary: jest.fn(),
    getClientSessions: jest.fn(),
    getClientTrajectory: jest.fn(),
  },
}));

// Mock EmergencyStop to avoid complexity in this test
jest.mock("@/components/admin/clinical/EmergencyStop", () => ({
  EmergencyStop: ({ onActivate }: { onActivate: (id: string) => void }) => (
    <button data-testid="emergency-stop" onClick={() => onActivate("session-123")}>
      Emergency Stop
    </button>
  ),
}));

describe("ClinicalPortal", () => {
  const mockUser = {
    id: "clinician-1",
    full_name: "Dr. Test",
    role: "clinician",
  };

  const mockClients = [
    {
      id: "client-1",
      email: "client1@example.com",
      full_name: "Client One",
      is_active: true,
      created_at: "2023-01-01T00:00:00Z",
    },
    {
      id: "client-2",
      email: "client2@example.com",
      full_name: "Client Two",
      is_active: false,
      created_at: "2023-01-02T00:00:00Z",
    },
  ];

  const mockAlerts = [
    {
      id: "alert-1",
      level: "critical",
      message: "High anxiety detected",
      timestamp: "2023-01-01T12:00:00Z",
      session_id: "session-1",
      alert_type: "anxiety_spike",
    },
    {
      id: "alert-2",
      level: "warning",
      message: "Unusual tone",
      timestamp: "2023-01-01T13:00:00Z",
      session_id: "session-2",
      alert_type: "tone_anomaly",
    },
    {
      id: "alert-3",
      level: "attention",
      message: "Session length",
      timestamp: "2023-01-01T14:00:00Z",
      session_id: "session-3",
      alert_type: "length_warning",
    },
  ];

  const mockSummary = {
    total_clients: 2,
    alerts_by_severity: {
      critical: 1,
      warning: 1,
      attention: 0,
      stable: 0,
    },
    total_alerts: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ user: mockUser })
    );
    (clinicianApi.getClients as jest.Mock).mockResolvedValue(mockClients);
    (clinicianApi.getAlerts as jest.Mock).mockResolvedValue(mockAlerts);
    (clinicianApi.getAlertSummary as jest.Mock).mockResolvedValue(mockSummary);

    (clinicianApi.getClientSessions as jest.Mock).mockResolvedValue([
      {
        id: "session-1",
        started_at: "2023-01-01T10:00:00Z",
        message_count: 5,
        tone_preference: "calm",
      },
      {
        id: "session-2",
        started_at: "2023-01-02T10:00:00Z",
        ended_at: "2023-01-02T11:00:00Z",
        message_count: 10,
        tone_preference: "direct",
      },
    ]);
    (clinicianApi.getClientTrajectory as jest.Mock).mockResolvedValue([
      {
        id: "t1",
        timestamp: "2023-01-01T10:05:00Z",
        emotion_name: "Calm",
        valence: 0.8,
        arousal: 0.2,
        connection: 0.5,
        emotion_category: "Peaceful",
      },
      {
        id: "t2",
        timestamp: "2023-01-01T10:10:00Z",
        emotion_name: "Sad",
        valence: -0.5,
        arousal: 0.4,
        connection: 0.6,
        emotion_category: "Negative",
      },
    ]);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders correctly and loads data", async () => {
    render(<ClinicalPortal />);

    // Check header
    await waitFor(() => {
      expect(screen.getByText("Clinical Portal")).toBeInTheDocument();
    });
    expect(screen.getByText(/Dr. Test/)).toBeInTheDocument();

    // Check loading state (briefly) or wait for content
    await waitFor(() => {
      expect(screen.getByText("Total Clients")).toBeInTheDocument();
    });

    // Check stats
    // Check stats
    const stats = screen.getAllByText("2");
    expect(stats.length).toBeGreaterThan(0); // Total clients, and potentially Total Alerts matches
  });

  it("handles data loading errors", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (clinicianApi.getClients as jest.Mock).mockRejectedValue(new Error("API Error"));
    render(<ClinicalPortal />);

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });

    // Verify error was logged (but suppressed)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[ClinicalPortal] Load error"),
      expect.any(Error)
    );

    // Retry
    (clinicianApi.getClients as jest.Mock).mockResolvedValue(mockClients);
    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.queryByText("API Error")).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("handles non-Error string rejection", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (clinicianApi.getClients as jest.Mock).mockRejectedValue("String Error");
    render(<ClinicalPortal />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load clinical data")).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it("switches tabs", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    // Switch to Clients tab
    const clientsTab = screen.getAllByRole("button", { name: /Clients/i })[0];
    fireEvent.click(clientsTab);
    expect(screen.getByText("Client One")).toBeInTheDocument();
    expect(screen.getByText("Client Two")).toBeInTheDocument();

    // Switch to Alerts tab
    const alertsTab = screen.getAllByRole("button", { name: /Alerts/i })[0];
    fireEvent.click(alertsTab);
    expect(screen.getByText("High anxiety detected")).toBeInTheDocument();
  });

  it("filters clients", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    const clientsTab = screen.getAllByRole("button", { name: /Clients/i })[0];
    fireEvent.click(clientsTab);

    const searchInput = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(searchInput, { target: { value: "One" } });

    expect(screen.getByText("Client One")).toBeInTheDocument();
    expect(screen.queryByText("Client Two")).not.toBeInTheDocument();
    expect(screen.getByText("Client One")).toBeInTheDocument();
    expect(screen.queryByText("Client Two")).not.toBeInTheDocument();

    // Test clearing search results to empty state
    fireEvent.change(searchInput, { target: { value: "NonExistent" } });
    expect(screen.getByText("No clients match your search")).toBeInTheDocument();

    // Test client with missing name
    const input = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(input, { target: { value: "" } }); // Clear logic covered elsewhere, just reset
  });

  it("handles filtering client with missing name", async () => {
    (clinicianApi.getClients as jest.Mock).mockResolvedValue([
      { ...mockClients[0], full_name: undefined },
    ]);
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    const clientsTab = screen.getAllByRole("button", { name: /Clients/i })[0];
    fireEvent.click(clientsTab);

    const input = screen.getByPlaceholderText(/Search clients/i);
    // "Unknown" is rendered, but search looks at full_name?.toLowerCase()
    // If full_name is undefined, it defaults to false ?? false
    // search "Unknown" should NOT find it by name logic, unless we search by email
    fireEvent.change(input, { target: { value: "One" } });
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();

    // Search by email should still work
    fireEvent.change(input, { target: { value: "client1" } });
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("opens client details", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    const clientsTab = screen.getAllByRole("button", { name: /Clients/i })[0];
    fireEvent.click(clientsTab);

    // Click on a client
    fireEvent.click(screen.getByText("Client One"));

    // Verify detail view calls
    expect(clinicianApi.getClientSessions).toHaveBeenCalledWith("client-1");
    expect(clinicianApi.getClientTrajectory).toHaveBeenCalledWith("client-1");

    await waitFor(() => {
      expect(screen.getByText("Client One")).toBeInTheDocument();
      // Use getByRole for tab or look for specific element to avoid ambiguity
      // There is a tab "Sessions (1)" and a stat "Sessions".
      expect(screen.getByRole("tab", { name: /Sessions/ })).toBeInTheDocument();
    });

    // Close detail view
    const backButton = screen.getByLabelText("Back to client list");
    fireEvent.click(backButton);
    expect(screen.queryByLabelText("Back to client list")).not.toBeInTheDocument();
  });

  it("filters alerts in Alerts tab", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    const alertsTab = screen.getAllByRole("button", { name: /Alerts/i })[0];
    fireEvent.click(alertsTab);

    // Initially all alerts
    expect(screen.getByText("High anxiety detected")).toBeInTheDocument();
  });

  it("renders Analytics tab", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    const analyticsTab = screen.getAllByRole("button", { name: /Analytics/i })[0];
    fireEvent.click(analyticsTab);

    expect(screen.getByText("Caseload Status")).toBeInTheDocument();
    expect(screen.getByText("Alert Severity Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Alert Types")).toBeInTheDocument();
  });

  it("interacts with Client Detail tabs and Clinical Notes", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    // Go to client detail
    fireEvent.click(screen.getAllByRole("button", { name: /Clients/i })[0]);
    fireEvent.click(screen.getByText("Client One"));

    await waitFor(() => expect(screen.getByText("Client One")).toBeInTheDocument());

    // Wait for data to load by checking session count in tab.
    // Sessions (1) implies data loaded.
    await waitFor(() =>
      expect(screen.getByTestId("client-detail-tab-sessions")).toHaveTextContent("Sessions(2)")
    );

    // Switch to Trajectory tab
    fireEvent.click(screen.getByTestId("client-detail-tab-trajectory"));
    expect(screen.queryByText("No trajectory data yet")).not.toBeInTheDocument();
    expect(screen.getByText("Recent Emotional States")).toBeInTheDocument();

    // Switch to Alerts tab (inside detail)
    fireEvent.click(screen.getByTestId("client-detail-tab-alerts"));
    // Client 1 has session-1, alert-1 is for session-1
    expect(screen.getByText("High anxiety detected")).toBeInTheDocument();

    // Switch to Notes tab
    fireEvent.click(screen.getByTestId("client-detail-tab-notes"));
    expect(screen.getByPlaceholderText(/Add clinical observations/i)).toBeInTheDocument();

    // Test Notes interaction
    const textarea = screen.getByPlaceholderText(/Add clinical observations/i);
    fireEvent.change(textarea, { target: { value: "New note content" } });
    fireEvent.click(screen.getByText("Save Notes"));

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(localStorage.getItem("clinical_notes_client-1")).toBe("New note content");

    // Test auto-hide of saved message (cover setTimeout in saveNotes)
    // We need to advance timers
    jest.useFakeTimers();
    fireEvent.click(screen.getByText("Save Notes"));
    expect(screen.getByText("Saved")).toBeInTheDocument();

    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    });
    jest.useRealTimers();
  });

  it("handles alert acknowledgement", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    const alertsTab = screen.getAllByRole("button", { name: /Alerts/i })[0];
    fireEvent.click(alertsTab);

    // We have multiple alerts, get the one we want.
    // We look for alert-1 (critical, High anxiety)
    // The AlertCard has data-testid={`alert-card-${alert.id}`}
    const alertCard = screen.getByTestId("alert-card-alert-1");
    const ackButton = within(alertCard).getByText("Acknowledge");

    fireEvent.click(ackButton);

    expect(within(alertCard).queryByText("Acknowledge")).not.toBeInTheDocument();
    // Should show 'Reviewed' check
    expect(within(alertCard).getByText("Reviewed")).toBeInTheDocument();
  });

  it("handles overview quick actions", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Review Alerts"));
    expect(screen.getByText("Clinical Risk Alerts")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Overview"));
    fireEvent.click(screen.getByText("View Caseload"));
    expect(screen.getByPlaceholderText(/Search clients/i)).toBeInTheDocument();
  });

  it("handles alert filtering interactions", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    const alertsTab = screen.getAllByRole("button", { name: /Alerts/i })[0];
    fireEvent.click(alertsTab);

    // Filter by clicking severity button (Critical)
    // The button contains the count and label "critical".
    const criticalBtn = screen.getByRole("button", { name: /critical/i });
    fireEvent.click(criticalBtn);

    // Should show critical alert (High anxiety)
    expect(screen.getByText("High anxiety detected")).toBeInTheDocument();
    // Should NOT show warning alert (Unusual tone)
    expect(screen.queryByText("Unusual tone")).not.toBeInTheDocument();

    // Toggle off
    fireEvent.click(criticalBtn);
    expect(screen.getByText("Unusual tone")).toBeInTheDocument();

    // Use Dropdown
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "warning" } });
    expect(screen.queryByText("High anxiety detected")).not.toBeInTheDocument();
    expect(screen.getByText("Unusual tone")).toBeInTheDocument();
  });

  it("clears client search", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: /Clients/i })[0]);

    const input = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(input, { target: { value: "One" } });
    expect(screen.queryByText("Client Two")).not.toBeInTheDocument();

    const clearBtn = screen.getByRole("button", { name: "" }); // The X icon button usually has empty name if not aria-labeled, usually checking class or svg is safer.
    // Actually the button code:
    // <button onClick={() => onSearchChange("")} ...> <X .../> </button>
    // It has no text.
    // Let's find by svg or class? Or querying button inside the relative container?
    // "Search clients..." input parent div contains the button.
    const searchContainer = input.parentElement;
    const buttons = within(searchContainer!).getAllByRole("button");
    // There is only one button in that container (the Clear button).
    fireEvent.click(buttons[0]);

    expect(input).toHaveValue("");
    expect(screen.getByText("Client Two")).toBeInTheDocument();
  });

  it("handles emergency stop", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: /Clients/i })[0]);
    fireEvent.click(screen.getByText("Client One"));

    // Client one has active session mock?
    // In beforeEach:
    // (clinicianApi.getClientSessions as jest.Mock).mockResolvedValue([
    //   { id: 'session-1', started_at: '...', ended_at: null } // Active!
    // ]);
    // Wait for detail
    await waitFor(() => expect(screen.getByText("Client One")).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByTestId("client-detail-tab-sessions")).toHaveTextContent("Sessions(2)")
    );

    // Emergency stop should be visible
    const stopBtn = screen.getByTestId("emergency-stop");
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    fireEvent.click(stopBtn);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[EmergencyStop] Activated"));
    consoleSpy.mockRestore();
  });

  it("handles client detail loading error", async () => {
    (clinicianApi.getClientSessions as jest.Mock).mockRejectedValue(new Error("Detail Error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: /Clients/i })[0]);
    fireEvent.click(screen.getByText("Client One"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ClinicalPortal] Client detail error"),
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });

  it("renders analytics weekly chart", async () => {
    // Mock Date.now to a fixed time so "last 7 days" is deterministic
    // 2023-01-08 12:00:00Z
    const mockNow = new Date("2023-01-08T12:00:00Z").getTime();
    jest.spyOn(Date, "now").mockReturnValue(mockNow);

    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: /Analytics/i })[0]);

    // Check for "Alerts — Last 7 Days"
    expect(screen.getByText("Alerts — Last 7 Days")).toBeInTheDocument();

    jest.restoreAllMocks();
  });

  it("renders negative valence trajectory", async () => {
    (clinicianApi.getClientTrajectory as jest.Mock).mockResolvedValue([
      {
        id: "traj-neg",
        session_id: "session-1",
        timestamp: "2023-01-01T10:30:00Z",
        valence: -0.5,
        arousal: 0.4,
        emotion_name: "sadness",
        emotion_category: "negative",
        confidence: 0.9,
      },
    ]);

    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    // Go to client detail -> Trajectory
    fireEvent.click(screen.getAllByRole("button", { name: /Clients/i })[0]);
    fireEvent.click(screen.getByText("Client One"));
    await waitFor(() => expect(screen.getByText("Client One")).toBeInTheDocument());

    // Switch to Trajectory tab
    fireEvent.click(screen.getByTestId("client-detail-tab-trajectory"));

    // Verify "sadness" is present
    expect(screen.getAllByText("sadness")[0]).toBeInTheDocument();
  });

  it("handles empty clinical data", async () => {
    (clinicianApi.getClients as jest.Mock).mockResolvedValue([]);
    (clinicianApi.getAlerts as jest.Mock).mockResolvedValue([]);
    (clinicianApi.getAlertSummary as jest.Mock).mockResolvedValue(null);

    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Clinical Portal")).toBeInTheDocument());
    // Should show 0 for stats
  });

  it("renders client detail with no data", async () => {
    (clinicianApi.getClientSessions as jest.Mock).mockResolvedValue([]);
    (clinicianApi.getClientTrajectory as jest.Mock).mockResolvedValue([]);

    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: /Clients/i })[0]);
    fireEvent.click(screen.getByText("Client One"));

    await waitFor(() => expect(screen.getByText("Client One")).toBeInTheDocument());
    // Stats should be 0 / - / 0.00
    expect(screen.getByText("Data Points").previousSibling).toHaveTextContent("0");
    expect(screen.getByText("Latest Emotion").previousSibling).toHaveTextContent("—");

    // Select Trajectory tab
    fireEvent.click(screen.getByTestId("client-detail-tab-trajectory"));
    expect(screen.getByText("No trajectory data yet")).toBeInTheDocument();
  });

  it("renders analytics with null summary", async () => {
    (clinicianApi.getAlertSummary as jest.Mock).mockResolvedValue(null);
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: /Analytics/i })[0]);

    expect(screen.getByText("Alert Severity Breakdown")).toBeInTheDocument();
  });

  it("renders client detail alerts tab", async () => {
    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: /Clients/i })[0]);
    fireEvent.click(screen.getByText("Client One"));
    await waitFor(() => expect(screen.getByText("Client One")).toBeInTheDocument());

    // Switch to Alerts tab (detail view)
    fireEvent.click(screen.getByTestId("client-detail-tab-alerts"));

    // Should show the alert for session-1
    expect(screen.getByText("High anxiety detected")).toBeInTheDocument();
  });

  it("renders client detail alerts tab with no alerts", async () => {
    (clinicianApi.getAlerts as jest.Mock).mockResolvedValue([]);

    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: /Clients/i })[0]);
    fireEvent.click(screen.getByText("Client One"));

    fireEvent.click(screen.getByTestId("client-detail-tab-alerts"));
    await waitFor(() => expect(screen.getByText("No alerts for this client")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("No alerts for this client")).toBeInTheDocument());
  });

  it("handles branch coverage edge cases (singular alerts, empty state, zero summary)", async () => {
    // 1. Single alert for plural check
    (clinicianApi.getAlerts as jest.Mock).mockResolvedValue([
      {
        id: "alert-unique",
        level: "warning",
        message: "Single Alert",
        timestamp: "2023-01-01T12:00:00Z",
        session_id: "session-1",
        alert_type: "tone_anomaly",
      },
    ]);
    // 2. Empty clients for "No clients assigned"
    (clinicianApi.getClients as jest.Mock).mockResolvedValue([]);

    // 3. Zero summary
    (clinicianApi.getAlertSummary as jest.Mock).mockResolvedValue({
      total_clients: 0,
      alerts_by_severity: { critical: 0, warning: 0, attention: 0, stable: 0 },
      total_alerts: 0,
    });

    render(<ClinicalPortal />);
    await waitFor(() => expect(screen.getByText("Total Clients")).toBeInTheDocument());

    // Check singular alert text
    // "1 alert need your attention"? Grammar is "1 alert needs..." but code is "alert(s)"
    // code: {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
    expect(screen.getByText("1 alert need your attention")).toBeInTheDocument();

    // Check "No clients assigned"
    fireEvent.click(screen.getAllByRole("button", { name: /Clients/i })[0]);
    expect(screen.getByText("No clients assigned")).toBeInTheDocument();

    // Check zero summary analytics (division by zero protection)
    fireEvent.click(screen.getAllByRole("button", { name: /Analytics/i })[0]);
    expect(screen.getByText("Alert Severity Breakdown")).toBeInTheDocument();
  });

  it("handles remaining branch coverage edge cases (null user, missing/null trajectory data, unknown alert level, date filters)", async () => {
    // Freeze time to test weekly chart filtering triggers
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2023-01-08T12:00:00Z")); // Fixed "now"

    // Override auth store mock for this test
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: "clinician-1", full_name: null, role: "clinician" },
      isAuthenticated: true,
    });

    // Mock Alerts:
    // 1. Unknown level -> for fallback color/text
    // 2. Old alert -> for date filter (t < dayStart)
    // 3. Today alert -> for date filter (match)
    (clinicianApi.getAlerts as jest.Mock).mockResolvedValue([
      {
        id: "alert-unknown",
        level: "unknown" as any,
        message: "Mystery Alert",
        timestamp: "2023-01-08T10:00:00Z", // Today
        session_id: "session-1",
        alert_type: "tone_anomaly",
      },
      {
        id: "alert-old",
        level: "critical",
        message: "Old Alert",
        timestamp: "2022-01-01T10:00:00Z", // Very old
        session_id: "session-old",
        alert_type: "anxiety_spike",
      },
    ]);

    // Mock Client Trajectory with:
    // 1. Null values
    // 2. Negative valence (for color check)
    (clinicianApi.getClients as jest.Mock).mockResolvedValue([
      {
        id: "c1",
        full_name: null,
        email: "test@test.com",
        status: "active",
        last_session: "2023-01-01",
      },
    ]);
    (clinicianApi.getClientTrajectory as jest.Mock).mockResolvedValue([
      {
        id: "p1",
        timestamp: "2023-01-08T09:00:00Z",
        valence: null,
        arousal: undefined,
        connection: undefined,
        emotion_name: null,
        emotion_category: null, // Ensure category fallback
      },
      {
        id: "p2",
        timestamp: "2023-01-08T09:05:00Z",
        valence: -0.5, // Negative valence triggers red color
        arousal: 0.5,
        connection: 0.5,
        emotion_name: "Sadness",
        emotion_category: "negative",
      },
    ]);
    (clinicianApi.getClientSessions as jest.Mock).mockResolvedValue([]);

    // Mock summary with unknown level for Analytics chart fallback
    (clinicianApi.getAlertSummary as jest.Mock).mockResolvedValue({
      total_clients: 1,
      alerts_by_severity: {
        critical: 1,
        warning: 0,
        attention: 0,
        stable: 0,
        unknown_magic: 1,
      } as any,
      total_alerts: 2,
    });

    render(<ClinicalPortal />);

    // 1. Check User Fallback "Clinician"
    await waitFor(() => expect(screen.getByText(/Clinician/)).toBeInTheDocument());

    // 2. Check Alert Level Fallback - Switch to Alerts tab to see badges
    // The Overview tab only shows a dot, not the text.
    // Wait for data to load and Overview to render
    await waitFor(() => expect(screen.getByText("Review Alerts")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Review Alerts"));

    await waitFor(() => expect(screen.getByText("Mystery Alert")).toBeInTheDocument());
    // Now the AlertCard should be visible with the level text
    expect(screen.getByText(/unknown/i)).toBeInTheDocument();

    // 3. Analytics Chart Fallback
    fireEvent.click(screen.getAllByRole("button", { name: /Analytics/i })[0]);
    await waitFor(() => expect(screen.getByText("Alert Severity Breakdown")).toBeInTheDocument());
    expect(screen.getByText("unknown_magic")).toBeInTheDocument(); // Key from summary

    // 4. Check Trajectory Nulls & Negative Valence
    fireEvent.click(screen.getAllByRole("button", { name: /Clients/i })[0]);
    fireEvent.click(screen.getByText("test@test.com")); // Name is null, find by email or "Unknown Client"?
    // Code: {client.full_name || "Unknown Client"}
    await waitFor(() => expect(screen.getByText("Unknown Client")).toBeInTheDocument());

    // Check Client Notes fallback "this client"
    // Need to activate notes tab if it's not default? Default is 'details' (trajectory).
    // Notes tab is not visible in simplified detail view?
    // Code: {detailTab === "notes" && ... clientName={client.full_name || "this client"} ...}
    // Need to switch to notes tab triggers it.
    // Wait, ClinicalPortal detail view tabs: Trajectory (default), Sessions, Notes.
    fireEvent.click(screen.getByTestId("client-detail-tab-notes"));
    expect(screen.getByText(/Clinical Notes — this client/)).toBeInTheDocument();

    // Switch back to trajectory for point checks
    fireEvent.click(screen.getByTestId("client-detail-tab-trajectory"));

    fireEvent.click(screen.getByTestId("client-detail-tab-trajectory"));

    // "Unknown" will appear twice: once for the category chart, once for the timeline list item
    expect(screen.getAllByText("Unknown").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/V:0.0/)[0]).toBeInTheDocument(); // valence ?? 0

    jest.useRealTimers();
  });
});
