import { render, screen, fireEvent, act } from "@testing-library/react";
import { Toggle, ToggleGroup } from "@/components/ui/Toggle";

describe("Toggle", () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    checked: false,
    onChange: mockOnChange,
    leftLabel: "Left",
    rightLabel: "Right",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<Toggle {...defaultProps} />);

    expect(screen.getByText("Left")).toBeInTheDocument();
    expect(screen.getByText("Right")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("toggles state on click", () => {
    render(<Toggle {...defaultProps} />);

    fireEvent.click(screen.getByRole("switch"));
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it("toggles state on click when already checked", () => {
    render(<Toggle {...defaultProps} checked={true} />);

    fireEvent.click(screen.getByRole("switch"));
    expect(mockOnChange).toHaveBeenCalledWith(false);
  });

  it("handles keyboard interactions (Enter)", () => {
    render(<Toggle {...defaultProps} />);

    const switchEl = screen.getByRole("switch");
    act(() => {
      switchEl.focus();
    });
    fireEvent.keyDown(switchEl, { key: "Enter" });

    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it("handles keyboard interactions (Space)", () => {
    render(<Toggle {...defaultProps} />);

    const switchEl = screen.getByRole("switch");
    act(() => {
      switchEl.focus();
    });
    fireEvent.keyDown(switchEl, { key: " " });

    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it("ignores other keys", () => {
    render(<Toggle {...defaultProps} />);

    const switchEl = screen.getByRole("switch");
    act(() => {
      switchEl.focus();
    });
    fireEvent.keyDown(switchEl, { key: "ArrowRight" });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("renders disabled state correctly", () => {
    render(<Toggle {...defaultProps} disabled={true} />);

    const switchEl = screen.getByRole("switch");
    expect(switchEl).toBeDisabled();

    // Click should not trigger change
    fireEvent.click(switchEl);
    expect(mockOnChange).not.toHaveBeenCalled();

    // Keyboard should not trigger change (implicit via disabled attribute in browser, but good to explicit check logic if custom)
    fireEvent.keyDown(switchEl, { key: "Enter" });
    expect(mockOnChange).not.toHaveBeenCalled();

    // Visual classes check (optional usually, but useful here as we have custom visuals)
    expect(switchEl).toHaveClass("cursor-not-allowed");
  });

  it("shows focus ring on focus", () => {
    render(<Toggle {...defaultProps} />);
    const switchEl = screen.getByRole("switch");

    act(() => {
      fireEvent.focus(switchEl);
    });
    expect(switchEl).toHaveClass("ring-2");

    act(() => {
      fireEvent.blur(switchEl);
    });
    expect(switchEl).not.toHaveClass("ring-2");
  });

  it("renders tooltip", () => {
    render(<Toggle {...defaultProps} tooltip="Test Tooltip" />);
    // Tooltip is on the wrapper div
    expect(screen.getByTitle("Test Tooltip")).toBeInTheDocument();
  });
});

describe("ToggleGroup", () => {
  it("renders children correctly", () => {
    render(
      <ToggleGroup>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </ToggleGroup>
    );

    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
  });

  it("applies custom class", () => {
    const { container } = render(
      <ToggleGroup className="custom-class">
        <div />
      </ToggleGroup>
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
