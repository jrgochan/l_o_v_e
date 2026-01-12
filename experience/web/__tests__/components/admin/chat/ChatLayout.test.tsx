import { render, screen, fireEvent } from "@testing-library/react";
import { ChatLayout } from "@/components/admin/chat/ChatLayout";

describe("ChatLayout", () => {
  const defaultProps = {
    isExpanded: true,
    isFullscreen: false,
    height: 400,
    isResizing: false,
    children: <div data-testid="chat-content">Chat Content</div>,
    onToggleExpand: jest.fn(),
    onMouseDown: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render content when expanded", () => {
    render(<ChatLayout {...defaultProps} />);
    expect(screen.getByTestId("chat-content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open chat/i })).not.toBeInTheDocument();
  });

  it("should render toggle button when collapsed", () => {
    render(<ChatLayout {...defaultProps} isExpanded={false} />);
    expect(screen.queryByTestId("chat-content")).not.toBeInTheDocument();

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    // Check for aria-label or text content if specific
    expect(button).toHaveTextContent(/open chat/i);

    fireEvent.click(button);
    expect(defaultProps.onToggleExpand).toHaveBeenCalled();
  });

  it("should apply correct height styles", () => {
    const { container } = render(<ChatLayout {...defaultProps} height={500} />);
    // The outer div should have height: 500px
    expect(container.firstChild).toHaveStyle({ height: "500px" });
  });

  it("should apply fullscreen styles", () => {
    const { container } = render(<ChatLayout {...defaultProps} isFullscreen={true} />);
    expect(container.firstChild).toHaveStyle({ height: "100vh" });
    expect(container.firstChild).toHaveClass("inset-0");
  });

  it("should render resize handle only when expanded", () => {
    const { rerender, container } = render(<ChatLayout {...defaultProps} />);
    // Look for resize handle by class or structure. It has "cursor-row-resize"
    const handle = container.querySelector(".cursor-row-resize");
    expect(handle).toBeInTheDocument();

    fireEvent.mouseDown(handle!);
    expect(defaultProps.onMouseDown).toHaveBeenCalled();

    rerender(<ChatLayout {...defaultProps} isExpanded={false} />);
    expect(container.querySelector(".cursor-row-resize")).not.toBeInTheDocument();
  });
});
