import { render, fireEvent } from "@testing-library/react";
import { CategoryBrowser } from "../../../../../components/admin/panels/ControlPanel/CategoryBrowser";
import { Emotion, CategoryFilter } from "@/types/visualization";

// Use a mock setup for theme
const mockUseAdminTheme = jest.fn();
jest.mock("@/hooks/admin/useAdminTheme", () => ({
  useAdminTheme: () => mockUseAdminTheme(),
}));

describe("CategoryBrowser", () => {
  const mockFilters = new Map<string, CategoryFilter>([
    ["Cat1", { name: "Cat1", enabled: true, color: "#E11D48", emotionCount: 2 }],
  ]);

  const mockEmotions = new Map<string, Emotion[]>([
    [
      "Cat1",
      [
        {
          id: "e1",
          name: "Joy",
          category: "Cat1",
          definition: "D1",
          vac: [0, 0, 0],
          quaternion: [0, 0, 0, 1],
        },
        {
          id: "e2",
          name: "Awe",
          category: "Cat1",
          definition: "D2",
          vac: [0, 0, 0],
          quaternion: [0, 0, 0, 1],
        }, // Awe is a bridge emotion
      ],
    ],
  ]);

  const defaultProps = {
    categoryFilters: mockFilters,
    emotionsByCategory: mockEmotions,
    expandedCategories: new Set<string>(),
    selectedIds: new Set<string>(),
    onToggleCategoryExpansion: jest.fn(),
    onToggleCategory: jest.fn(),
    onToggleEmotion: jest.fn(),
    getCategorySelectionState: jest.fn(() => "none" as const),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminTheme.mockReturnValue({
      colors: {
        text: {
          muted: "text-gray-500",
          secondary: "text-gray-400",
          primary: "text-white",
        },
        border: "border-gray-700",
        secondary: "bg-gray-700",
        primary: "bg-blue-600",
      },
      layout: { borderRadius: "rounded-lg" },
      typography: { fontFamily: "font-sans" },
    });
  });

  it("should render categories", () => {
    const { getByText } = render(<CategoryBrowser {...defaultProps} />);
    expect(getByText("Cat1")).toBeInTheDocument();
    expect(getByText("(2)")).toBeInTheDocument();
  });

  it("should handle expansion toggle", () => {
    const onToggleExp = jest.fn();
    const { getByText } = render(
      <CategoryBrowser {...defaultProps} onToggleCategoryExpansion={onToggleExp} />
    );
    fireEvent.click(getByText("Cat1"));
    expect(onToggleExp).toHaveBeenCalledWith("Cat1");

    // Click arrow
    fireEvent.click(getByText("▶"));
    expect(onToggleExp).toHaveBeenCalledTimes(2);
  });

  it("should render emotions when expanded", () => {
    const expanded = new Set(["Cat1"]);
    const { getByText } = render(
      <CategoryBrowser {...defaultProps} expandedCategories={expanded} />
    );
    expect(getByText("Joy")).toBeInTheDocument();
    expect(getByText("Awe")).toBeInTheDocument();
  });

  it("should show bridge indicator", () => {
    const expanded = new Set(["Cat1"]);
    const { getByText } = render(
      <CategoryBrowser {...defaultProps} expandedCategories={expanded} />
    );
    // Awe is a bridge emotion, should have star
    expect(getByText("★")).toBeInTheDocument();
  });

  it("should handle category toggle interaction", () => {
    const onToggleCat = jest.fn();
    const { getAllByRole } = render(
      <CategoryBrowser {...defaultProps} onToggleCategory={onToggleCat} />
    );
    // Find the add button. It has text "+ Add" when selection state is none.
    // Or we can find by title.
    const buttons = getAllByRole("button");
    // Expand btn, Name btn, Add btn. Add btn is last in header.
    // Let's use getByText for button content
    // "+ Add" or "✓ All" or "◐ Some"
    // Since getCategorySelectionState mock returns "none", it should be "+ Add"
  });

  it("should display correct selection state on category button", () => {
    const { getByText, rerender } = render(
      <CategoryBrowser {...defaultProps} getCategorySelectionState={() => "none"} />
    );
    expect(getByText("+ Add")).toBeInTheDocument();

    rerender(<CategoryBrowser {...defaultProps} getCategorySelectionState={() => "all"} />);
    expect(getByText("✓ All")).toBeInTheDocument();

    rerender(<CategoryBrowser {...defaultProps} getCategorySelectionState={() => "some"} />);
    expect(getByText("◐ Some")).toBeInTheDocument();
  });

  it("should call onToggleCategory", () => {
    const onToggleCat = jest.fn();
    const { getByText } = render(
      <CategoryBrowser {...defaultProps} onToggleCategory={onToggleCat} />
    );
    fireEvent.click(getByText("+ Add"));
    expect(onToggleCat).toHaveBeenCalledWith("Cat1");
  });

  it("should handle emotion toggle", () => {
    const onToggleEm = jest.fn();
    const expanded = new Set(["Cat1"]);
    const { getByText } = render(
      <CategoryBrowser
        {...defaultProps}
        expandedCategories={expanded}
        onToggleEmotion={onToggleEm}
      />
    );
    fireEvent.click(getByText("Joy"));
    expect(onToggleEm).toHaveBeenCalledWith("e1");
  });

  it("should show selected state for emotion", () => {
    const expanded = new Set(["Cat1"]);
    const selected = new Set(["e1"]);
    const { getByText } = render(
      <CategoryBrowser {...defaultProps} expandedCategories={expanded} selectedIds={selected} />
    );
    // Selected emotion Joy should have checkmark
    // The checkmark is "✓" in a span.
    // Unselected is "○".
    // We can verify class or text content near Joy.
    const joyBtn = getByText("Joy").closest("button");
    expect(joyBtn).toHaveClass("bg-blue-600");
  });

  it("should handle empty category map", () => {
    // Modify filters to include a category not in emotions map
    const filters = new Map(mockFilters);
    filters.set("Cat2", { name: "Cat2", enabled: true, color: "#00FF00", emotionCount: 0 });

    const { getByText } = render(<CategoryBrowser {...defaultProps} categoryFilters={filters} />);
    expect(getByText("Cat2")).toBeInTheDocument();
  });

  it("applies monospace font when theme is font-mono", () => {
    mockUseAdminTheme.mockReturnValue({
      colors: {
        text: {
          muted: "text-gray-500",
          secondary: "text-gray-400",
          primary: "text-white",
        },
        border: "border-gray-700",
        secondary: "bg-gray-700",
        primary: "bg-blue-600",
      },
      layout: { borderRadius: "rounded-lg" },
      typography: { fontFamily: "font-mono" },
    });

    const expanded = new Set(["Cat1"]);
    const { getByText } = render(
      <CategoryBrowser {...defaultProps} expandedCategories={expanded} />
    );

    // 1. Verify Category Name Button
    const categoryButton = getByText("Cat1");
    expect(categoryButton).toHaveStyle({ fontFamily: "monospace" });

    // 2. Verify Emotion Button (e.g. Joy)
    // Joy is in emotions map for Cat1
    const emotionButton = getByText("Joy").closest("button");
    expect(emotionButton).toHaveStyle({ fontFamily: "monospace" });
  });
});
