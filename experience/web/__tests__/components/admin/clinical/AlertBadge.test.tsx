import { render, screen } from "@testing-library/react";
import { AlertBadge } from "@/components/admin/clinical/AlertBadge";

describe("AlertBadge", () => {
  it("should render stable status correctly", () => {
    render(<AlertBadge alerts={[]} overallStatus="stable" />);

    expect(screen.getByText("🟢")).toBeInTheDocument();
    expect(screen.getByText("All Clear")).toBeInTheDocument();

    // Check styling class (partial match)
    const container = screen.getByText("All Clear").closest(".border-b");
    expect(container).toHaveClass("bg-green-500/20");
    expect(container).toHaveClass("text-green-300");
  });

  it("should render critical status with alerts", () => {
    const alerts: any[] = [
      {
        level: "critical",
        type: "high_arousal",
        message: "High Arousal Detected",
        suggestion: "Consider calming sequence",
      },
    ];

    render(<AlertBadge alerts={alerts} overallStatus="critical" />);

    expect(screen.getByText("🔴")).toBeInTheDocument();
    expect(screen.getByText("1 Alert")).toBeInTheDocument();
    expect(screen.getByText("High Arousal Detected")).toBeInTheDocument();
    expect(screen.getByText("Consider calming sequence")).toBeInTheDocument();

    const container = screen.getByText("1 Alert").closest(".border-b");
    expect(container).toHaveClass("bg-red-500/20");
    expect(container).toHaveClass("text-red-300");
  });

  it("should render warning status with multiple alerts", () => {
    const alerts: any[] = [
      {
        level: "warning",
        type: "voice_quality",
        message: "Audio Quality Low",
      },
      {
        level: "warning",
        type: "pattern_concern",
        message: "Erratic Movement",
      },
    ];

    render(<AlertBadge alerts={alerts} overallStatus="warning" />);

    expect(screen.getByText("⚠️")).toBeInTheDocument();
    expect(screen.getByText("2 Alerts")).toBeInTheDocument();
    expect(screen.getByText("Audio Quality Low")).toBeInTheDocument();
    expect(screen.getByText("Erratic Movement")).toBeInTheDocument();

    const container = screen.getByText("2 Alerts").closest(".border-b");
    expect(container).toHaveClass("bg-yellow-500/20");
    expect(container).toHaveClass("text-yellow-300");
  });

  it("should render attention status", () => {
    render(<AlertBadge alerts={[]} overallStatus="attention" />);

    expect(screen.getByText("🟡")).toBeInTheDocument();

    const container = screen.getByText("All Clear").closest(".border-b");
    expect(container).toHaveClass("bg-orange-500/20");
    expect(container).toHaveClass("text-orange-300");
  });
});
