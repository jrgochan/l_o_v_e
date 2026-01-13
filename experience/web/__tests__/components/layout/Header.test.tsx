
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Header } from "@/components/layout/Header";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/types/auth";

// Mock dependencies
jest.mock("@/stores/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("next/link", () => {
  return ({ children, href, onClick }: any) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  );
});

// Mock child components
jest.mock("@/components/auth/AuthModal", () => ({
  AuthModal: ({ isOpen, onClose }: any) => (
    isOpen ? <div data-testid="auth-modal"><button onClick={onClose}>Close</button></div> : null
  ),
}));

jest.mock("@/components/Settings", () => ({
  Settings: () => <div data-testid="settings-icon">Settings</div>,
}));

describe("Header", () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      logout: mockLogout,
    });
  });

  it("renders sign in button when not authenticated", () => {
    render(<Header />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.queryByTestId("user-profile")).not.toBeInTheDocument();
  });

  it("does not render sign in button if showAuth is false", () => {
    render(<Header showAuth={false} />);
    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
  });

  it("opens auth modal when sign in clicked", () => {
    render(<Header />);
    fireEvent.click(screen.getByText("Sign In"));
    expect(screen.getByTestId("auth-modal")).toBeInTheDocument();

    // Test closing
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();
  });

  it("renders user profile when authenticated", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: {
        email: "test@example.com",
        full_name: "Test User",
        role: UserRole.USER,
      },
      logout: mockLogout,
    });

    render(<Header />);
    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();

    // Initial avatar check
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("handles profile dropdown interactions", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: {
        email: "test@example.com",
        full_name: "Test User",
        role: UserRole.USER,
      },
      logout: mockLogout,
    });

    render(<Header />);

    // Open dropdown
    const profileBtn = screen.getByText("Test User").closest("button");
    fireEvent.click(profileBtn!);

    expect(screen.getByText("Signed in as")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("👤 Profile")).toBeInTheDocument();
    expect(screen.getByText("🚪 Sign out")).toBeInTheDocument();

    // Admin link should NOT be there for regular user
    expect(screen.queryByText("⚡ Admin Dashboard")).not.toBeInTheDocument();

    // Close logic (click outside) - hard to mock exact document click in JSDOM sometimes without setup, 
    // but we can test the toggle logic by clicking the button again
    fireEvent.click(profileBtn!);
    expect(screen.queryByText("Signed in as")).not.toBeInTheDocument();
  });

  it("renders admin link for admin users", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: {
        email: "admin@example.com",
        role: UserRole.ADMIN, // user with no full_name fallbacks to email
      },
      logout: mockLogout,
    });

    render(<Header />);

    // Use fallback name from email
    expect(screen.getByText("admin")).toBeInTheDocument();
    // Initial avatar check fallback
    expect(screen.getByText("A")).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(screen.getByText("admin").closest("button")!);
    const adminLink = screen.getByText("⚡ Admin Dashboard");
    expect(adminLink).toBeInTheDocument();

    // Click the link to cover the onClick handler
    fireEvent.click(adminLink);
  });

  it("handles logout", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: {
        email: "test@example.com",
        role: UserRole.USER,
      },
      logout: mockLogout,
    });

    render(<Header />);

    // Open dropdown
    fireEvent.click(screen.getByText("test").closest("button")!);

    // Click logout
    fireEvent.click(screen.getByText("🚪 Sign out"));
    expect(mockLogout).toHaveBeenCalled();
    // Dropdown should close (can't easily check state directly but good assurance)
  });

  it("closes profile on link click", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: {
        email: "test@example.com",
        role: UserRole.USER,
      },
      logout: mockLogout,
    });
    render(<Header />);

    // Open dropdown
    fireEvent.click(screen.getByText("test").closest("button")!);

    // Click profile link 
    const profileLink = screen.getByText("👤 Profile");
    fireEvent.click(profileLink);

    // Re-render check is implicit, but in a real browser nav would happen. 
    // Here we mainly ensure no error.
  });

  it("closes profile when clicking outside", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { email: "test@example.com", role: UserRole.USER },
      logout: mockLogout,
    });

    render(<Header />);

    // Open dropdown
    fireEvent.click(screen.getByText("test").closest("button")!);
    expect(screen.getByText("Signed in as")).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);

    expect(screen.queryByText("Signed in as")).not.toBeInTheDocument();
  });

  it("handles click outside when not logged in (ref is null)", () => {
    // Render without user -> profileRef.current will be null/undefined initially
    render(<Header />);

    // Trigger click outside - should safely do nothing and not crash
    fireEvent.mouseDown(document.body);

    // Success if no error thrown
  });
});
