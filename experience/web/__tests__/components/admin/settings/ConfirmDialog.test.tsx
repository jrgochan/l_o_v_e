
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "@/components/admin/settings/ConfirmDialog";

describe("ConfirmDialog", () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <ConfirmDialog
        isOpen={false}
        title="Test Title"
        message="Test Message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
  });

  it("renders correctly when open", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Item?"
        message="Are you sure you want to delete this?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("Delete Item?")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to delete this?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        message="Message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button clicked", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        message="Message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("renders custom labels", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        message="Message"
        confirmLabel="Yes, Delete"
        cancelLabel="No, Keep"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole("button", { name: "Yes, Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No, Keep" })).toBeInTheDocument();
  });

  it("renders variant styles", () => {
    const { rerender } = render(
      <ConfirmDialog
        isOpen={true}
        title="Danger"
        message="Message"
        variant="danger"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    expect(confirmBtn).toHaveClass("bg-red-600");

    rerender(
      <ConfirmDialog
        isOpen={true}
        title="Warning"
        message="Message"
        variant="warning"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass("bg-yellow-600");

    rerender(
      <ConfirmDialog
        isOpen={true}
        title="Info"
        message="Message"
        variant="info"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass("bg-cyan-600");
  });
});
