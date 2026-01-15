import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminGuard } from "@/components/admin/layout/AdminGuard";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/types/auth";

// Mock Auth Store
jest.mock("@/stores/authStore", () => ({
  useAuthStore: jest.fn(),
}));

// Mock Link to prevent navigation errors
jest.mock("next/link", () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

// Mock AuthModal
jest.mock("@/components/auth/AuthModal", () => ({
  AuthModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="auth-modal">
        Auth Modal
        <button data-testid="close-modal-btn" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

describe("AdminGuard", () => {
  const mockSetUser = jest.fn();
  const mockSetToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading state", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
    });

    render(
      <AdminGuard>
        <div>Child</div>
      </AdminGuard>
    );

    // AdminGuard has a useEffect to set isClient=true.
    // Before that it returns null.
    // We need to wait for isClient to be true.
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    expect(screen.queryByText("Child")).not.toBeInTheDocument();
  });

  it("renders children when user is admin", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { role: UserRole.ADMIN },
      isLoading: false,
    });

    // Effect sets client=true immediately, wait for it
    render(
      <AdminGuard>
        <div>Secret Admin Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Secret Admin Content")).toBeInTheDocument();
    });
  });

  it("blocks access for non-admin/unauthenticated", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
      setUser: mockSetUser,
      setToken: mockSetToken,
    });

    render(
      <AdminGuard>
        <div>Secret</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Access")).toBeInTheDocument();
    });

    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
    expect(screen.getByText("Please sign in to access the control panel.")).toBeInTheDocument();
  });

  it("allows dev login bypass", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
      setUser: mockSetUser,
      setToken: mockSetToken,
    });

    render(
      <AdminGuard>
        <div>Secret</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("🧙 Dev Login")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("🧙 Dev Login"));

    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "admin",
        email: "dev@admin.com",
      })
    );
    expect(mockSetToken).toHaveBeenCalledWith("dev-token-bypass");
  });

  it("opens auth modal", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(
      <AdminGuard>
        <div>Secret</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sign In"));
    expect(screen.getByTestId("auth-modal")).toBeInTheDocument();
  });
  it("opens and closes auth modal", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(
      <AdminGuard>
        <div>Secret</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sign In"));
    expect(screen.getByTestId("auth-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("close-modal-btn"));
    expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();
  });
});
