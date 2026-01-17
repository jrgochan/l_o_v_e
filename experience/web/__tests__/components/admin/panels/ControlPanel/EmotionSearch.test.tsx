import { render, fireEvent } from "@testing-library/react";
import { EmotionSearch } from "../../../../../components/admin/panels/ControlPanel/EmotionSearch";
import { AtlasEmotion } from "@/types/atlas-admin";

const mockUseAdminTheme = jest.fn();
jest.mock("@/hooks/admin/useAdminTheme", () => ({
  useAdminTheme: () => mockUseAdminTheme(),
}));

describe("EmotionSearch", () => {
  const mockEmotions: AtlasEmotion[] = [
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
    }, // Bridge emotion
  ];

  const defaultProps = {
    searchQuery: "",
    onSearchChange: jest.fn(),
    filteredEmotions: mockEmotions,
    selectedIds: new Set<string>(),
    onToggleEmotion: jest.fn(),
    showResults: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminTheme.mockReturnValue({
      colors: {
        background: "bg-black",
        border: "border-gray-700",
        text: { secondary: "text-gray-400", primary: "text-white", muted: "text-gray-500" },
        primary: "text-blue-600",
      },
      effects: { glass: "backdrop-blur-md" },
      layout: { borderRadius: "rounded-lg" },
      typography: { fontFamily: "font-sans" },
    });
  });

  it("should render search input", () => {
    const { getByPlaceholderText } = render(<EmotionSearch {...defaultProps} />);
    expect(getByPlaceholderText("Search emotions...")).toBeInTheDocument();
  });

  it("should call onSearchChange", () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <EmotionSearch {...defaultProps} onSearchChange={onChange} />
    );
    fireEvent.change(getByPlaceholderText("Search emotions..."), { target: { value: "test" } });
    expect(onChange).toHaveBeenCalledWith("test");
  });

  it("should show clear button when there is a query", () => {
    const onChange = jest.fn();
    const { getByTitle, rerender, queryByTitle } = render(
      <EmotionSearch {...defaultProps} searchQuery="" onSearchChange={onChange} />
    );
    expect(queryByTitle("Clear search")).not.toBeInTheDocument();

    rerender(<EmotionSearch {...defaultProps} searchQuery="test" onSearchChange={onChange} />);
    const clearBtn = getByTitle("Clear search");
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("should render filtered emotions", () => {
    const { getByText } = render(<EmotionSearch {...defaultProps} />);
    expect(getByText("Joy")).toBeInTheDocument();
    expect(getByText("Awe")).toBeInTheDocument();
    expect(getByText("2")).toBeInTheDocument(); // Count
  });

  it("should render no results message", () => {
    const { getByText } = render(
      <EmotionSearch {...defaultProps} filteredEmotions={[]} searchQuery="xyz" />
    );
    expect(getByText(/No emotions found/)).toBeInTheDocument();
  });

  it("should handle selection toggle", () => {
    const onToggle = jest.fn();
    const { getByText } = render(<EmotionSearch {...defaultProps} onToggleEmotion={onToggle} />);
    fireEvent.click(getByText("Joy"));
    expect(onToggle).toHaveBeenCalledWith("e1");
  });

  it("should show selection state and handle unselection", () => {
    const onToggle = jest.fn();
    const selected = new Set(["e1"]);
    const { getByText } = render(
      <EmotionSearch {...defaultProps} selectedIds={selected} onToggleEmotion={onToggle} />
    );
    expect(getByText("SELECTED")).toBeInTheDocument();
    // Joy should have specific class
    const joyBtn = getByText("Joy").closest("button");
    expect(joyBtn).toHaveClass("text-blue-600");

    // Click to unselect (execution path for isSelected=true)
    fireEvent.click(getByText("Joy"));
    expect(onToggle).toHaveBeenCalledWith("e1");
  });

  it("should show selection state", () => {
    const selected = new Set(["e1"]);
    const { getByText } = render(<EmotionSearch {...defaultProps} selectedIds={selected} />);
    expect(getByText("SELECTED")).toBeInTheDocument();
    // Joy should have specific class
    const joyBtn = getByText("Joy").closest("button");
    expect(joyBtn).toHaveClass("text-blue-600");
  });

  it("should highlight bridge emotions", () => {
    const { getByText } = render(<EmotionSearch {...defaultProps} />);
    // Awe is bridge, should have star or Bridge Emotion text
    expect(getByText("★")).toBeInTheDocument(); // Or title "Bridge Emotion"
  });

  it("should use default showResults=true", () => {
    // Render without showResults prop
    const { getByText } = render(
      <EmotionSearch
        searchQuery={defaultProps.searchQuery}
        onSearchChange={defaultProps.onSearchChange}
        filteredEmotions={defaultProps.filteredEmotions}
        selectedIds={defaultProps.selectedIds}
        onToggleEmotion={defaultProps.onToggleEmotion}
      />
    );
    expect(getByText("Results")).toBeInTheDocument();
  });

  it("should hide results if showResults is false", () => {
    const { queryByText } = render(<EmotionSearch {...defaultProps} showResults={false} />);
    expect(queryByText("Results")).not.toBeInTheDocument();
    expect(queryByText("Joy")).not.toBeInTheDocument();
  });

  it("applies monospace font when theme is font-mono", () => {
    mockUseAdminTheme.mockReturnValue({
      colors: {
        background: "bg-black",
        border: "border-gray-700",
        text: { secondary: "text-gray-400", primary: "text-white", muted: "text-gray-500" },
        primary: "text-blue-600",
      },
      effects: { glass: "backdrop-blur-md" },
      layout: { borderRadius: "rounded-lg" },
      typography: { fontFamily: "font-mono" },
    });

    const { getByPlaceholderText } = render(<EmotionSearch {...defaultProps} />);

    // Input should have mono style
    const input = getByPlaceholderText("Search emotions...");
    expect(input).toHaveStyle({ fontFamily: "monospace" });
  });
});
