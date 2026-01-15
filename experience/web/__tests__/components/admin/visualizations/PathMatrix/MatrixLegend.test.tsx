import { render, screen } from "@testing-library/react";
import { MatrixLegend } from "@/components/admin/visualizations/PathMatrix/MatrixLegend";

describe("MatrixLegend", () => {
  const defaultStats = {
    byDifficulty: {
      easy: 10,
      moderate: 20,
      difficult: 5,
    },
  };

  it("renders correctly with populated stats", () => {
    render(<MatrixLegend stats={defaultStats} />);

    expect(screen.getByText("Legend:")).toBeInTheDocument();

    // Total = 35
    // Easy: 10 (28.6%)
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText(/10 paths/)).toBeInTheDocument();
    expect(screen.getByText(/\(28\.6%\)/)).toBeInTheDocument();

    // Moderate: 20 (57.1%)
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText(/20 paths/)).toBeInTheDocument();
    expect(screen.getByText(/\(57\.1%\)/)).toBeInTheDocument();

    // Difficult: 5 (14.3%)
    expect(screen.getByText("Difficult")).toBeInTheDocument();
    expect(screen.getByText(/5 paths/)).toBeInTheDocument();
    expect(screen.getByText(/\(14\.3%\)/)).toBeInTheDocument();
  });

  it("handles zero stats gracefully", () => {
    render(<MatrixLegend stats={{ byDifficulty: { easy: 0, moderate: 0, difficult: 0 } }} />);

    const elements = screen.getAllByText("0 paths");
    expect(elements).toHaveLength(3); // Easy, Moderate, Difficult

    // Should NOT render percentage parentheses like (NaN%)
    expect(screen.queryByText("%")).not.toBeInTheDocument();
  });
});
