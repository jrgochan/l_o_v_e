
import { render, screen, waitFor } from "@testing-library/react";
import AdminUsersPage from "@/app/admin/users/page";
import { api } from "@/utils/api";

// Mock dependencies
jest.mock("@/components/admin/layout/AdminLayout", () => ({
    AdminLayout: ({ children }: any) => <div data-testid="admin-layout">{children}</div>,
}));

jest.mock("@/utils/api", () => ({
    api: {
        get: jest.fn(),
    },
}));

jest.mock("next/link", () => {
    return ({ children, href, title }: any) => (
        <a href={href} title={title}>{children}</a>
    );
});

describe("AdminUsersPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders loading state initially", async () => {
        (api.get as jest.Mock).mockReturnValue(new Promise(() => { }));
        render(<AdminUsersPage />);

        expect(screen.getByText("Loading users...")).toBeInTheDocument();
    });

    it("renders users list on success", async () => {
        const mockUsers = [
            {
                id: "u1",
                email: "user1@example.com",
                full_name: "User One",
                role: "admin",
                is_active: true,
                updated_at: "2024-01-01",
            },
            {
                id: "u2",
                email: "user2@example.com",
                role: "user", // no full name
                is_active: false,
                updated_at: "2024-01-01",
            },
            {
                id: "u3",
                email: "clinician@example.com",
                full_name: "Dr. Test",
                role: "clinician",
                is_active: true,
                updated_at: "2024-01-01",
            }
        ];

        (api.get as jest.Mock).mockResolvedValue(mockUsers);
        render(<AdminUsersPage />);

        await waitFor(() => {
            expect(screen.queryByText("Loading users...")).not.toBeInTheDocument();
        });

        expect(screen.getByText("User One")).toBeInTheDocument();
        expect(screen.getByText("user1@example.com")).toBeInTheDocument();
        expect(screen.getByText("admin")).toBeInTheDocument();
        expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);

        expect(screen.getByText("No Name")).toBeInTheDocument();
        expect(screen.getByText("user")).toBeInTheDocument(); // role
        expect(screen.getByText("Inactive")).toBeInTheDocument();

        // Check clinician
        expect(screen.getByText("Dr. Test")).toBeInTheDocument();
        expect(screen.getByText("clinician")).toBeInTheDocument();

        // Check avatar fallback
        // Should match multiple "U"s (User One and user2@example.com)
        expect(screen.getAllByText("U")).toHaveLength(2);
    });

    it("handles error state", async () => {
        (api.get as jest.Mock).mockRejectedValue(new Error("Failed to load"));

        render(<AdminUsersPage />);

        await waitFor(() => {
            expect(screen.getByText("Failed to load")).toBeInTheDocument();
        });
    });

    it("handles generic error state", async () => {
        (api.get as jest.Mock).mockRejectedValue("String error");

        render(<AdminUsersPage />);

        await waitFor(() => {
            expect(screen.getByText("Failed to load users")).toBeInTheDocument();
        });
    });

    it("renders empty state", async () => {
        (api.get as jest.Mock).mockResolvedValue([]);

        render(<AdminUsersPage />);

        await waitFor(() => {
            expect(screen.getByText("No users found.")).toBeInTheDocument();
        });
    });
});
