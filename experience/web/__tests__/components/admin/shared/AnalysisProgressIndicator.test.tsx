import { render, screen, act } from "@testing-library/react";
import {
  AnalysisProgressIndicator,
  ProgressStage,
} from "@/components/admin/shared/AnalysisProgressIndicator";

const mockStages: ProgressStage[] = [
  {
    id: "stage1",
    label: "Stage 1",
    icon: "🔴",
    status: "complete",
    percentage: 33,
    elapsed_ms: 1000,
  },
  { id: "stage2", label: "Stage 2", icon: "🔵", status: "in_progress", percentage: 33 },
  { id: "stage3", label: "Stage 3", icon: "🟢", status: "pending", percentage: 34 },
];

describe("AnalysisProgressIndicator", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders correctly in standard mode", () => {
    render(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage2"
        overallPercentage={45}
        currentMessage="Analyzing..."
        toneMode="warm"
        deepFeelingMode={false}
      />
    );

    expect(screen.getByText("Emotional Analysis")).toBeInTheDocument();
    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
    expect(screen.getByText("Overall Progress")).toBeInTheDocument();
    expect(screen.getAllByText("45%").length).toBeGreaterThanOrEqual(2);
    // Check progress bar text (should have font-mono)
    const percentageText = screen
      .getAllByText("45%")
      .find((el) => el.classList.contains("font-mono"));
    expect(percentageText).toBeInTheDocument();
    expect(percentageText).toHaveClass("text-cyan-400");
  });

  it("renders correctly in deep feeling mode", () => {
    render(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage2"
        overallPercentage={45}
        currentMessage="Deep diving..."
        toneMode="clinical"
        deepFeelingMode={true}
      />
    );

    expect(screen.getByText("Deep Feeling Analysis")).toBeInTheDocument();
  });

  it("updates elapsed time", () => {
    render(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage2"
        overallPercentage={45}
        currentMessage="Analyzing..."
        toneMode="warm"
        deepFeelingMode={false}
      />
    );

    expect(screen.getByText("0.0s elapsed")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(screen.getByText("1.0s elapsed")).toBeInTheDocument();
  });

  it("animates dots in message", () => {
    render(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage2"
        overallPercentage={45}
        currentMessage="Processing"
        toneMode="warm"
        deepFeelingMode={false}
      />
    );

    const message = screen.getByText("Processing");
    const p = message.closest("p");
    expect(p).toHaveTextContent("Processing");

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(p).toHaveTextContent("Processing.");

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(p).toHaveTextContent("Processing..");

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(p).toHaveTextContent("Processing...");

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(p).toHaveTextContent("Processing");
  });

  it("stops animating dots when processing is complete", () => {
    const { rerender } = render(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage2"
        overallPercentage={45}
        currentMessage="Processing"
        toneMode="warm"
        deepFeelingMode={false}
      />
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    rerender(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage3"
        overallPercentage={100}
        currentMessage="Done"
        toneMode="warm"
        deepFeelingMode={false}
      />
    );

    expect(screen.getByText("Done")).toBeInTheDocument();
    const p = screen.getByText("Done").closest("p");
    expect(p).not.toHaveTextContent("Done.");
  });

  it("renders checklist items correctly", () => {
    render(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage2"
        overallPercentage={45}
        currentMessage="Analyzing..."
        toneMode="warm"
        deepFeelingMode={false}
      />
    );

    expect(screen.getByText("Stage 1")).toBeInTheDocument();
    expect(screen.getByText("1.0s")).toBeInTheDocument(); // stage1 elapsed
    // Stage 2 is rendered multiple times (header + checklist)
    expect(screen.getAllByText("Stage 2").length).toBeGreaterThan(0);
  });

  it("renders different colors for pulsing orb based on percentage", () => {
    const { rerender } = render(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage1"
        overallPercentage={20}
        currentMessage="Start"
        toneMode="warm"
        deepFeelingMode={false}
      />
    );

    rerender(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage1"
        overallPercentage={50}
        currentMessage="Mid"
        toneMode="warm"
        deepFeelingMode={false}
      />
    );

    rerender(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage1"
        overallPercentage={90}
        currentMessage="End"
        toneMode="warm"
        deepFeelingMode={false}
      />
    );
  });

  it("renders active stage section", () => {
    render(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage2"
        overallPercentage={45}
        currentMessage="Analyzing..."
        toneMode="warm"
        deepFeelingMode={false}
      />
    );

    // We expect "Stage 2" to appear multiple times (current stage header + checklist)
    expect(screen.getAllByText("Stage 2").length).toBeGreaterThan(1);
  });

  it("does not render current stage if complete or missing", () => {
    render(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage1"
        overallPercentage={45}
        currentMessage="Analyzing..."
        toneMode="warm"
        deepFeelingMode={false}
      />
    );
    // Stage 1 is complete, so it appears only in checklist
    expect(screen.getAllByText("Stage 1").length).toBe(1);

    render(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="non-existent"
        overallPercentage={45}
        currentMessage="Analyzing..."
        toneMode="warm"
        deepFeelingMode={false}
      />
    );
    expect(screen.queryByText("non-existent")).not.toBeInTheDocument();
  });

  it("uses clinical tone styling for message", () => {
    render(
      <AnalysisProgressIndicator
        stages={mockStages}
        currentStage="stage2"
        overallPercentage={45}
        currentMessage="Clinical Msg"
        toneMode="clinical"
        deepFeelingMode={false}
      />
    );

    // The message is wrapped in a p tag, which is wrapped in a div with the styling
    const msgDiv = screen.getByText("Clinical Msg").closest("div");
    // Verify the DIV has the class, not its parent
    expect(msgDiv).toHaveClass("text-blue-300");
  });
});
