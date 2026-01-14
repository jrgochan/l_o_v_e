import { renderHook } from "@testing-library/react";
import { useSessionActions } from "@/hooks/command-palette/actions/useSessionActions";
import { useExperienceStore } from "@/stores/useExperienceStore";

jest.mock("@/stores/useExperienceStore");

describe("useSessionActions", () => {
  const mockClose = jest.fn();
  const mockStartSession = jest.fn();
  const mockEndSession = jest.fn();
  const mockPauseSession = jest.fn();
  const mockResumeSession = jest.fn();
  const mockAddSessionNote = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useExperienceStore as unknown as jest.Mock).mockReturnValue({
      activeSession: { status: "active" },
      startSession: mockStartSession,
      endSession: mockEndSession,
      pauseSession: mockPauseSession,
      resumeSession: mockResumeSession,
      addSessionNote: mockAddSessionNote,
    });
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeSession: { status: "active" },
      startSession: mockStartSession,
      endSession: mockEndSession,
      pauseSession: mockPauseSession,
      resumeSession: mockResumeSession,
      addSessionNote: mockAddSessionNote,
    });

    // Mock window methods
    window.confirm = jest.fn();
    window.prompt = jest.fn();
  });

  const getHook = () => renderHook(() => useSessionActions({ close: mockClose }));

  it("should handle /session start", () => {
    // If no session, it should start
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeSession: null,
      startSession: mockStartSession,
    });
    const { result } = getHook();
    result.current.executeSessionCommand("/session start");
    expect(mockStartSession).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle /session end (confirmed)", () => {
    window.confirm = jest.fn(() => true);
    const { result } = getHook();
    result.current.executeSessionCommand("/session end");
    expect(mockEndSession).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle /session pause", () => {
    const { result } = getHook();
    result.current.executeSessionCommand("/session pause");
    expect(mockPauseSession).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle /session resume", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeSession: { status: "paused" },
      resumeSession: mockResumeSession,
    });
    const { result } = getHook();
    result.current.executeSessionCommand("/session resume");
    expect(mockResumeSession).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle /session notes", () => {
    window.prompt = jest.fn(() => "My Note");
    const { result } = getHook();
    result.current.executeSessionCommand("/session notes");
    expect(mockAddSessionNote).toHaveBeenCalledWith("My Note");
    expect(mockClose).toHaveBeenCalled();
  });
  it("should not start session if already active", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeSession: { status: "active" },
      startSession: mockStartSession,
    });
    const { result } = getHook();
    result.current.executeSessionCommand("/session start");
    expect(mockStartSession).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("should not end session if no active session", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeSession: null,
      endSession: mockEndSession,
    });
    const { result } = getHook();
    result.current.executeSessionCommand("/session end");
    expect(mockEndSession).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled(); // Should it close? The code returns early: `if (!activeSession) return;` so NO close.
  });

  it("should not end session if user cancels confirm", () => {
    window.confirm = jest.fn(() => false);
    const { result } = getHook();
    result.current.executeSessionCommand("/session end");
    expect(mockEndSession).not.toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled(); // Code: close() happen after confirm block, regardless of result?
    // Code says:
    // if (window.confirm("End this session?")) { experienceStore.endSession(); }
    // close();
    // So yes, it closes even if cancelled.
  });

  it("should not pause if not active", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeSession: { status: "paused" }, // Already paused or null
      pauseSession: mockPauseSession,
    });
    const { result } = getHook();
    result.current.executeSessionCommand("/session pause");
    expect(mockPauseSession).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("should not resume if not paused", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeSession: { status: "active" }, // Not paused
      resumeSession: mockResumeSession,
    });
    const { result } = getHook();
    result.current.executeSessionCommand("/session resume");
    expect(mockResumeSession).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("should not add note if no active session", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeSession: null,
      addSessionNote: mockAddSessionNote,
    });
    const { result } = getHook();
    result.current.executeSessionCommand("/session notes");
    expect(mockAddSessionNote).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled(); // Returns early
  });

  it("should not add note if prompt cancelled or empty", () => {
    window.prompt = jest.fn(() => null); // Cancelled
    const { result } = getHook();
    result.current.executeSessionCommand("/session notes");
    expect(mockAddSessionNote).not.toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled(); // Closes anyway

    window.prompt = jest.fn(() => "   "); // Empty/Whitespace
    result.current.executeSessionCommand("/session notes");
    expect(mockAddSessionNote).not.toHaveBeenCalled();
  });
  it("should ignore unknown commands", () => {
    const { result } = getHook();
    result.current.executeSessionCommand("/session unknown");
    expect(mockStartSession).not.toHaveBeenCalled();
    expect(mockEndSession).not.toHaveBeenCalled();
    expect(mockPauseSession).not.toHaveBeenCalled();
    expect(mockResumeSession).not.toHaveBeenCalled();
    expect(mockAddSessionNote).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });
});
