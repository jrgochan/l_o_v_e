import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { VoiceChat } from "@/components/admin/chat/VoiceChat";
import { usePersonaPlexVoice } from "@/hooks/usePersonaPlexVoice";

// Mock dependencies
jest.mock("@/hooks/usePersonaPlexVoice");
jest.mock("@/hooks/admin/useAdminTheme", () => ({
  useAdminTheme: () => ({
    colors: {
      background: "bg-black",
      text: {
        primary: "text-white",
        secondary: "text-gray-400",
        muted: "text-gray-500",
      },
      hover: "hover:bg-gray-800",
      border: "border-gray-800",
    },
  }),
}));
jest.mock("@/components/admin/chat/AudioVisualizer", () => ({
  AudioVisualizer: () => <div data-testid="audio-visualizer">Visualizer</div>,
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

describe("VoiceChat", () => {
  const mockStartSession = jest.fn();
  const mockStopSession = jest.fn();
  const mockToggleMute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePersonaPlexVoice as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      startSession: mockStartSession,
      stopSession: mockStopSession,
      isMuted: false,
      toggleMute: mockToggleMute,
      audioLevel: 0,
      latency: null,
      error: null,
    });
  });

  it("renders disconnected state correctly", () => {
    render(
      <VoiceChat personaId="lumina" personaColor="#F59E0B" personaDescription="Warm and kind" />
    );

    expect(screen.getByText("Voice Mode Active")).toBeInTheDocument();
    expect(screen.getByText("Warm and kind")).toBeInTheDocument();
    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
    expect(screen.getByText("🎙️ Start Voice Session")).toBeInTheDocument();
    expect(screen.getByTestId("audio-visualizer")).toBeInTheDocument();
  });

  it("renders connecting state", () => {
    (usePersonaPlexVoice as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: true,
      startSession: mockStartSession,
      stopSession: mockStopSession,
      isMuted: false,
      toggleMute: mockToggleMute,
      audioLevel: 0,
      latency: null,
      error: null,
    });

    render(<VoiceChat personaId="lumina" personaColor="#F59E0B" personaDescription="Warm" />);

    // "Connecting..." appears in status and on button
    expect(screen.getAllByText("Connecting...")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /connecting/i })).toBeDisabled();
  });

  it("renders connected state and handles disconnect", () => {
    (usePersonaPlexVoice as jest.Mock).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      startSession: mockStartSession,
      stopSession: mockStopSession,
      isMuted: false,
      toggleMute: mockToggleMute,
      audioLevel: 0.5,
      latency: 45,
      error: null,
    });

    render(<VoiceChat personaId="lumina" personaColor="#F59E0B" personaDescription="Warm" />);

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("45ms")).toBeInTheDocument();

    const endButton = screen.getByText("⏹️ End Session");
    fireEvent.click(endButton);
    expect(mockStopSession).toHaveBeenCalled();
  });

  it("handles start session", () => {
    render(<VoiceChat personaId="lumina" personaColor="#F59E0B" personaDescription="Warm" />);

    const startButton = screen.getByText("🎙️ Start Voice Session");
    fireEvent.click(startButton);
    expect(mockStartSession).toHaveBeenCalled();
  });

  it("toggles mute", () => {
    (usePersonaPlexVoice as jest.Mock).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      startSession: mockStartSession,
      stopSession: mockStopSession,
      isMuted: false,
      toggleMute: mockToggleMute,
      audioLevel: 0.5,
      latency: 45,
      error: null,
    });

    render(<VoiceChat personaId="lumina" personaColor="#F59E0B" personaDescription="Warm" />);

    const muteButton = screen.getByTitle("Mute"); // isMuted false -> icon is mic -> title Mute
    fireEvent.click(muteButton);
    expect(mockToggleMute).toHaveBeenCalled();
  });

  it("shows mute state", () => {
    (usePersonaPlexVoice as jest.Mock).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      startSession: mockStartSession,
      stopSession: mockStopSession,
      isMuted: true,
      toggleMute: mockToggleMute,
      audioLevel: 0.5,
      latency: 45,
      error: null,
    });

    render(<VoiceChat personaId="lumina" personaColor="#F59E0B" personaDescription="Warm" />);

    expect(screen.getByTitle("Unmute")).toBeInTheDocument();
    expect(screen.getByText("🔇")).toBeInTheDocument();
  });

  it("displays error", () => {
    (usePersonaPlexVoice as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      startSession: mockStartSession,
      stopSession: mockStopSession,
      isMuted: false,
      toggleMute: mockToggleMute,
      audioLevel: 0,
      latency: null,
      error: "Connection failed",
    });

    render(<VoiceChat personaId="lumina" personaColor="#F59E0B" personaDescription="Warm" />);

    expect(screen.getByText("⚠️ Connection failed")).toBeInTheDocument();
  });

  it("captures logs from hook callbacks", () => {
    // Suppress console logs for this test as it intentionally triggers them
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // We need to trigger the callbacks passed to usePersonaPlexVoice
    // We can capture the props passed to the hook mock

    let hookProps: any;
    (usePersonaPlexVoice as jest.Mock).mockImplementation((props) => {
      hookProps = props;
      return {
        isConnected: false,
        isConnecting: false,
        startSession: mockStartSession,
        stopSession: mockStopSession,
        isMuted: false,
        toggleMute: mockToggleMute,
        audioLevel: 0,
        latency: null,
        error: null,
      };
    });

    render(<VoiceChat personaId="lumina" personaColor="#F59E0B" personaDescription="Warm" />);

    // Trigger callbacks
    expect(hookProps).toBeDefined();

    // Simulate onSessionStart
    // Note: VoiceChat uses internal state for logs. We can check if logs appear in DOM.

    React.act(() => {
      hookProps.onSessionStart();
    });
    expect(screen.getByText("Session STARTED")).toBeInTheDocument();

    React.act(() => {
      hookProps.onSessionEnd();
    });
    expect(screen.getByText("Session ENDED")).toBeInTheDocument();

    React.act(() => {
      hookProps.onError("Some Error");
    });
    expect(screen.getByText("ERROR: Some Error")).toBeInTheDocument();

    React.act(() => {
      hookProps.onDebug("Debug info");
    });
    expect(screen.getByText("Debug info")).toBeInTheDocument();

    // Restore console
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
