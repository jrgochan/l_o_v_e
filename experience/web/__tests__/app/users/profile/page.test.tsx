
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
        expect(screen.getByText(/user\s+Account/i)).toBeInTheDocument();
        expect(screen.getByText("Active")).toBeInTheDocument();

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

        await waitFor(() => {
            expect(screen.getByText(/Thursday, October 26, 2023/)).toBeInTheDocument();
            expect(screen.getByText(/30 min/)).toBeInTheDocument();
            expect(screen.getByText(/Ongoing/)).toBeInTheDocument();
            expect(screen.getByText(/calm Mode/)).toBeInTheDocument();
            expect(screen.getByText(/energetic Mode/)).toBeInTheDocument();
        });
    });

    it("renders empty state when no sessions found", async () => {
        mockUseAuthStore.mockReturnValue({ user: mockUser, isLoading: false });
        mockApiGet.mockResolvedValue([]);

        render(<UserProfilePage />);

        await waitFor(() => {
            expect(screen.getByText("No sessions found.")).toBeInTheDocument();
            expect(screen.getByText("Start a Chat")).toBeInTheDocument();
        });
    });

    it("handles api error gracefully", async () => {
        mockUseAuthStore.mockReturnValue({ user: mockUser, isLoading: false });
        mockApiGet.mockRejectedValue(new Error("API Error"));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        render(<UserProfilePage />);

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

        expect(screen.getByText("User Profile")).toBeInTheDocument();
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
        mockApiGet.mockResolvedValue([{
            id: "session-missing-count",
            started_at: "2023-10-26T15:00:00Z",
            ended_at: "2023-10-26T15:30:00Z",
            tone_preference: "calm",
            // message_count undefined
        }]);

        render(<UserProfilePage />);

        await waitFor(() => {
            expect(screen.getByText(/0 messages/)).toBeInTheDocument();
            // Total messages should be 0
            const stats = screen.getAllByText("0");
            // One for Total Messages stat, one for messages count in list?
            expect(stats.some(el => el.className.includes("text-3xl"))).toBe(true);
        });
    });
});
