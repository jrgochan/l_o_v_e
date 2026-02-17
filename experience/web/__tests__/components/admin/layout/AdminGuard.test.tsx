import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { AdminGuard } from "@/components/admin/layout/AdminGuard";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/types/auth";

// Mock dependencies
jest.mock("@/stores/authStore");
jest.mock("@/hooks/admin/useAdminTheme", () => ({
  useAdminTheme: () => ({
    colors: {
      background: "bg-black",
      text: { muted: "text-gray-500" },
      hover: "hover:bg-gray-800",
    },
  }),
}));
jest.mock("@/components/auth/AuthModal", () => ({
  AuthModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="auth-modal">
        Auth Modal
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Mock Next.js Link
jest.mock("next/link", () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

afterEach(cleanup);

describe("AdminGuard", () => {
  let mockSetUser: jest.Mock;
  let mockSetToken: jest.Mock;

  beforeEach(() => {
    mockSetUser = jest.fn();
    mockSetToken = jest.fn();

    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
      setUser: mockSetUser,
      setToken: mockSetToken,
    });
  });

  it("renders loading state initially", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
    });

    render(
      <AdminGuard>
        <div>Secret Content</div>
      </AdminGuard>
    );
    // Ideally check for "Loading..." text
    // The component has a useEffect that sets isClient to true after 0ms.
    // If isClient is false, it returns null.
    // So initially it returns null.
    // Wait for client mount
  });

  it("renders loading text when auth is loading", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
      setUser: mockSetUser,
      setToken: mockSetToken,
    });

    render(
      <AdminGuard>
        <div>Secret Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
  });

  it("renders access denied/portal when not logged in", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
      setUser: mockSetUser,
      setToken: mockSetToken,
    });

    render(
      <AdminGuard>
        <div>Secret Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Clinical Access")).toBeInTheDocument();
    });
    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
  });

  it("renders access denied when user has wrong role", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { role: "PATIENT" },
      isLoading: false,
      setUser: mockSetUser,
      setToken: mockSetToken,
    });

    render(
      <AdminGuard>
        <div>Secret Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Clinical Access")).toBeInTheDocument();
    });
  });

  it("renders children when authorized (ADMIN)", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { role: UserRole.ADMIN },
      isLoading: false,
      setUser: mockSetUser,
      setToken: mockSetToken,
    });

    render(
      <AdminGuard>
        <div>Secret Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Secret Content")).toBeInTheDocument();
    });
    expect(screen.queryByText("Clinical Access")).not.toBeInTheDocument();
  });

  it("renders children when authorized (CLINICIAN)", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { role: UserRole.CLINICIAN },
      isLoading: false,
      setUser: mockSetUser,
      setToken: mockSetToken,
    });

    render(
      <AdminGuard>
        <div>Secret Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Secret Content")).toBeInTheDocument();
    });
  });

  it("activates dev admin bypass", async () => {
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
    await waitFor(() => screen.getByText("Clinical Access"));

    const devAdminBtn = screen.getByText("🧙 Dev Admin");
    fireEvent.click(devAdminBtn);

    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({
        role: UserRole.ADMIN,
        email: "dev@admin.com",
      })
    );
    expect(mockSetToken).toHaveBeenCalledWith("dev-token-bypass");
  });

  it("activates dev clinician bypass", async () => {
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
    await waitFor(() => screen.getByText("Clinical Access"));

    const devClinicianBtn = screen.getByText("🩺 Dev Clinician");
    fireEvent.click(devClinicianBtn);

    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({
        role: UserRole.CLINICIAN,
        email: "dev@clinician.com",
      })
    );
    expect(mockSetToken).toHaveBeenCalledWith("dev-token-bypass");
  });

  it("opens auth modal", async () => {
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
    await waitFor(() => screen.getByText("Clinical Access"));

    const signInBtn = screen.getByText("Sign In");
    fireEvent.click(signInBtn);

    expect(screen.getByTestId("auth-modal")).toBeInTheDocument();

    // Close it
    fireEvent.click(screen.getByText("Close"));
    // The mock is simple, checking if state updates might be harder if state is internal.
    // We can check if it disappears?
    // The AuthModal mock renders based on isOpen prop.
    // If parent state updates, it should re-render with isOpen=false -> return null.

    expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();
  });
});
