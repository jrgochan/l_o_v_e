import { render, screen } from "@testing-library/react";
import { VACDisplay } from "@/components/VACDisplay";

describe("VACDisplay output", () => {
  it("renders nothing when vac is null or undefined", () => {
    const { container } = render(<VACDisplay vac={null} />);
    expect(container).toBeEmptyDOMElement();
    const { container: container2 } = render(<VACDisplay />);
    expect(container2).toBeEmptyDOMElement();
  });

  it("renders values correctly when provided", () => {
    render(<VACDisplay vac={[0.5, -0.2, 0.8]} />);

    expect(screen.getByText("Valence")).toBeInTheDocument();
    expect(screen.getByText("Arousal")).toBeInTheDocument();
    expect(screen.getByText("Connection")).toBeInTheDocument();

    // Check formatted values
    expect(screen.getByText("0.500")).toBeInTheDocument();
    expect(screen.getByText("-0.200")).toBeInTheDocument();
    expect(screen.getByText("0.800")).toBeInTheDocument();
  });
});
