import { render, screen, act, fireEvent } from "@testing-library/react";
import { ViewerShortcuts } from "../../components/ViewerShortcuts";

describe("ViewerShortcuts", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render shortcuts list", () => {
    render(<ViewerShortcuts />);
    expect(screen.getByText("Toggle HUD")).toBeInTheDocument();
    expect(screen.getByText("Toggle Audio")).toBeInTheDocument();
    expect(screen.getByText("Cmd Palette")).toBeInTheDocument();
  });

  it("should handle auto-fade on inactivity", () => {
    const { container } = render(<ViewerShortcuts />);
    const wrapper = container.firstChild as HTMLElement;

    // Initially visible (opacity-100)
    expect(wrapper).toHaveClass("opacity-100");

    // Advance timers past 8s
    act(() => {
      jest.advanceTimersByTime(9000);
    });

    // Should be faded (opacity-30)
    expect(wrapper).toHaveClass("opacity-30");

    // Should become visible on hover (via class check logic in component)
    // Note: verify class usage
    expect(wrapper).toHaveClass("hover:opacity-100");
  });

  it("should reset timer on activity", () => {
    const { container } = render(<ViewerShortcuts />);
    const wrapper = container.firstChild as HTMLElement;

    // Advance almost to timeout
    act(() => {
      jest.advanceTimersByTime(7000);
    });

    // Trigger activity
    fireEvent.mouseMove(window);

    // Advance past original timeout point
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Should still be visible because timer was reset
    expect(wrapper).toHaveClass("opacity-100");
  });
});
