import { render, screen } from "@testing-library/react";
import { PathComparison } from "@/components/admin/panels/InfoPanel/PathComparison";
import { usePathComparison } from "@/hooks/admin/usePathComparison";

jest.mock("@/hooks/admin/usePathComparison");

describe("PathComparison", () => {
  const mockPaths = [
    { id: "p1", total_distance: 10 },
    { id: "p2", total_distance: 20 }
  ];

  beforeEach(() => {
    (usePathComparison as jest.Mock).mockReturnValue({
      shortestDistance: 10,
      longestDistance: 20,
      hasEasyPath: true,
      noBridgePaths: 1
    });
  });

  it("returns null if not enough paths", () => {
    const { container } = render(<PathComparison paths={[{ id: "p1" }] as any} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders comparison metrics when enough paths", () => {
    render(<PathComparison paths={mockPaths as any} />);

    expect(screen.getByText("⚖️ Path Comparison (2 paths)")).toBeInTheDocument();

    // Shortest
    expect(screen.getByText("Shortest")).toBeInTheDocument();
    expect(screen.getByText("10.00")).toBeInTheDocument();

    // Longest
    expect(screen.getByText("Longest")).toBeInTheDocument();
    expect(screen.getByText("20.00")).toBeInTheDocument();

    // Easiest
    expect(screen.getByText("Easiest")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();

    // No Bridges
    expect(screen.getByText("No Bridges")).toBeInTheDocument();
    expect(screen.getByText("1 path")).toBeInTheDocument();
  });

  it("handles pluralization for no bridge paths", () => {
    (usePathComparison as jest.Mock).mockReturnValue({
      shortestDistance: 10,
      longestDistance: 20,
      hasEasyPath: false,
      noBridgePaths: 2
    });

    render(<PathComparison paths={mockPaths as any} />);
    expect(screen.getByText("2 paths")).toBeInTheDocument();
  });
});
