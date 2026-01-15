import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminUserDetailsPage from "@/app/admin/users/[id]/page";
import { api } from "@/utils/api";
import { User, UserRole } from "@/types/auth";
import { ChatSession } from "@/types/chat";

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockUseParams = jest.fn(() => ({ id: "user-123" }));

jest.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock api
jest.mock("@/utils/api", () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
  },
  adminApi: {},
}));

// Mock AdminLayout
jest.mock("@/components/admin/layout/AdminLayout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

// Mock Chart
jest.mock("@/components/admin/users/TrajectoryChart", () => ({
  TrajectoryChart: () => <div data-testid="trajectory-chart">Chart</div>,
}));

describe("AdminUserDetailsPage", () => {
  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
    full_name: "Test User",
    role: "user" as UserRole,
    is_active: true,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  const mockSessions: ChatSession[] = [
    {
      id: "s1",
      user_id: "user-123",
      started_at: "2024-01-01T10:00:00Z",
      ended_at: "2024-01-01T10:30:00Z",
      message_count: 10,
      tone_preference: "warm",
    } as ChatSession,
  ];

  const mockTrajectory = [{ timestamp: 100, valence: 0.5, arousal: 0.2 }];

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseParams.mockReturnValue({ id: "user-123" } as any);
  });

  it("renders loading state initially", async () => {
    (api.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<AdminUserDetailsPage />);
    expect(screen.getByText("Loading user details...")).toBeInTheDocument();
  });

  it("handles missing id parameter", async () => {
    mockUseParams.mockReturnValue({} as any); // No ID
    render(<AdminUserDetailsPage />);
    // If no ID, effect doesn't run, stays loading
    expect(screen.getByText("Loading user details...")).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("renders user details and profile tab by default", async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce(mockUser) // User
      .mockResolvedValueOnce(mockSessions) // Sessions
      .mockResolvedValueOnce(mockTrajectory); // Trajectory

    render(<AdminUserDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Edit User Access")).toBeInTheDocument(); // Profile tab content
  });

  it("handles user without full name and inactive status", async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce({ ...mockUser, full_name: "", is_active: false })
      .mockResolvedValueOnce(mockSessions)
      .mockResolvedValueOnce(mockTrajectory);

    render(<AdminUserDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Unknown User")).toBeInTheDocument();
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });
  });

  it("handles fetch error", async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    render(<AdminUserDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Fetch failed")).toBeInTheDocument();
    });
  });

  it("handles fetch error and back navigation", async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    render(<AdminUserDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Fetch failed")).toBeInTheDocument();
    });

    // Click back
    fireEvent.click(screen.getByText("← Back to Users"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("handles non-Error rejection", async () => {
    (api.get as jest.Mock).mockRejectedValue("Unknown error");

    render(<AdminUserDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load user data")).toBeInTheDocument();
    });
  });

  it("handles user not found (null user, no error)", async () => {
    // Return null user
    (api.get as jest.Mock)
      .mockResolvedValueOnce(null) // User
      .mockResolvedValueOnce([]) // Sessions
      .mockResolvedValueOnce([]); // Trajectory

    render(<AdminUserDetailsPage />);

    await waitFor(() => {
      // Should show "User not found" fallback
      expect(screen.getByText("User not found")).toBeInTheDocument();
    });
  });

  it("handles tab switching and empty data", async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce([]) // Empty sessions
      .mockResolvedValueOnce([]); // Empty trajectory

    render(<AdminUserDetailsPage />);
    await waitFor(() => expect(screen.getByText("Test User")).toBeInTheDocument());

    // Switch to Sessions
    fireEvent.click(screen.getByText(/Sessions \(\d+\)/));
    expect(screen.getByText("No sessions recorded.")).toBeInTheDocument();

    // Switch to Trajectory
    fireEvent.click(screen.getByText(/Trajectory Points \(\d+\)/));
    expect(screen.getByText("No trajectory data available.")).toBeInTheDocument();
  });

  it("renders trajectory chart when data is available", async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockSessions)
      .mockResolvedValueOnce(mockTrajectory);

    render(<AdminUserDetailsPage />);
    await waitFor(() => expect(screen.getByText("Test User")).toBeInTheDocument());

    // Switch to Trajectory
    fireEvent.click(screen.getByText(/Trajectory Points \(\d+\)/));

    // Should show chart (mocked) and NOT "No data"
    expect(screen.getByTestId("trajectory-chart")).toBeInTheDocument();
    expect(screen.queryByText("No trajectory data available.")).not.toBeInTheDocument();
  });

  it("handles active session display", async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce([
        {
          ...mockSessions[0],
          ended_at: null, // Active
        },
      ])
      .mockResolvedValueOnce(mockTrajectory);

    render(<AdminUserDetailsPage />);
    await waitFor(() => expect(screen.getByText("Test User")).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Sessions \(\d+\)/));

    // "Active" appears twice (Status and Table). Check table cell explicitly or getAll.
    const activeElements = screen.getAllByText("Active");
    expect(activeElements.length).toBeGreaterThanOrEqual(2);
    expect(activeElements.some((el) => el.tagName === "TD")).toBe(true);
  });

  it("handles user update (save)", async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockSessions)
      .mockResolvedValueOnce(mockTrajectory);

    (api.put as jest.Mock).mockResolvedValue({});
    window.alert = jest.fn(); // Mock alert

    render(<AdminUserDetailsPage />);
    await waitFor(() => expect(screen.getByText("Test User")).toBeInTheDocument());

    // Change role
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "admin" } });

    // Toggle active
    const toggleBtn = screen.getByLabelText("Toggle account active");
    fireEvent.click(toggleBtn);

    // Save
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/admin/users/user-123", {
        role: "admin",
        is_active: false, // Toggled from true
      });
      expect(window.alert).toHaveBeenCalledWith("User updated successfully");
    });
  });

  it("handles save error", async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockSessions)
      .mockResolvedValueOnce(mockTrajectory);

    (api.put as jest.Mock).mockRejectedValue(new Error("Update failed"));
    window.alert = jest.fn();

    render(<AdminUserDetailsPage />);
    await waitFor(() => expect(screen.getByText("Test User")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Failed to update user"));
    });
  });

  it("handles save non-Error rejection", async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockSessions)
      .mockResolvedValueOnce(mockTrajectory);

    (api.put as jest.Mock).mockRejectedValue("String error");
    window.alert = jest.fn();

    render(<AdminUserDetailsPage />);
    await waitFor(() => expect(screen.getByText("Test User")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to update user: String error");
    });
  });

  it("switches back to profile tab (covers lambda)", async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockSessions)
      .mockResolvedValueOnce(mockTrajectory);

    render(<AdminUserDetailsPage />);
    await waitFor(() => expect(screen.getByText("Test User")).toBeInTheDocument());

    // Switch away
    fireEvent.click(screen.getByText(/Sessions \(\d+\)/));
    expect(screen.queryByText("Edit User Access")).not.toBeInTheDocument();

    // Switch back (covers line 132)
    fireEvent.click(screen.getByText("Profile & Access"));
    expect(screen.getByText("Edit User Access")).toBeInTheDocument();
  });
});
