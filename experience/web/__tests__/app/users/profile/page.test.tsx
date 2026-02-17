import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import UserProfilePage from "@/app/users/profile/page";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/utils/api";
import { useRouter } from "next/navigation";

// Mock dependencies
jest.mock("@/stores/authStore");
jest.mock("@/utils/api");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
jest.mock("@/components/layout/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

const mockUseAuthStore = useAuthStore as unknown as jest.Mock;
const mockApiGet = api.get as jest.Mock;
const mockPush = jest.fn();

describe("UserProfilePage", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    full_name: "Test User",
    role: "user",
    is_active: true,
    created_at: "2023-07-01T12:00:00Z",
  };

  const mockSessions = [
    {
      id: "session-1",
      started_at: "2023-10-26T15:00:00Z", // 3 PM UTC
      ended_at: "2023-10-26T15:30:00Z",
      tone_preference: "calm",
      message_count: 15,
    },
    {
      id: "session-2",
      started_at: "2023-10-27T15:00:00Z",
      ended_at: null, // Ongoing
      tone_preference: "energetic",
      message_count: 5,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it("redirects if not logged in", () => {
    mockUseAuthStore.mockReturnValue({ user: null, isLoading: false });
    render(<UserProfilePage />);
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("shows loading state while checking auth", () => {
    mockUseAuthStore.mockReturnValue({ user: null, isLoading: true });
    render(<UserProfilePage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders user profile and stats", async () => {
    mockUseAuthStore.mockReturnValue({ user: mockUser, isLoading: false });
    mockApiGet.mockResolvedValue(mockSessions);

    render(<UserProfilePage />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("user")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();

    // Click Sessions tab to see stats
    fireEvent.click(screen.getByText("Sessions"));

    await waitFor(() => {
      // Total Sessions
      expect(screen.getByText("2")).toBeInTheDocument();
      // Total Messages (15 + 5)
      expect(screen.getByText("20")).toBeInTheDocument();
      // Member Since
      expect(screen.getByText("2023")).toBeInTheDocument();
    });
  });

  it("renders session history", async () => {
    mockUseAuthStore.mockReturnValue({ user: mockUser, isLoading: false });
    mockApiGet.mockResolvedValue(mockSessions);

    render(<UserProfilePage />);

    // Click Sessions tab
    fireEvent.click(screen.getByText("Sessions"));

    await waitFor(() => {
      expect(screen.getByText(/Thursday, October 26, 2023/)).toBeInTheDocument();
      expect(screen.getByText(/30 min/)).toBeInTheDocument();
      expect(screen.getByText(/Ongoing/)).toBeInTheDocument();
    });

    // Check tone preference badges
    expect(screen.getByText("calm")).toBeInTheDocument();
    expect(screen.getByText("energetic")).toBeInTheDocument();
  });

  it("renders empty state when no sessions found", async () => {
    mockUseAuthStore.mockReturnValue({ user: mockUser, isLoading: false });
    mockApiGet.mockResolvedValue([]);

    render(<UserProfilePage />);

    // Click Sessions tab
    fireEvent.click(screen.getByText("Sessions"));

    await waitFor(() => {
      expect(screen.getByText("No sessions found.")).toBeInTheDocument();
      expect(screen.getByText("Start a Chat")).toBeInTheDocument();
    });
  });

  it("handles api error gracefully", async () => {
    mockUseAuthStore.mockReturnValue({ user: mockUser, isLoading: false });
    mockApiGet.mockRejectedValue(new Error("API Error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<UserProfilePage />);

    // Click Sessions tab
    fireEvent.click(screen.getByText("Sessions"));

    await waitFor(() => {
      expect(screen.getByText("No sessions found.")).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to load sessions:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("renders user initials fallback if no full name", async () => {
    mockUseAuthStore.mockReturnValue({ user: { ...mockUser, full_name: null }, isLoading: false });
    mockApiGet.mockResolvedValue([]);

    render(<UserProfilePage />);

    // Should see "Your Profile" fallback title
    expect(screen.getByText("Your Profile")).toBeInTheDocument();
    // Initials from email (T from test@example.com)
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("renders inactive status", async () => {
    mockUseAuthStore.mockReturnValue({ user: { ...mockUser, is_active: false }, isLoading: false });
    mockApiGet.mockResolvedValue([]);

    render(<UserProfilePage />);

    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("handles sessions with missing message count", async () => {
    mockUseAuthStore.mockReturnValue({ user: mockUser, isLoading: false });
    mockApiGet.mockResolvedValue([
      {
        id: "session-missing-count",
        started_at: "2023-10-26T15:00:00Z",
        ended_at: "2023-10-26T15:30:00Z",
        tone_preference: "calm",
        // message_count undefined
      },
    ]);

    render(<UserProfilePage />);

    // Click Sessions tab
    fireEvent.click(screen.getByText("Sessions"));

    await waitFor(() => {
      // Find within sessions list specifically
      const sessionList = screen.getByText("Session History").closest("div");
      // "0 messages" text
      expect(screen.getAllByText(/0 messages/).length).toBeGreaterThan(0);
    });
  });

  // --- NEW TESTS ---

  it("updates profile information", async () => {
    const mockUpdateProfile = jest.fn().mockResolvedValue(true);
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      updateProfile: mockUpdateProfile,
    });

    render(<UserProfilePage />);

    // Default tab is Profile
    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);

    fireEvent.change(nameInput, { target: { value: "Updated Name" } });
    fireEvent.change(emailInput, { target: { value: "updated@example.com" } });

    fireEvent.click(screen.getByText("Save Changes"));

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      full_name: "Updated Name",
      email: "updated@example.com",
    });

    await waitFor(() => {
      expect(screen.getByText("✓ Profile updated")).toBeInTheDocument();
    });
  });

  it("handles password change success", async () => {
    const mockChangePassword = jest.fn().mockResolvedValue(true);
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      changePassword: mockChangePassword,
    });

    render(<UserProfilePage />);
    fireEvent.click(screen.getByText("Security"));

    const currentInput = screen.getByLabelText(/Current Password/i);
    const newInput = screen.getByLabelText(/^New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm New Password/i);

    fireEvent.change(currentInput, { target: { value: "oldPass123" } });
    fireEvent.change(newInput, { target: { value: "NewPass123!" } });
    fireEvent.change(confirmInput, { target: { value: "NewPass123!" } });

    // Use specific selector for the button
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(mockChangePassword).toHaveBeenCalledWith("oldPass123", "NewPass123!");

    await waitFor(() => {
      expect(screen.getByText("✓ Password changed")).toBeInTheDocument();
    });
  });

  it("validates password mismatch", async () => {
    mockUseAuthStore.mockReturnValue({ user: mockUser, isLoading: false });

    render(<UserProfilePage />);
    fireEvent.click(screen.getByText("Security"));

    fireEvent.change(screen.getByLabelText(/Current Password/i), { target: { value: "old" } });
    fireEvent.change(screen.getByLabelText(/^New Password/i), { target: { value: "new1" } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), { target: { value: "new2" } });

    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("handles password change failure", async () => {
    const mockChangePassword = jest.fn().mockRejectedValue(new Error("Weak password"));
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      changePassword: mockChangePassword,
    });

    render(<UserProfilePage />);
    fireEvent.click(screen.getByText("Security"));

    fireEvent.change(screen.getByLabelText(/Current Password/i), { target: { value: "old" } });
    fireEvent.change(screen.getByLabelText(/^New Password/i), { target: { value: "new" } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), { target: { value: "new" } });

    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(screen.getByText("Weak password")).toBeInTheDocument();
    });
  });

  it("displays consents and handles data export", async () => {
    const mockExportData = jest.fn().mockResolvedValue(true);
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      exportData: mockExportData,
    });

    // Use a date that won't be affected by timezone issues if possible, or use a loose matcher
    const mockConsents = [
      {
        key: "terms",
        name: "Terms of Service",
        version: "1.0",
        granted_at: "2023-01-01T12:00:00Z",
      },
    ];
    mockApiGet.mockImplementation((url) => {
      if (url === "/consent/me") return Promise.resolve({ granted: mockConsents });
      return Promise.resolve([]);
    });

    render(<UserProfilePage />);
    fireEvent.click(screen.getByText("Privacy"));

    // Check loading state (briefly) or final state
    await waitFor(() => {
      expect(screen.getByText("Terms of Service")).toBeInTheDocument();
      // Match "Granted:" and some date part to be safe against locale differences
      expect(screen.getByText(/Granted:/)).toBeInTheDocument();
      expect(screen.getByText(/v1.0/)).toBeInTheDocument();
    });

    // Test Export
    fireEvent.click(screen.getByText("📦 Export My Data"));
    expect(mockExportData).toHaveBeenCalled();
  });

  it("handles export data failure", async () => {
    const mockExportData = jest.fn().mockRejectedValue(new Error("Export failed"));
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      exportData: mockExportData,
    });

    render(<UserProfilePage />);
    fireEvent.click(screen.getByText("Privacy"));

    fireEvent.click(screen.getByText("📦 Export My Data"));
    expect(mockExportData).toHaveBeenCalled();
    // Verify catch block execution by checking state transition
    await waitFor(() => {
      expect(screen.getByText("📦 Export My Data")).not.toBeDisabled();
    });
  });

  it("handles profile update failure", async () => {
    // The component catches the error, so we verify the store action was called
    // and potentially that the success message is NOT shown
    const mockUpdateProfile = jest.fn().mockRejectedValue(new Error("Update failed"));
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      updateProfile: mockUpdateProfile,
    });

    render(<UserProfilePage />);
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: "Fail Name" } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalled();
    });
    expect(screen.queryByText("✓ Profile updated")).not.toBeInTheDocument();
  });

  it("handles account deletion failure", async () => {
    // The component catches the error, so we verify the store action was called
    const mockDeleteAccount = jest.fn().mockRejectedValue(new Error("Delete failed"));
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      deleteAccount: mockDeleteAccount,
    });

    render(<UserProfilePage />);
    fireEvent.click(screen.getByText("Privacy"));
    fireEvent.click(screen.getByText("🗑️ Delete My Account"));

    // We need to type DELETE to enable the button
    const input = screen.getByPlaceholderText("Type DELETE to confirm");
    fireEvent.change(input, { target: { value: "DELETE" } });
    fireEvent.click(screen.getByText("Permanently Delete"));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalled();
    });
    // Ensure router push didn't happen (mockPush is defined at top)
    expect(mockPush).not.toHaveBeenCalledWith("/");
  });

  it("handles consent loading failure", async () => {
    // Cover catch block in consent loading
    mockUseAuthStore.mockReturnValue({ user: mockUser, isLoading: false });
    mockApiGet.mockImplementation((url) => {
      if (url === "/consent/me") return Promise.reject(new Error("Consent load error"));
      return Promise.resolve([]);
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<UserProfilePage />);
    fireEvent.click(screen.getByText("Privacy"));

    await waitFor(() => {
      // Should default to empty list or handled state
      expect(screen.getByText("No active consents found.")).toBeInTheDocument();
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles account deletion flow", async () => {
    const mockDeleteAccount = jest.fn().mockResolvedValue(true);
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      deleteAccount: mockDeleteAccount,
    });

    render(<UserProfilePage />);
    fireEvent.click(screen.getByText("Privacy"));

    // Initial button
    const deleteBtn = screen.getByText("🗑️ Delete My Account");
    fireEvent.click(deleteBtn);

    // Confirmation input appears
    const input = screen.getByPlaceholderText("Type DELETE to confirm");
    expect(input).toBeInTheDocument();

    // Type wrong text
    fireEvent.change(input, { target: { value: "WRONG" } });
    const confirmBtn = screen.getByText("Permanently Delete");
    expect(confirmBtn).toBeDisabled();

    // Type correct text
    fireEvent.change(input, { target: { value: "DELETE" } });
    expect(confirmBtn).not.toBeDisabled();

    // Cancel
    fireEvent.click(screen.getByText("Cancel"));
    expect(input).not.toBeInTheDocument();

    // Re-open and delete
    fireEvent.click(screen.getByText("🗑️ Delete My Account"));
    fireEvent.change(screen.getByPlaceholderText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByText("Permanently Delete"));

    expect(mockDeleteAccount).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("handles non-standard error in password change", async () => {
    const mockChangePassword = jest.fn().mockRejectedValue("String error");
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      changePassword: mockChangePassword,
    });

    render(<UserProfilePage />);
    fireEvent.click(screen.getByText("Security"));

    fireEvent.change(screen.getByLabelText(/Current Password/i), { target: { value: "old" } });
    fireEvent.change(screen.getByLabelText(/^New Password/i), { target: { value: "new" } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), { target: { value: "new" } });

    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      // Should fallback to "Failed to change password"
      expect(screen.getByText("Failed to change password")).toBeInTheDocument();
    });
  });

  it("handles password change success and clears message", async () => {
    const mockChangePassword = jest.fn();
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      changePassword: mockChangePassword,
    });
    jest.useFakeTimers();

    render(<UserProfilePage />);
    fireEvent.click(screen.getByText("Security"));

    fireEvent.change(screen.getByLabelText(/Current Password/i), { target: { value: "old" } });
    fireEvent.change(screen.getByLabelText(/^New Password/i), { target: { value: "NewPass123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: "NewPass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalled();
    });

    expect(await screen.findByText("✓ Password changed")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByText("✓ Password changed")).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it("handle profile update with partial changes and timers", async () => {
    const mockUpdateProfile = jest.fn();
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      updateProfile: mockUpdateProfile,
    });
    jest.useFakeTimers();
    jest.useFakeTimers();

    render(<UserProfilePage />);

    // Test 1: Update name only (email undefined)
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: "New Name" } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        full_name: "New Name",
        email: undefined,
      });
    });

    // Verify success message
    expect(await screen.findByText("✓ Profile updated")).toBeInTheDocument();

    // Fast forward time to clear message
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByText("✓ Profile updated")).not.toBeInTheDocument();
    });

    // Test 2: Empty name (full_name undefined)
    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      // logic: editName || undefined. "" -> undefined
      // But wait, the mockUser has an email. editEmail state initializes to user.email.
      // So editEmail === user.email is true. email -> undefined.
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        full_name: undefined,
        email: undefined,
      });
    });

    jest.useRealTimers();
  });

  it("handles empty consent response gracefully", async () => {
    mockUseAuthStore.mockReturnValue({ user: mockUser, isLoading: false });
    // Return object without 'granted' array to test fallback
    mockApiGet.mockImplementation((url) => {
      if (url === "/consent/me") return Promise.resolve({});
      return Promise.resolve([]);
    });

    render(<UserProfilePage />);
    fireEvent.click(screen.getByText("Privacy"));

    await waitFor(() => {
      expect(screen.getByText("No active consents found.")).toBeInTheDocument();
    });
  });

  it("shows loading states for actions", async () => {
    // We can now verify the local loading states because we refactored the component
    // validation for save profile
    // We need to delay the promise resolution to capture the "Saving..." state
    let resolveUpdate: (val?: unknown) => void;

    const delayedUpdate = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveUpdate = resolve;
      });
    });

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      updateProfile: delayedUpdate,
    });

    render(<UserProfilePage />);
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: "Loading Name" } });
    fireEvent.click(screen.getByText("Save Changes"));

    // Should show saving
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.getByText("Saving...")).toBeDisabled();

    // Resolve
    await act(async () => {
      if (resolveUpdate) resolveUpdate();
    });

    await waitFor(() => {
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });
  });
});
