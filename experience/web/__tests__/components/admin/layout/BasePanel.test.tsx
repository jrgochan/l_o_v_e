
import { render, screen, fireEvent } from "@testing-library/react";
import { BasePanel, PanelSection } from "@/components/admin/layout/BasePanel";

describe("BasePanel", () => {
  it("renders children, title and subtitle", () => {
    render(
      <BasePanel title="My Panel" subtitle="Subtitle">
        <div>Content</div>
      </BasePanel>
    );
    expect(screen.getByText("My Panel")).toBeInTheDocument();
    expect(screen.getByText("Subtitle")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders actions in header", () => {
    render(
      <BasePanel actions={<button>Action</button>}>
        <div>Content</div>
      </BasePanel>
    );
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(
      <BasePanel footer={<div>Footer</div>}>
        <div>Content</div>
      </BasePanel>
    );
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    const { container } = render(
      <BasePanel variant="primary">
        <div>Content</div>
      </BasePanel>
    );
    // Primary variant has specific classes like bg-cyan-900/30
    expect(container.firstChild).toHaveClass("bg-cyan-900/30");
  });
});

describe("PanelSection", () => {
  it("renders children and title", () => {
    render(
      <PanelSection title="Section 1">
        <div>Content</div>
      </PanelSection>
    );
    expect(screen.getByText("Section 1")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("is open by default", () => {
    render(
      <PanelSection defaultOpen={true}>
        <div>Content</div>
      </PanelSection>
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("toggles content when collapsible", () => {
    render(
      <PanelSection title="Toggle Me" collapsible={true} defaultOpen={false}>
        <div>Hidden Content</div>
      </PanelSection>
    );

    // Initially closed
    expect(screen.queryByText("Hidden Content")).not.toBeInTheDocument();

    // Click toggle button (it's the button with arrow)
    // Or we can find button by role
    const toggleBtn = screen.getByRole("button");
    fireEvent.click(toggleBtn);

    expect(screen.getByText("Hidden Content")).toBeInTheDocument();

    // Click again
    fireEvent.click(toggleBtn);
    expect(screen.queryByText("Hidden Content")).not.toBeInTheDocument();
  });

  it("renders content regardless of open state if not collapsible", () => {
    // Even if we pass defaultOpen={false}, if collapsible is false (default), it should show
    render(
      <PanelSection defaultOpen={false} collapsible={false}>
        <div>Always Visible</div>
      </PanelSection>
    );
    expect(screen.getByText("Always Visible")).toBeInTheDocument();
  });
});
