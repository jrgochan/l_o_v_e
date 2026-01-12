import { render, screen, fireEvent } from "@testing-library/react";
import { CommandPalette } from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useCommandPaletteFilter } from "@/hooks/command-palette/useCommandPaletteFilter";

// Fix cmdk mock
jest.mock("cmdk", () => {
  // Attach static properties
  const Input = ({ onValueChange, onChange, ...props }: any) => {
    return (
      <input
        data-testid="command-input"
        {...props}
        onChange={(e) => {
          if (onValueChange) onValueChange(e.target.value);
          if (onChange) onChange(e);
        }}
      />
    );
  };

  const List = ({ children }: any) => <div>{children}</div>;

  // Main component
  const Command = ({ children, onKeyDown }: any) => (
    <div data-testid="command-root" onKeyDown={onKeyDown}>
      {children}
    </div>
  );

  // Assign statics
  Command.Input = Input;
  Command.List = List;

  return { Command };
});

jest.mock("@/hooks/useCommandPalette");
jest.mock("@/hooks/command-palette/useCommandPaletteFilter");
jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: jest.fn(() => []),
}));
jest.mock("@/stores/useExperienceStore", () => ({
  useExperienceStore: jest.fn(() => null),
}));
jest.mock("@/components/command-palette/ActiveJourneyStatus", () => ({
  ActiveJourneyStatus: () => <div>Status</div>,
}));
jest.mock("@/components/command-palette/PaletteResults", () => ({
  PaletteResults: () => <div>Results</div>,
}));
jest.mock("@/components/command-palette/PaletteHelp", () => ({
  PaletteHelp: () => <div>Help</div>,
}));

describe("CommandPalette", () => {
  const mockToggle = jest.fn();
  const mockClose = jest.fn();
  const mockOpen = jest.fn();
  const mockSetSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCommandPalette as jest.Mock).mockReturnValue({
      isOpen: true,
      search: "",
      toggle: mockToggle,
      close: mockClose,
      open: mockOpen,
      setSearch: mockSetSearch,
      currentPage: "home",
    });

    (useCommandPaletteFilter as jest.Mock).mockReturnValue({
      filteredEmotions: [],
      filteredPaths: [],
      recentEmotionsList: [],
      favoriteEmotionsList: [],
      emotionsByCategory: {},
    });
  });

  it("should render when open", () => {
    render(<CommandPalette />);
    expect(screen.getByTestId("command-root")).toBeInTheDocument();
  });

  it("should attach global window handlers", () => {
    render(<CommandPalette />);
    expect(window.openCommandPalette).toBeDefined();
    window.openCommandPalette!();
    expect(mockOpen).toHaveBeenCalled();
  });

  it("should handle keyboard shortcuts (Meta+K)", () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(mockToggle).toHaveBeenCalled();
  });

  it("should close on Escape", () => {
    render(<CommandPalette />);
    const root = screen.getByTestId("command-root");
    fireEvent.keyDown(root, { key: "Escape" });
    expect(mockClose).toHaveBeenCalled();
  });

  // TODO: Fix mock interaction with onValueChange
  it.skip("should update search input", () => {
    render(<CommandPalette />);
    const input = screen.getByTestId("command-input");
    fireEvent.change(input, { target: { value: "joy" } });
    expect(mockSetSearch).toHaveBeenCalledWith("joy");
  });
});
