import { render, screen, waitFor } from "@testing-library/react";
import AdminSessionDetailPage from "@/app/admin/sessions/detail/page";
import { adminApi } from "@/utils/api";
import { AdminSession } from "@/types/admin";
import React from "react";

// Mock next/navigation
const mockBack = jest.fn();
const mockSearchParams = { get: jest.fn().mockReturnValue("session-123") };

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: jest.fn(),
    back: mockBack,
  }),
}));

// Mock the API
jest.mock("@/utils/api", () => ({
  adminApi: {
    getSessionDetails: jest.fn(),
  },
}));

// Mock AdminLayout
jest.mock("@/components/admin/layout/AdminLayout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

// Mock use hook if necessary?
// In a real test environment for Next.js 15 / React 19, `use` works.
// If React version is older in tests, we might need a polyfill or mock.
// Let's assume standard behavior first, but wrap params in a Promise.

describe("AdminSessionDetailPage", () => {
  const mockSession: AdminSession = {
    id: "session-123",
    user_id: "user-123",
    started_at: "2024-01-01T10:00:00Z",
    ended_at: "2024-01-01T10:30:00Z",
    message_count: 5,
    tone_preference: "warm",
    user: {
      id: "user-123",
      email: "test@example.com",
      full_name: "Test User",
      role: "user",
      is_active: true,
    },
    messages: [
      {
        id: "msg-1",
        session_id: "session-123",
        role: "user",
        message_type: "user_text",
        content: "Hello",
        timestamp: "2024-01-01T10:01:00Z",
        emotion: { name: "Joy", category: "Happy", confidence: 0.8 },
      },
      {
        id: "msg-2",
        session_id: "session-123",
        role: "assistant",
        message_type: "assistant_text",
        content: "Hi there",
        timestamp: "2024-01-01T10:02:00Z",
      },
    ],
  } as unknown as AdminSession; // Casting for simplification if types are strict

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress "act scope" warning for suspended components
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] && args[0].includes("suspended inside an `act` scope")) {
        return;
      }
      originalConsoleError(...args);
    };
  });

  it("renders loading state initially", async () => {
    // Return a promise that doesn't resolve immediately to check loading state
    (adminApi.getSessionDetails as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { container } = render(
      <React.Suspense fallback={<div data-testid="suspense-loading">Loading...</div>}>
        render(
        <AdminSessionDetailPage />
        );
      </React.Suspense>
    );

    // If use(params) suspends, we see suspense fallback.
    // If it resolves, we see internal loading state (animate-spin).
    // We wait for one of them.
    await waitFor(() => {
      const suspense = screen.queryByTestId("suspense-loading");
      const internal = container.querySelector(".animate-spin");
      expect(suspense || internal).not.toBeNull();
    });

    expect(screen.queryByText(/Session Details/i)).not.toBeInTheDocument();
  });

  it("renders session details on success", async () => {
    (adminApi.getSessionDetails as jest.Mock).mockResolvedValue(mockSession);

    render(<AdminSessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Session Details/i })).toBeInTheDocument();
    });

    expect(screen.getByText("session-123".slice(0, 8))).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("warm Tone")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there")).toBeInTheDocument();
    expect(screen.getByText("Joy")).toBeInTheDocument();
  });

  it("handles empty messages", async () => {
    (adminApi.getSessionDetails as jest.Mock).mockResolvedValue({
      ...mockSession,
      messages: [],
    });

    render(<AdminSessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("No messages recorded in this session.")).toBeInTheDocument();
    });
  });

  it("handles guest session (no user)", async () => {
    (adminApi.getSessionDetails as jest.Mock).mockResolvedValue({
      ...mockSession,
      user: null,
    });

    render(<AdminSessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Guest Session")).toBeInTheDocument();
    });
  });

  it("handles error state", async () => {
    (adminApi.getSessionDetails as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    render(<AdminSessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Error: Fetch failed")).toBeInTheDocument();
    });

    expect(screen.getByText("Back to Sessions")).toBeInTheDocument();
  });

  it("renders voice messages with transcription", async () => {
    (adminApi.getSessionDetails as jest.Mock).mockResolvedValue({
      ...mockSession,
      messages: [
        {
          id: "msg-voice",
          session_id: "session-123",
          role: "user",
          message_type: "user_audio",
          content: "Audio File",
          transcription: "This is a voice message",
          timestamp: "2024-01-01T10:05:00Z",
        },
      ],
    });

    render(<AdminSessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Voice Message")).toBeInTheDocument();
      expect(screen.getByText("This is a voice message")).toBeInTheDocument();
    });
  });

  it("renders insights if present", async () => {
    (adminApi.getSessionDetails as jest.Mock).mockResolvedValue({
      ...mockSession,
      messages: [
        {
          id: "msg-insight",
          session_id: "session-123",
          role: "assistant",
          message_type: "assistant_text",
          content: "Deep things",
          timestamp: "2024-01-01T10:05:00Z",
          insights: { summary: "User is reflective", topics: [] },
        },
      ],
    });

    render(<AdminSessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Insight")).toBeInTheDocument();
      expect(screen.getByText("User is reflective")).toBeInTheDocument();
    });
  });
  it("handles non-Error rejection", async () => {
    (adminApi.getSessionDetails as jest.Mock).mockRejectedValue("String error");

    render(<AdminSessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Error: Failed to load session details")).toBeInTheDocument();
    });
  });

  it("handles null session response (not found)", async () => {
    (adminApi.getSessionDetails as jest.Mock).mockResolvedValue(null);

    render(<AdminSessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Error: Session not found")).toBeInTheDocument();
    });
  });

  it("handles user without full name", async () => {
    (adminApi.getSessionDetails as jest.Mock).mockResolvedValue({
      ...mockSession,
      user: { ...mockSession.user!, full_name: "" },
    });

    render(<AdminSessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Unknown Name")).toBeInTheDocument();
    });
  });

  it("handles non-warm tone preference", async () => {
    (adminApi.getSessionDetails as jest.Mock).mockResolvedValue({
      ...mockSession,
      tone_preference: "investigative",
    });

    render(<AdminSessionDetailPage />);

    await waitFor(() => {
      const toneBadge = screen.getByText("investigative Tone");
      expect(toneBadge).toBeInTheDocument();
      // Check for cyan class (else branch)
      expect(toneBadge.className).toContain("bg-cyan-900/30");
    });
  });
});
