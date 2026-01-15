import { render, screen, fireEvent } from "@testing-library/react";
import { GraphNodeDetails } from "@/components/admin/visualizations/graph/GraphNodeDetails";

describe("GraphNodeDetails", () => {
  const mockNode = {
    id: "1",
    group: 1,
    emotion: {
      emotion_name: "Joy",
      category: "joy",
      confidence: 0.95,
      prominence: "primary",
      vac: { valence: 0.8, arousal: 0.5, connection: 0.7 },
    },
    x: 0,
    y: 0,
  };

  const onClose = jest.fn();

  it("renders nothing when node is null", () => {
    const { container } = render(<GraphNodeDetails node={null} onClose={onClose} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders node details when node is provided", () => {
    render(<GraphNodeDetails node={mockNode as any} onClose={onClose} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("joy")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("primary")).toBeInTheDocument();
    // VAC
    expect(screen.getByText(/0.80/)).toBeInTheDocument();
    expect(screen.getByText(/0.50/)).toBeInTheDocument();
    expect(screen.getByText(/0.70/)).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(<GraphNodeDetails node={mockNode as any} onClose={onClose} />);
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
