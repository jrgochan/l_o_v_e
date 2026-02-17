import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConceptTooltip } from "@/components/ConceptTooltip";
import { GLOSSARY } from "@/data/educationalData";

// Mock the GLOSSARY data to ensure tests are stable
jest.mock("@/data/educationalData", () => ({
  GLOSSARY: {
    TEST_TERM: {
      title: "Test Term",
      definition: "This is a test definition.",
      icon: "🧪",
    },
    NO_ICON_TERM: {
      title: "No Icon Term",
      definition: "Definition without icon.",
    },
  },
}));

describe("ConceptTooltip", () => {
  it("renders children when provided", () => {
    render(
      <ConceptTooltip termKey="TEST_TERM" className="test-class">
        <span>Custom Child</span>
      </ConceptTooltip>
    );

    expect(screen.getByText("Custom Child")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("renders default title when children are missing", () => {
    render(<ConceptTooltip termKey="TEST_TERM" />);
    expect(screen.getByText("Test Term")).toBeInTheDocument();
  });

  it("renders nothing but children if termKey is invalid", () => {
    render(
      <ConceptTooltip termKey="INVALID_KEY">
        <span>Fallback Content</span>
      </ConceptTooltip>
    );

    expect(screen.getByText("Fallback Content")).toBeInTheDocument();
    // Should not render the question mark or become interactive (implementation detail check)
    // The component implementation returns <>{children}</> immediately if !data
    expect(screen.queryByText("?")).not.toBeInTheDocument();
  });

  it("shows tooltip on mouse enter and hides on mouse leave", async () => {
    render(<ConceptTooltip termKey="TEST_TERM">Hover Me</ConceptTooltip>);

    const trigger = screen.getByText("Hover Me").closest("span") as HTMLElement; // The outer span

    // Initial state: hidden
    expect(screen.queryByText("This is a test definition.")).not.toBeInTheDocument();

    // Mouse Enter
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText("This is a test definition.")).toBeInTheDocument();
    expect(screen.getByText("Test Term")).toBeInTheDocument();
    expect(screen.getByText("🧪")).toBeInTheDocument();

    // Mouse Leave
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText("This is a test definition.")).not.toBeInTheDocument();
  });

  it("toggles tooltip on click", () => {
    render(<ConceptTooltip termKey="TEST_TERM">Click Me</ConceptTooltip>);
    const trigger = screen.getByText("Click Me").closest("span") as HTMLElement;

    // Click to show
    fireEvent.click(trigger);
    expect(screen.getByText("This is a test definition.")).toBeInTheDocument();

    // Click to hide
    fireEvent.click(trigger);
    expect(screen.queryByText("This is a test definition.")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ConceptTooltip termKey="TEST_TERM" className="custom-tailwind-class" />
    );
    // The outer span should have the class
    expect(container.firstChild).toHaveClass("custom-tailwind-class");
  });

  it("renders gracefully without icon", () => {
    render(<ConceptTooltip termKey="NO_ICON_TERM">No Icon</ConceptTooltip>);
    const trigger = screen.getByText("No Icon").closest("span") as HTMLElement;
    fireEvent.mouseEnter(trigger);

    expect(screen.getByText("Definition without icon.")).toBeInTheDocument();
    // Icon part might be empty or just not rendered?
    // Implementation: <span className="text-lg">{data.icon}</span>
    // If icon is undefined, it renders empty? React renders undefined as nothing.
    // We can check that title is still there
    expect(screen.getByText("No Icon Term")).toBeInTheDocument();
  });
});
