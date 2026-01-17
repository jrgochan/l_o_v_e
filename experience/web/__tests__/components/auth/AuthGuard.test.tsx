import { render, screen, waitFor } from "@testing-library/react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { useRouter, usePathname } from "next/navigation";
import { UserRole } from "@/types/auth";

// Mock dependencies
jest.mock("@/stores/authStore");
jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
    usePathname: jest.fn(),
}));

describe("AuthGuard", () => {
    const mockPush = jest.fn();
    const mockIsAuthenticated = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        (usePathname as jest.Mock).mockReturnValue("/protected");

        // Default valid auth state
        (useAuthStore as unknown as jest.Mock).mockReturnValue({
            user: { id: "1", role: UserRole.USER, email: "test@example.com" },
            token: "valid-token",
            isLoading: false,
        });

        // Setup selector mock
        (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
            const state = {
                user: { id: "1", role: UserRole.USER, email: "test@example.com" },
                token: "valid-token",
                isLoading: false,
                isAuthenticated: mockIsAuthenticated,
            };

            if (selector) {
                return selector(state);
            }
            return state;
        });

        mockIsAuthenticated.mockReturnValue(true);
    });

    it("shows loading spinner when loading", () => {
        (useAuthStore as unknown as jest.Mock).mockReturnValue({
            user: null,
            token: null,
            isLoading: true,
        });

        const { container } = render(
            <AuthGuard>
                <div>Protected Content</div>
            </AuthGuard>
        );

        // Should verify spinner presence (generic check for "animate-spin" class)
        expect(container.getElementsByClassName("animate-spin").length).toBe(1);
        expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("redirects to home if unauthenticated", async () => {
        mockIsAuthenticated.mockReturnValue(false);
        (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
            const state = {
                user: null,
                token: null,
                isLoading: false,
                isAuthenticated: () => false
            };
            if (selector) return selector(state);
            return state;
        });

        render(
            <AuthGuard>
                <div>Protected Content</div>
            </AuthGuard>
        );

        expect(mockPush).toHaveBeenCalledWith("/");
        expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("renders children if authenticated and no role required", () => {
        (useAuthStore as unknown as jest.Mock).mockReturnValue({
            user: { id: "1", role: UserRole.USER },
            token: "valid-token",
            isLoading: false,
        });

        render(
            <AuthGuard>
                <div>Protected Content</div>
            </AuthGuard>
        );

        expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });

    it("renders children if user has required role", () => {
        (useAuthStore as unknown as jest.Mock).mockReturnValue({
            user: { id: "1", role: UserRole.ADMIN },
            token: "valid-token",
            isLoading: false,
        });

        render(
            <AuthGuard requiredRole={UserRole.ADMIN}>
                <div>Admin Content</div>
            </AuthGuard>
        );

        expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });

    it("redirects to home when not authenticated and not loading", () => {
        (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
            if (selector) {
                // Call the selector to ensure coverage of the selector function in AuthGuard.tsx
                return selector({
                    isAuthenticated: () => false,
                    user: null,
                    token: null,
                    isLoading: false,
                });
            }
            return {
                user: null,
                token: null,
                isLoading: false,
            };
        });

        render(
            <AuthGuard>
                <div>Protected</div>
            </AuthGuard>
        );

        // Implementation redirects to root "/" not login
        expect(mockPush).toHaveBeenCalledWith("/");
        // Also verify it returns null (renders nothing)
        expect(screen.queryByText("Protected")).not.toBeInTheDocument();
    });

    it("shows forbidden screen when authenticated but insufficient role", () => {
        mockIsAuthenticated.mockReturnValue(true);
        (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
            const state = {
                isAuthenticated: () => true,
                isLoading: false,
                user: { id: "1", role: UserRole.USER },
                token: "valid-token",
            };
            if (selector) return selector(state);
            return state;
        });

        render(
            <AuthGuard requiredRole={UserRole.ADMIN}>
                <div>Admin Only</div>
            </AuthGuard>
        );

        expect(screen.getByText("403 Forbidden")).toBeInTheDocument();
        expect(mockPush).not.toHaveBeenCalled();
    });

    it("logs warning in development when unauthenticated", () => {
        const originalEnv = process.env;
        process.env = { ...originalEnv, NODE_ENV: "development" };
        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
            const state = {
                isAuthenticated: () => false,
                isLoading: false,
                token: null,
                user: null,
            };
            if (selector) return selector(state);
            return state;
        });

        render(
            <AuthGuard>
                <div>Protected Content</div>
            </AuthGuard>
        );

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("[AuthGuard] Unauthenticated access")
        );

        consoleSpy.mockRestore();
        process.env = originalEnv;
    });

    it("logs warning in development when unauthorized role", () => {
        const originalEnv = process.env;
        process.env = { ...originalEnv, NODE_ENV: "development" };
        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        mockIsAuthenticated.mockReturnValue(true);
        (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
            const state = {
                isAuthenticated: () => true,
                isLoading: false,
                user: { id: "1", role: UserRole.USER },
                token: "valid-token",
            };
            if (selector) return selector(state);
            return state;
        });

        render(
            <AuthGuard requiredRole={UserRole.ADMIN}>
                <div>Admin Content</div>
            </AuthGuard>
        );

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("[AuthGuard] Unauthorized role access")
        );

        consoleSpy.mockRestore();
        process.env = originalEnv;
    });

    it("handles return home button click", () => {
        mockIsAuthenticated.mockReturnValue(true);
        (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
            const state = {
                isAuthenticated: () => true,
                isLoading: false,
                user: { id: "1", role: UserRole.USER },
                token: "valid-token",
            };
            if (selector) return selector(state);
            return state;
        });

        render(
            <AuthGuard requiredRole={UserRole.ADMIN}>
                <div>Admin Content</div>
            </AuthGuard>
        );

        const button = screen.getByText("Return Home");
        button.click();
        expect(mockPush).toHaveBeenCalledWith("/");
    });

    it("shows fallback if user lacks required role", () => {
        mockIsAuthenticated.mockReturnValue(true);
        (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
            const state = {
                isAuthenticated: () => true,
                isLoading: false,
                user: { id: "1", role: UserRole.USER },
                token: "valid-token",
            };
            if (selector) return selector(state);
            return state;
        });

        render(
            <AuthGuard requiredRole={UserRole.ADMIN} fallback={<div>Access Denied Custom</div>}>
                <div>Admin Content</div>
            </AuthGuard>
        );

        expect(screen.getByText("Access Denied Custom")).toBeInTheDocument();
        expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    });

    it("shows default forbidden message if user lacks required role and no fallback provided", () => {
        mockIsAuthenticated.mockReturnValue(true);
        (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
            const state = {
                isAuthenticated: () => true,
                isLoading: false,
                user: { id: "1", role: UserRole.USER },
                token: "valid-token",
            };
            if (selector) return selector(state);
            return state;
        });

        render(
            <AuthGuard requiredRole={UserRole.ADMIN}>
                <div>Admin Content</div>
            </AuthGuard>
        );

        expect(screen.getByText("403 Forbidden")).toBeInTheDocument();
        expect(screen.getByText("Return Home")).toBeInTheDocument();
    });
});
