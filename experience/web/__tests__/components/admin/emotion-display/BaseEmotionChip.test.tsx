import { render, screen, fireEvent } from "@testing-library/react";
import { BaseEmotionChip } from "@/components/admin/emotion-display/BaseEmotionChip";
import { CATEGORY_COLORS } from "@/types/atlas-admin";

describe("BaseEmotionChip", () => {
  const defaultProps = {
    emotion: "Joy",
    category: "When Life Is Good", // Valid category
  };

  it("renders emotion name correctly", () => {
    render(<BaseEmotionChip {...defaultProps} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
  });

  it("applies correct category color", () => {
    const { container } = render(<BaseEmotionChip {...defaultProps} />);
    const chip = container.firstChild as HTMLElement;
    // #FFFF44 -> rgb(255, 255, 68)
    expect(chip.style.borderColor).toBe("rgb(255, 255, 68)");
  });

  it("uses custom color if provided", () => {
    const { container } = render(<BaseEmotionChip {...defaultProps} color="#123456" />);
    const chip = container.firstChild as HTMLElement;
    // #123456 -> rgb(18, 52, 86)
    expect(chip.style.borderColor).toBe("rgb(18, 52, 86)");
  });

  it("renders category label when showCategory is true", () => {
    render(<BaseEmotionChip {...defaultProps} showCategory={true} />);
    expect(screen.getByText("When Life Is Good", { selector: "span.text-xs" })).toBeInTheDocument();
  });

  it("renders confidence percentage", () => {
    render(<BaseEmotionChip {...defaultProps} confidence={0.88} />);
    expect(screen.getByText("88%")).toBeInTheDocument();
  });

  it("renders bridge indicator for specific emotions", () => {
    render(<BaseEmotionChip {...defaultProps} emotion="Awe" showBridge={true} />);
    expect(screen.getByText("★")).toBeInTheDocument();
  });

  it("does not render bridge indicator for non-bridge emotions", () => {
    render(<BaseEmotionChip {...defaultProps} emotion="Sadness" showBridge={true} />);
    expect(screen.queryByText("★")).not.toBeInTheDocument();
  });

  it("uses fallback color when no category or color provided", () => {
    const { container } = render(<BaseEmotionChip emotion="Unknown" />);
    const chip = container.firstChild as HTMLElement;
    // #888888 -> rgb(136, 136, 136)
    expect(chip.style.borderColor).toBe("rgb(136, 136, 136)");
  });

  it("handles click events", () => {
    const onClick = jest.fn();
    render(<BaseEmotionChip {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByText("Joy"));
    expect(onClick).toHaveBeenCalled();
  });

  it("applies size classes", () => {
    const { container, rerender } = render(<BaseEmotionChip {...defaultProps} size="sm" />);
    expect(container.firstChild).toHaveClass("px-2 py-1 text-xs");

    rerender(<BaseEmotionChip {...defaultProps} size="lg" />);
    expect(container.firstChild).toHaveClass("px-4 py-2 text-base");
  });

  it("handles interaction styles when onClick is present", () => {
    const { container } = render(<BaseEmotionChip {...defaultProps} onClick={() => {}} />);
    expect(container.firstChild).toHaveClass("cursor-pointer hover:brightness-110 active:scale-95");
  });

  it("does not have interaction styles when onClick is undefined", () => {
    const { container } = render(<BaseEmotionChip {...defaultProps} />);
    expect(container.firstChild).not.toHaveClass("cursor-pointer");
  });
});
