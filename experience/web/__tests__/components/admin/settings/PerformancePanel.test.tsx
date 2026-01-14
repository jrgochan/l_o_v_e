
import { render, screen } from "@testing-library/react";
import { PerformancePanel } from "@/components/admin/settings/PerformancePanel";

const mockPerformance = {
  "chat_response": {
    avg_latency_ms: 1500,
    total_invocations: 10,
    last_used: "2024-01-01T10:00:00.000Z",
  },
  "sentiment_analysis": {
    avg_latency_ms: 4500,
    total_invocations: 50,
    last_used: "2024-01-01T11:00:00.000Z",
  },
  "slow_function": {
    avg_latency_ms: 8000,
    total_invocations: 2,
    last_used: null,
  },
  "unused_function": {
    avg_latency_ms: 0,
    total_invocations: 0,
    last_used: null,
  }
};

const mockAssignments = {
  "chat_response": "llama3",
  "sentiment_analysis": "bert-base",
  "slow_function": "gpt4all",
  "unused_function": "none"
};

describe("PerformancePanel", () => {
  it("renders empty state when no active functions", () => {
    render(
      <PerformancePanel
        performance={{}}
        assignments={null}
      />
    );
    expect(screen.getByText("No performance data yet. Run some analyses to see metrics here.")).toBeInTheDocument();
  });

  it("renders performance cards for active functions", () => {
    render(
      <PerformancePanel
        performance={mockPerformance}
        assignments={mockAssignments}
      />
    );

    // Should show chat_response (10 invocations)
    expect(screen.getByText("Chat Response")).toBeInTheDocument();

    // Should show sentiment_analysis (50 invocations)
    expect(screen.getByText("Sentiment Analysis")).toBeInTheDocument();

    // Should NOT show unused_function (0 invocations)
    expect(screen.queryByText("Unused Function")).not.toBeInTheDocument();
  });

  it("renders correct latency metrics and colors", () => {
    render(
      <PerformancePanel
        performance={mockPerformance}
        assignments={mockAssignments}
      />
    );

    // Fast (Green) - < 2000ms
    const fastLatency = screen.getByText("1.5s");
    expect(fastLatency).toHaveClass("text-green-400");
    expect(screen.getByText("⚡⚡⚡")).toBeInTheDocument();
    expect(screen.getByText("Fast")).toBeInTheDocument();

    // Moderate (Yellow) - < 5000ms
    const moderateLatency = screen.getByText("4.5s");
    expect(moderateLatency).toHaveClass("text-yellow-400");
    expect(screen.getByText("⚡⚡")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();

    // Slow (Orange) - >= 5000ms
    const slowLatency = screen.getByText("8.0s");
    expect(slowLatency).toHaveClass("text-orange-400");
    expect(screen.getByText("⚡")).toBeInTheDocument();
    expect(screen.getAllByText("Slow")[0]).toBeInTheDocument();
  });

  it("displays assignment info", () => {
    render(
      <PerformancePanel
        performance={mockPerformance}
        assignments={mockAssignments}
      />
    );

    expect(screen.getByText("llama3")).toBeInTheDocument();
    expect(screen.getByText("bert-base")).toBeInTheDocument();
  });

  it("displays last used timestamp if available", () => {
    render(
      <PerformancePanel
        performance={mockPerformance}
        assignments={mockAssignments}
      />
    );

    // We can rely on locale string rendering, but let's just check rendering
    // Since locale date string varies, we just check regex or partial
    // Or just expect the text "Last used:" to be present
    expect(screen.getAllByText(/Last used:/).length).toBeGreaterThan(0);
  });

  it("handles edge cases", () => {
    const edgeCasePerf = {
      "edge_func": {
        avg_latency_ms: null,
        total_invocations: 1,
        last_used: null
      }
    };

    render(
      <PerformancePanel
        performance={edgeCasePerf}
        assignments={null} // null assignments
      />
    );

    // Verify "Unknown" model name (assignments is null)
    expect(screen.getByText("Unknown")).toBeInTheDocument();

    // Verify null latency -> 0.0s
    expect(screen.getByText("0.0s")).toBeInTheDocument();

    // Verify singular invocation
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("invocation")).toBeInTheDocument();
    expect(screen.queryByText("invocations")).not.toBeInTheDocument();
  });
});
