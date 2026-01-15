import { render, screen } from "@testing-library/react";
import { AlertBadge } from "@/components/admin/clinical/AlertBadge";

describe("AlertBadge", () => {
  const mockAlerts = [
    {
      level: "critical" as const,
      type: "high_arousal" as const,
      message: "High Arousal Detected",
      suggestion: "Consider calming intervention",
    },
  ];

  it("renders no alerts state correctly", () => {
    render(<AlertBadge alerts={[]} overallStatus="stable" />);
    expect(screen.getByText("All Clear")).toBeInTheDocument();
    expect(screen.getByText("🟢")).toBeInTheDocument();
  });

  it("renders alerts and critical status correctly", () => {
    render(<AlertBadge alerts={mockAlerts} overallStatus="critical" />);
    expect(screen.getByText("1 Alert")).toBeInTheDocument();
    expect(screen.getByText("🔴")).toBeInTheDocument();
    expect(screen.getByText("High Arousal Detected")).toBeInTheDocument();
    expect(screen.getByText("Consider calming intervention")).toBeInTheDocument();
  });

  it("renders multiple alerts", () => {
    const multipleAlerts = [
      ...mockAlerts,
      {
        level: "warning" as const,
        type: "voice_quality" as const,
        message: "Voice quality degrading",
      },
    ];
    render(<AlertBadge alerts={multipleAlerts} overallStatus="critical" />);
    expect(screen.getByText("2 Alerts")).toBeInTheDocument();
    expect(screen.getByText("Voice quality degrading")).toBeInTheDocument();
  });

  it("renders warning status correctly", () => {
    render(<AlertBadge alerts={mockAlerts} overallStatus="warning" />);
    expect(screen.getByText("⚠️")).toBeInTheDocument();
  });

  it("renders attention status correctly", () => {
    render(<AlertBadge alerts={mockAlerts} overallStatus="attention" />);
    expect(screen.getByText("🟡")).toBeInTheDocument();
  });
});
