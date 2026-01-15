import { render, screen } from "@testing-library/react";
import { GraphLegend } from "@/components/admin/visualizations/graph/GraphLegend";

describe("GraphLegend", () => {
  it("renders all legend items", () => {
    render(<GraphLegend />);
    expect(screen.getByText("Relationship Types:")).toBeInTheDocument();
    expect(screen.getByText("Complementary")).toBeInTheDocument();
    expect(screen.getByText("Contradictory")).toBeInTheDocument();
    expect(screen.getByText("Masking")).toBeInTheDocument();
    expect(screen.getByText("Amplifying")).toBeInTheDocument();
    expect(screen.getByText("Sequential")).toBeInTheDocument();
  });

  it("renders interaction hints", () => {
    render(<GraphLegend />);
    expect(screen.getByText("Node size = Confidence")).toBeInTheDocument();
    expect(screen.getByText("Node color = VAC Valence")).toBeInTheDocument();
    expect(screen.getByText("Drag to reposition")).toBeInTheDocument();
  });
});
