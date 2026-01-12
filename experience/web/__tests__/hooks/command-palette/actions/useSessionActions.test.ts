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
});
