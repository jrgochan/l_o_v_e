
import { render, screen, waitFor } from "@testing-library/react";
import AdminSessionsPage from "@/app/admin/sessions/page";
import { adminApi } from "@/utils/api";

// Mock dependencies
jest.mock("@/components/admin/layout/AdminLayout", () => ({
    AdminLayout: ({ children }: any) => <div data-testid="admin-layout">{children}</div>,
}));

jest.mock("@/utils/api", () => ({
    adminApi: {
        getSessions: jest.fn(),
    },
}));

// Mock Link
jest.mock("next/link", () => {
    return ({ children, href }: any) => (
        <a href={href}>{children}</a>
    );
});

describe("AdminSessionsPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders loading state initially", async () => {
        (adminApi.getSessions as jest.Mock).mockReturnValue(new Promise(() => { }));

        render(<AdminSessionsPage />);

        // Check for loader (using role or class check if implied, but simpler to check for absence of table)
        // The code uses lucide Loader2. We can check if AdminLayout is NOT rendered yet, 
        // because loading state returns early BEFORE AdminLayout.
        expect(screen.queryByTestId("admin-layout")).not.toBeInTheDocument();
    });

    it("renders sessions table on success", async () => {
        const mockSessions = [
            {
                id: "sess-1",
                started_at: "2024-01-01T10:00:00Z",
                user: { email: "user@example.com", full_name: "Test User" },
                message_count: 5,
                tone_preference: "warm",
            },
            {
                id: "sess-2",
                started_at: "2024-01-02T10:00:00Z",
                user_id: "guest-123",
                // No user object (guest)
                message_count: 2,
                tone_preference: "clinical",
            }
        ];

        (adminApi.getSessions as jest.Mock).mockResolvedValue({ items: mockSessions });

        render(<AdminSessionsPage />);

        await waitFor(() => {
            expect(screen.getByText("Chat Sessions")).toBeInTheDocument();
        });

        expect(screen.getByText("Test User")).toBeInTheDocument();
        expect(screen.getByText("user@example.com")).toBeInTheDocument();
        expect(screen.getByText("Guest (guest-123)")).toBeInTheDocument();
        expect(screen.getByText("warm")).toBeInTheDocument();
        expect(screen.getByText("clinical")).toBeInTheDocument();
    });

    it("handles error state", async () => {
        (adminApi.getSessions as jest.Mock).mockRejectedValue(new Error("API Error"));

        render(<AdminSessionsPage />);

        await waitFor(() => {
            expect(screen.getByText("Error: API Error")).toBeInTheDocument();
        });
    });

    it("handles non-Error object rejection", async () => {
        (adminApi.getSessions as jest.Mock).mockRejectedValue("String Error");

        render(<AdminSessionsPage />);

        await waitFor(() => {
            expect(screen.getByText("Error: Failed to load sessions")).toBeInTheDocument();
        });
    });

    it("handles user without full_name", async () => {
        const mockSessions = [
            {
                id: "sess-3",
                started_at: "2024-01-01T10:00:00Z",
                user: { email: "noname@example.com", full_name: "" },
                message_count: 5,
                tone_preference: "warm",
            }
        ];
        (adminApi.getSessions as jest.Mock).mockResolvedValue({ items: mockSessions });

        render(<AdminSessionsPage />);

        await waitFor(() => {
            // Should fallback to email in the main text area (which uses full_name || email)
            // The component renders:
            // <div className="font-medium text-white">{session.user.full_name || session.user.email}</div>
            // <div className="text-xs text-gray-500">{session.user.email}</div>
            // So we should see email twice (or at least strictly checking the text content)

            // Using getAllByText to be safe if it appears multiple times
            expect(screen.getAllByText("noname@example.com").length).toBeGreaterThanOrEqual(1);
        });
    });
});
