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

// Mock Logger
jest.mock("@/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));
import { logger } from "@/utils/logger";

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

  it("renders buckets correctly (Low/Med/High)", () => {
    // Create a test case covering different buckets than default
    const mixedProsody: ProsodyData = {
      pitch_mean: 100, // Low (<150)
      pitch_std: 40,   // High var (>30)
      energy: 0.2,     // Low (<0.3/0.4)
      rate: 6,         // Fast (>5)
      features: {}
    };

    const { unmount } = render(<ProsodyVisualization prosody={mixedProsody} audioBlob={null} />);

    expect(screen.getByText("Low Pitch")).toBeInTheDocument();
    expect(screen.getByText("Low Energy").className).toContain("text-blue-400"); // Energy 0.2 -> Low Energy -> Blue coverage 
    // Energy 0.2 -> Low Energy
    expect(screen.getByText("Low Energy")).toBeInTheDocument();
    expect(screen.getByText("Fast Speech")).toBeInTheDocument();
    expect(screen.getByText(/High pitch variability/i)).toBeInTheDocument();

    unmount();

    // Moderate buckets
    const medProsody: ProsodyData = {
      pitch_mean: 260, // High (>250)
      pitch_std: 10,   // Low (<15)
      energy: 0.5,     // Moderate (>0.4)
      rate: 2,         // Slow (<3)
      features: {}
    };
    render(<ProsodyVisualization prosody={medProsody} audioBlob={null} />);
    expect(screen.getByText("High Pitch")).toBeInTheDocument(); // Purple
    expect(screen.getByText("Moderate Energy")).toBeInTheDocument(); // Yellow
    expect(screen.getByText("Slow Speech")).toBeInTheDocument(); // Blue
    expect(screen.getByText(/Low pitch variability may indicate/)).toBeInTheDocument();
  });

  it("handles missing/null metrics", () => {
    const minimalProsody: any = { features: {} }; // Missing basic fields
    render(<ProsodyVisualization prosody={minimalProsody} audioBlob={null} />);

    // Should handle unknown/nulls gracefully
    // Based on code: if (!energy) return { label: "Unknown", ... }
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
  });
  it("handles audio processing errors", async () => {
    const mockBlob = new Blob(["corrupt data"], { type: "audio/wav" });
    mockBlob.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
    // Mock failure
    mockDecodeAudioData.mockRejectedValue(new Error("Decoding failed"));

    const { unmount } = render(<ProsodyVisualization prosody={mockProsody} audioBlob={mockBlob} />);

    // Should show loading then fallback to synthetic
    expect(screen.getByText("Processing audio...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Processing audio...")).not.toBeInTheDocument();
    });

    // Should verify logger was called and synthetic displayed
    expect(logger.error).toHaveBeenCalledWith("rendering", "Failed to extract waveform", expect.any(Error));
    expect(screen.getByText(/📊 Synthetic/)).toBeInTheDocument();

    unmount();
  });
  it("renders non-numeric features", () => {
    const stringFeatureProsody: any = {
      ...mockProsody,
      features: { status: "Active" }
    };
    render(<ProsodyVisualization prosody={stringFeatureProsody} audioBlob={null} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("returns null when prosody is missing", () => {
    const { container } = render(<ProsodyVisualization prosody={null as any} audioBlob={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
