import { render, screen, waitFor } from "@testing-library/react";
import { ProsodyVisualization } from "@/components/admin/clinical/ProsodyVisualization";
import type { ProsodyData } from "@/types/chat";

const mockProsody: ProsodyData = {
  pitch_mean: 200,
  pitch_std: 20,
  energy: 0.8,
  rate: 4.5,
  features: { custom_metric: 1.23 },
};

// Mock AudioContext and Blob
const mockDecodeAudioData = jest.fn();
const mockClose = jest.fn();

class MockAudioContext {
  decodeAudioData = mockDecodeAudioData;
  close = mockClose;
}

beforeAll(() => {
  window.AudioContext = MockAudioContext as any;
  (window as any).webkitAudioContext = MockAudioContext;
});

describe("ProsodyVisualization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders metrics correctly", () => {
    render(<ProsodyVisualization prosody={mockProsody} audioBlob={null} />);

    expect(screen.getByText(/Voice Prosody Analysis/)).toBeInTheDocument();

    // Header label for Energy > 0.7 ("High Energy")
    expect(screen.getByText(/High Energy/)).toBeInTheDocument();

    // Pitch
    expect(screen.getByText("Normal Pitch")).toBeInTheDocument(); // 200Hz is Normal (>150)
    expect(screen.getByText("200.0 Hz ±20.0")).toBeInTheDocument();

    // Energy
    expect(screen.getByText("Vocal Energy")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();

    // Rate
    expect(screen.getByText("Normal Pace")).toBeInTheDocument(); // 4.5 is Normal (>3)
    expect(screen.getByText("4.5 syll/sec")).toBeInTheDocument();
  });

  it("renders synthetic waveform when audioBlob is missing", () => {
    render(<ProsodyVisualization prosody={mockProsody} audioBlob={null} />);
    expect(screen.getByText(/📊 Synthetic/)).toBeInTheDocument();
    expect(screen.queryByText(/🎙️ Real Audio/)).not.toBeInTheDocument();
  });

  it("renders real waveform when audioBlob is provided", async () => {
    const mockBlob = new Blob(["mock audio data"], { type: "audio/wav" });

    // Mock arrayBuffer implementation
    mockBlob.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));

    // Mock decodeAudioData response
    mockDecodeAudioData.mockResolvedValue({
      getChannelData: () => new Float32Array(100), // Mock data
    });

    render(<ProsodyVisualization prosody={mockProsody} audioBlob={mockBlob} />);

    // Should show loading initially
    expect(screen.getByText("Processing audio...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Processing audio...")).not.toBeInTheDocument();
    });

    expect(screen.getByText(/🎙️ Real Audio/)).toBeInTheDocument();
    expect(mockDecodeAudioData).toHaveBeenCalled();
  });

  it("handles audio processing error gracefully", async () => {
    const mockBlob = new Blob(["corrupt data"], { type: "audio/wav" });
    mockBlob.arrayBuffer = jest.fn().mockRejectedValue(new Error("Read error"));

    render(<ProsodyVisualization prosody={mockProsody} audioBlob={mockBlob} />);

    await waitFor(() => {
      expect(screen.queryByText("Processing audio...")).not.toBeInTheDocument();
    });

    // Should fallback to synthetic
    expect(screen.getByText(/📊 Synthetic/)).toBeInTheDocument();
  });

  it("renders clinical interpretation", () => {
    render(<ProsodyVisualization prosody={mockProsody} audioBlob={null} />);

    // Energy 0.8 -> High
    expect(screen.getByText(/High vocal energy may indicate/)).toBeInTheDocument();
  });
});
