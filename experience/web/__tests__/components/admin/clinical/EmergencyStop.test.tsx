import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { EmergencyStop } from "@/components/admin/clinical/EmergencyStop";

describe("EmergencyStop", () => {
  const mockOnActivate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not render if session is not active or no session ID", () => {
    const { container } = render(
      <EmergencyStop isSessionActive={false} sessionId="123" onActivate={mockOnActivate} />
    );
    expect(container).toBeEmptyDOMElement();

    const { container: container2 } = render(
      <EmergencyStop isSessionActive={true} sessionId="" onActivate={mockOnActivate} />
    );
    expect(container2).toBeEmptyDOMElement();

    // Test default isSessionActive=false
    const { container: container3 } = render(
      <EmergencyStop sessionId="123" onActivate={mockOnActivate} />
    );
    expect(container3).toBeEmptyDOMElement();
  });

  it("renders FAB when active", () => {
    render(<EmergencyStop isSessionActive={true} sessionId="123" onActivate={mockOnActivate} />);
    // Title is "Emergency Stop — Pause active session"
    expect(screen.getByTitle(/Emergency Stop/i)).toBeInTheDocument();
  });

  it("opens confirmation modal on click", () => {
    render(
      <EmergencyStop
        isSessionActive={true}
        sessionId="123"
        clientName="John Doe"
        onActivate={mockOnActivate}
      />
    );

    const fab = screen.getByTitle(/Emergency Stop/i);
    fireEvent.click(fab);

    expect(screen.getByText("Emergency Session Pause")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("closes modal on Cancel", () => {
    render(<EmergencyStop isSessionActive={true} sessionId="123" onActivate={mockOnActivate} />);

    fireEvent.click(screen.getByTitle(/Emergency Stop/i));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText("Emergency Session Pause")).not.toBeInTheDocument();
    expect(mockOnActivate).not.toHaveBeenCalled();
  });

  it("closes modal on X button", () => {
    render(<EmergencyStop isSessionActive={true} sessionId="123" onActivate={mockOnActivate} />);

    fireEvent.click(screen.getByTitle(/Emergency Stop/i));

    // The X button might tricky to select if it doesn't have text.
    // It has an Icon inside.
    // We can select by looking for the button in the header.
    // Or just "button" that is not Cancel/Activate.
    // Let's add test-id if needed, but trying selector first.
    // It is a button with an svg inside.

    // It's the button inside the header flex
    const closeBtn = screen.getAllByRole("button")[1]; // FAB is one, then X, then Cancel, then Activate? FAB is behind modal?
    // Wait, FAB is in document. Modal is in document.
    // FAB is button 0.
    // Modal buttons: X, Cancel, Activate.
    // So distinct buttons.

    // Let's try to find it by SVG or just get by role and verify.
    // X icon usually doesn't have text.

    // We can use container.querySelector to find the button with X icon class or similar?
    // Or just fireEvent on the button that contains the X icon.
    // Lucide X Icon.

    const buttons = screen.getAllByRole("button");
    // 0: FAB
    // 1: X (hopefully)
    // 2: Cancel
    // 3: Activate

    // Let's click the one that looks like header close.
    fireEvent.click(buttons[1]);

    expect(screen.queryByText("Emergency Session Pause")).not.toBeInTheDocument();
  });

  it("activates emergency stop", () => {
    render(<EmergencyStop isSessionActive={true} sessionId="123" onActivate={mockOnActivate} />);

    fireEvent.click(screen.getByTitle(/Emergency Stop/i));
    fireEvent.click(screen.getByText("Activate Emergency Stop"));

    expect(mockOnActivate).toHaveBeenCalledWith("123");
    expect(screen.queryByText("Emergency Session Pause")).not.toBeInTheDocument();

    // Check disabled state of FAB
    expect(screen.getByTitle(/Emergency Stop/i)).toBeDisabled();
  });

  it("resets after timeout", () => {
    render(<EmergencyStop isSessionActive={true} sessionId="123" onActivate={mockOnActivate} />);

    fireEvent.click(screen.getByTitle(/Emergency Stop/i));
    fireEvent.click(screen.getByText("Activate Emergency Stop"));

    expect(screen.getByTitle(/Emergency Stop/i)).toBeDisabled();

    // Fast forward 30s
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(screen.getByTitle(/Emergency Stop/i)).not.toBeDisabled();
  });

  it("uses default client name", () => {
    render(
      <EmergencyStop
        isSessionActive={true}
        sessionId="123"
        // clientName undefined -> default "this client"
      />
    );

    fireEvent.click(screen.getByTitle(/Emergency Stop/i));
    expect(screen.getByText("this client")).toBeInTheDocument();
  });

  it("handles missing onActivate safely", () => {
    render(
      <EmergencyStop
        isSessionActive={true}
        sessionId="123"
        // onActivate undefined
      />
    );

    fireEvent.click(screen.getByTitle(/Emergency Stop/i));
    fireEvent.click(screen.getByText("Activate Emergency Stop"));

    // Should not throw
    expect(screen.queryByText("Emergency Session Pause")).not.toBeInTheDocument();
  });
});
