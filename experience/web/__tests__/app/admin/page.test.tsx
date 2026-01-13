import { render, screen } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
import { useRouter } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

// Mock AdminLayout
jest.mock("@/components/admin/layout/AdminLayout", () => ({
    AdminLayout: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="admin-layout">{children}</div>
    ),
}));

describe("AdminPage", () => {
    const mockReplace = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({
            replace: mockReplace,
        });
    });

    it("redirects to /admin/users on mount", () => {
        render(<AdminPage />);
        expect(mockReplace).toHaveBeenCalledWith("/admin/users");
    });

    it("renders redirect message within layout", () => {
        render(<AdminPage />);
        expect(screen.getByTestId("admin-layout")).toBeInTheDocument();
        expect(screen.getByText("Redirecting to dashboard...")).toBeInTheDocument();
    });
});
