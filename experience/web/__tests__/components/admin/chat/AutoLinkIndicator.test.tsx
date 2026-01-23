import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AutoLinkIndicator } from "@/components/admin/chat/AutoLinkIndicator";
import { MessageRelationship } from "@/types/chat";

describe("AutoLinkIndicator", () => {
  const mockRelationships: MessageRelationship[] = [
    {
      id: "rel-1",
      source_message_id: "msg-1",
      target_message_id: "msg-2",
      relationship_type: "reply",
      metadata: { score: 0.85 },
      created_at: new Date().toISOString(),
    },
    {
      id: "rel-2",
      source_message_id: "msg-1",
      target_message_id: "msg-3",
      relationship_type: "precipitated_by",
      metadata: { score: 0.92 },
      created_at: new Date().toISOString(),
    },
  ];

  const mockOnRelationshipClick = jest.fn();

  it("renders correct number of indicators", () => {
    render(
      <AutoLinkIndicator
        relationships={mockRelationships}
        onRelationshipClick={mockOnRelationshipClick}
      />
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("displays relationship type correctly", () => {
    render(
      <AutoLinkIndicator
        relationships={mockRelationships}
        onRelationshipClick={mockOnRelationshipClick}
      />
    );

    const firstButton = screen.getAllByRole("button")[0];
    expect(firstButton).toHaveAttribute("title", "Linked via reply");
  });

  it("displays score percentage correctly", () => {
    render(
      <AutoLinkIndicator
        relationships={mockRelationships}
        onRelationshipClick={mockOnRelationshipClick}
      />
    );

    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("calls onClick handler with correct relationship", () => {
    render(
      <AutoLinkIndicator
        relationships={mockRelationships}
        onRelationshipClick={mockOnRelationshipClick}
      />
    );

    const firstButton = screen.getAllByRole("button")[0];
    fireEvent.click(firstButton);

    expect(mockOnRelationshipClick).toHaveBeenCalledWith(mockRelationships[0]);
  });
  it("renders nothing when relationships are empty", () => {
    const { container } = render(
      <AutoLinkIndicator relationships={[]} onRelationshipClick={mockOnRelationshipClick} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when relationships are undefined", () => {
    const { container } = render(
      <AutoLinkIndicator
        relationships={undefined as any}
        onRelationshipClick={mockOnRelationshipClick}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
