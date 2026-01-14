
import { render, screen, fireEvent } from "@testing-library/react";
import { BaseModal, ConfirmModal } from "@/components/admin/layout/BaseModal";

describe("BaseModal", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when not isOpen", () => {
    render(
      <BaseModal isOpen={false} onClose={onClose}>
        <div>Content</div>
      </BaseModal>
    );
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders children when isOpen", () => {
    render(
      <BaseModal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </BaseModal>
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders title if provided", () => {
    render(
      <BaseModal isOpen={true} onClose={onClose} title="My Modal">
        <div>Content</div>
      </BaseModal>
    );
    expect(screen.getByText("My Modal")).toBeInTheDocument();
  });

  it("closes on backdrop click", () => {
    // We need to target the backdrop specifically.
    // It's the div with onClick.
    // render returns container.
    const { container } = render(
      <BaseModal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </BaseModal>
    );

    // The backdrop is the first .absolute.inset-0 div (rendering order) or we can look for specific classes.
    // The inner modal has e.stopPropagation. 
    // We can simulate click on the backdrop div.
    // It has `bg-black/70` in classes.
    // Or we can rely on testing-library queries if we can find it.
    // Let's assume standard DOM structure or use data-testids if we modified code.
    // Without modification: it's an element with onClick={closeOnBackdrop ? onClose : undefined}

    // Let's assume it's the wrapper div's first child.
    // The wrapper is fixed inset-0 flex. Its first child is backdrop.
    const backdrop = container.firstChild?.firstChild;
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close on backdrop if closeOnBackdrop is false", () => {
    const { container } = render(
      <BaseModal isOpen={true} onClose={onClose} closeOnBackdrop={false}>
        <div>Content</div>
      </BaseModal>
    );
    const backdrop = container.firstChild?.firstChild;
    fireEvent.click(backdrop as Element);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on escape key", () => {
    render(
      <BaseModal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </BaseModal>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on close button click", () => {
    render(
      <BaseModal isOpen={true} onClose={onClose} showCloseButton={true}>
        <div>Content</div>
      </BaseModal>
    );
    const closeBtn = screen.getByTitle("Close (Esc)");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("applies body overflow hidden when open", () => {
    const { unmount } = render(
      <BaseModal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </BaseModal>
    );
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });
});

describe("ConfirmModal", () => {
  const onClose = jest.fn();
  const onConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders title, message and buttons", () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        message="Are you sure?"
      />
    );

    expect(screen.getByText("Confirm Action")).toBeInTheDocument(); // Default title
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onConfirm and onClose on confirm click", () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        message="Msg"
      />
    );
    fireEvent.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on cancel click", () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        message="Msg"
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
